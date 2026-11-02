// Conta opcional do cliente: cadastro, "meus agendamentos" e cancelamento sem digitar telefone.
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { assinarTokenCliente, exigirLogin } from '../auth.js';
import { agoraNoFuso, dataValida, horaValida, normalizarTelefone } from '../datas.js';
import { buscarHorariosLivres } from '../disponibilidade.js';
import { paraMinutos, somarMinutos } from '../slots.js';

export function rotasCliente(repo, config) {
  const r = Router();
  const limite = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

  r.post('/clientes/cadastro', limite, async (req, res) => {
    const nome = String(req.body?.nome ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const telefone = normalizarTelefone(req.body?.telefone);
    const senha = String(req.body?.senha ?? '');

    const erros = [];
    if (nome.length < 2 || nome.length > 100) erros.push('nome obrigatório (2 a 100 caracteres)');
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 100) erros.push('e-mail inválido');
    if (telefone.length < 10 || telefone.length > 13) erros.push('telefone inválido (com DDD)');
    if (senha.length < 8 || senha.length > 72) erros.push('a senha deve ter de 8 a 72 caracteres');
    if (erros.length) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });

    if (await repo.buscarContaPorEmail(email)) return res.status(409).json({ erro: 'Já existe uma conta com este e-mail. Entre com a sua senha.' });
    const senha_hash = await bcrypt.hash(senha, 10);
    const conta = await repo.transacao((tx) => tx.criarConta({ nome, telefone, email, senha_hash }));
    res.status(201).json({
      token: assinarTokenCliente(conta, config.jwtSecret),
      usuario: { nome, email, telefone, perfil: 'CLIENTE', tipo: 'cliente' },
    });
  });

  const logado = Router();
  logado.use(exigirLogin(config.jwtSecret, 'cliente'));

  logado.get('/perfil', async (req, res) => {
    const perfil = await repo.obterPerfilCliente(req.usuario.id_cliente);
    if (!perfil) return res.status(404).json({ erro: 'Conta não encontrada.' });
    res.json(perfil);
  });

  logado.get('/agendamentos', async (req, res) => res.json(await repo.agendamentosDoCliente(req.usuario.id_cliente)));

  logado.post('/agendamentos/:id/cancelar', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ erro: 'Agendamento inválido.' });
    const motivo = String(req.body?.motivo ?? '').slice(0, 255) || 'Cancelado pelo cliente';
    const ok = await repo.cancelarDoCliente({ id, idCliente: req.usuario.id_cliente, motivo });
    if (!ok) return res.status(404).json({ erro: 'Agendamento não encontrado ou não pode mais ser cancelado.' });
    res.json({ ok: true });
  });

  // ===== Remarcar (só o horário; o serviço continua o mesmo) =====
  const ATIVOS = ['PENDENTE', 'CONFIRMADO'];
  const jaComecou = (a, agora) => a.data_agendamento < agora.data
    || (a.data_agendamento === agora.data && paraMinutos(a.hora_inicio) <= agora.minutos);
  const idDe = (req) => Number.parseInt(req.params.id, 10);

  // Horários livres para remarcar (o horário atual do próprio agendamento não conta como ocupado)
  logado.get('/agendamentos/:id/disponibilidade', async (req, res) => {
    const id = idDe(req);
    const { data } = req.query;
    if (!Number.isInteger(id) || !dataValida(data)) return res.status(400).json({ erro: 'Informe "data" (AAAA-MM-DD).' });
    const a = await repo.obterAgendamentoDoCliente(id, req.usuario.id_cliente);
    if (!a) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    if (!ATIVOS.includes(a.status) || !a.ativo) return res.status(409).json({ erro: 'Este agendamento não pode ser remarcado.' });
    const { horarios, motivoIndisponivel } = await buscarHorariosLivres(repo, a, data, config, a.id_agendamento);
    res.json({ data, agendamento: id, horarios, motivoIndisponivel: motivoIndisponivel ?? null });
  });

  logado.post('/agendamentos/:id/remarcar', async (req, res) => {
    const id = idDe(req);
    const { data, hora_inicio } = req.body ?? {};
    const erros = [];
    if (!Number.isInteger(id)) erros.push('agendamento inválido');
    if (!dataValida(data)) erros.push('data inválida (AAAA-MM-DD)');
    if (!horaValida(hora_inicio)) erros.push('hora_inicio inválida (HH:MM)');
    if (erros.length) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });

    const resultado = await repo.transacao(async (tx) => {
      const antes = await tx.obterAgendamentoDoCliente(id, req.usuario.id_cliente);
      if (!antes) return { status: 404, corpo: { erro: 'Agendamento não encontrado.' } };
      await tx.travarProfissional(antes.id_profissional); // mesma trava da reserva: um pedido por vez

      const a = await tx.obterAgendamentoDoCliente(id, req.usuario.id_cliente); // releitura já com a trava
      if (!ATIVOS.includes(a.status)) return { status: 409, corpo: { erro: 'Este agendamento não pode mais ser remarcado.' } };
      if (!a.ativo) return { status: 409, corpo: { erro: 'Este serviço não está mais disponível. Cancele e fale com a profissional.' } };
      if (jaComecou(a, agoraNoFuso(config.fusoHorario))) return { status: 409, corpo: { erro: 'Este atendimento já começou ou passou e não pode ser remarcado.' } };
      if (a.data_agendamento === data && a.hora_inicio === hora_inicio) {
        return { status: 400, corpo: { erro: 'Escolha um dia ou horário diferente do atual.' } };
      }

      const { horarios } = await buscarHorariosLivres(tx, a, data, config, a.id_agendamento);
      if (!horarios.includes(hora_inicio)) return { status: 409, corpo: { erro: 'Este horário não está mais disponível. Escolha outro.' } };

      // Se a profissional exige confirmação (STATUS_INICIAL=PENDENTE), o novo horário volta a aguardar confirmação.
      const atualizado = await tx.remarcarAgendamento({
        id, data, hora_inicio, hora_fim: somarMinutos(hora_inicio, a.duracao_minutos), status: config.statusInicial === 'PENDENTE' ? 'PENDENTE' : a.status,
      });
      return { status: 200, corpo: { ...atualizado, anterior: { data_agendamento: a.data_agendamento, hora_inicio: a.hora_inicio } } };
    });
    res.status(resultado.status).json(resultado.corpo);
  });

  r.use('/cliente', logado);
  return r;
}
