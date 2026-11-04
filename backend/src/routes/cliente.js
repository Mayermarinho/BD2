// Conta opcional do cliente: cadastro, "meus agendamentos" e cancelamento sem digitar telefone.
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { assinarTokenCliente, exigirLogin } from '../auth.js';
import { dataValida, horaValida, normalizarTelefone } from '../datas.js';
import { horariosParaRemarcar, remarcarAgendamento } from '../remarcar.js';

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
    const ok = await repo.transacao(async (tx) => {
      const cancelado = await tx.cancelarDoCliente({ id, idCliente: req.usuario.id_cliente, motivo });
      if (cancelado) {
        const agendamento = await tx.obterAgendamentoParaRemarcar(id);
        if (agendamento) await tx.registrarEventoSheets?.({ id_profissional: agendamento.id_profissional, id_agendamento: id });
      }
      return cancelado;
    });
    if (!ok) return res.status(404).json({ erro: 'Agendamento não encontrado ou não pode mais ser cancelado.' });
    res.json({ ok: true });
  });

  // ===== Remarcar (só o horário; o serviço continua o mesmo) =====
  const idDe = (req) => Number.parseInt(req.params.id, 10);
  const minha = (req) => (a) => a.id_cliente === req.usuario.id_cliente;

  // Horários livres para remarcar (o horário atual do próprio agendamento não conta como ocupado)
  logado.get('/agendamentos/:id/disponibilidade', async (req, res) => {
    const { data } = req.query;
    if (!Number.isInteger(idDe(req)) || !dataValida(data)) return res.status(400).json({ erro: 'Informe "data" (AAAA-MM-DD).' });
    const a = await repo.obterAgendamentoParaRemarcar(idDe(req));
    if (!a || !minha(req)(a)) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    const r2 = await horariosParaRemarcar(repo, config, a, data);
    res.status(r2.status).json(r2.corpo);
  });

  logado.post('/agendamentos/:id/remarcar', async (req, res) => {
    const { data, hora_inicio } = req.body ?? {};
    const erros = [];
    if (!Number.isInteger(idDe(req))) erros.push('agendamento inválido');
    if (!dataValida(data)) erros.push('data inválida (AAAA-MM-DD)');
    if (!horaValida(hora_inicio)) erros.push('hora_inicio inválida (HH:MM)');
    if (erros.length) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });
    const r2 = await remarcarAgendamento(repo, config, {
      id: idDe(req), pertence: minha(req), data, hora_inicio,
      // Se a profissional exige confirmação (STATUS_INICIAL=PENDENTE), o novo horário volta a aguardar confirmação.
      statusNovo: (a) => (config.statusInicial === 'PENDENTE' ? 'PENDENTE' : a.status),
    });
    res.status(r2.status).json(r2.corpo);
  });

  r.use('/cliente', logado);
  return r;
}
