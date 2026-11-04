import { Router } from 'express';
import { dataValida, horaValida, normalizarTelefone } from '../datas.js';
import { buscarHorariosLivres } from '../disponibilidade.js';
import { clienteOpcional } from '../auth.js';
import { somarMinutos } from '../slots.js';

export function rotasPublicas(repo, config) {
  const r = Router();

  // Serviços ativos (com categoria)
  r.get('/servicos', async (_req, res) => {
    res.json(await repo.listarServicos());
  });

  // Horários livres: /api/disponibilidade?servico=1&data=2026-10-06
  r.get('/disponibilidade', async (req, res) => {
    const idServico = Number.parseInt(req.query.servico, 10);
    const { data } = req.query;
    if (!Number.isInteger(idServico) || !dataValida(data)) {
      return res.status(400).json({ erro: 'Informe "servico" (número) e "data" (AAAA-MM-DD).' });
    }
    const servico = await repo.obterServicoAtivo(idServico);
    if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado.' });
    const { horarios, motivoIndisponivel } = await buscarHorariosLivres(repo, servico, data, config);
    res.json({ data, servico: idServico, horarios, motivoIndisponivel: motivoIndisponivel ?? null });
  });

  // Cria agendamento
  // Com token de cliente, o agendamento entra na conta dele (nome e telefone vêm do cadastro).
  r.post('/agendamentos', clienteOpcional(config.jwtSecret), async (req, res) => {
    const { id_servico, data, hora_inicio, cliente: dadosForm = {}, observacao } = req.body ?? {};
    const perfil = req.cliente ? await repo.obterPerfilCliente(req.cliente.id_cliente) : null;
    if (req.cliente && !perfil) return res.status(401).json({ erro: 'Conta não encontrada. Entre novamente.' });
    const cliente = perfil ?? dadosForm;
    const telefone = normalizarTelefone(cliente.telefone);
    const nome = String(cliente.nome ?? '').trim();
    const email = String(cliente.email ?? '').trim() || null;

    const erros = [];
    if (!Number.isInteger(id_servico)) erros.push('id_servico inválido');
    if (!dataValida(data)) erros.push('data inválida (AAAA-MM-DD)');
    if (!horaValida(hora_inicio)) erros.push('hora_inicio inválida (HH:MM)');
    if (nome.length < 2 || nome.length > 100) erros.push('nome obrigatório (2 a 100 caracteres)');
    if (telefone.length < 10 || telefone.length > 13) erros.push('telefone inválido (com DDD)');
    if (email && !/^\S+@\S+\.\S+$/.test(email)) erros.push('e-mail inválido');
    if (erros.length) return res.status(400).json({ erro: 'Dados inválidos.', detalhes: erros });

    const resultado = await repo.transacao(async (tx) => {
      const servico = await tx.obterServicoAtivo(id_servico);
      if (!servico) return { status: 404, corpo: { erro: 'Serviço não encontrado.' } };

      await tx.travarProfissional(servico.id_profissional); // uma reserva por vez para a profissional

      // Confere expediente, bloqueios, passado e ocupação (o trigger do banco ainda é a palavra final)
      const { horarios } = await buscarHorariosLivres(tx, servico, data, config);
      if (!horarios.includes(hora_inicio)) {
        return { status: 409, corpo: { erro: 'Este horário não está mais disponível. Escolha outro.' } };
      }

      const idCliente = perfil ? perfil.id_cliente : await tx.upsertCliente({ nome, telefone, email });
      const agendamento = await tx.inserirAgendamento({
        id_cliente: idCliente,
        id_servico: servico.id_servico,
        id_profissional: servico.id_profissional,
        data,
        hora_inicio,
        hora_fim: somarMinutos(hora_inicio, servico.duracao_minutos),
        preco_cobrado: servico.preco,
        status: config.statusInicial,
        observacao: observacao ? String(observacao).slice(0, 500) : null,
      });
      await tx.registrarEventoSheets?.({ id_profissional: servico.id_profissional, id_agendamento: agendamento.id_agendamento });
      return { status: 201, corpo: agendamento };
    });
    res.status(resultado.status).json(resultado.corpo);
  });

  // Cancelamento pelo cliente (confirma identidade com o telefone)
  r.post('/agendamentos/:id/cancelar', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const telefone = normalizarTelefone(req.body?.telefone);
    const motivo = String(req.body?.motivo ?? '').slice(0, 255) || 'Cancelado pelo cliente';
    if (!Number.isInteger(id) || !telefone) return res.status(400).json({ erro: 'Informe o telefone usado no agendamento.' });

    const ok = await repo.transacao(async (tx) => {
      const cancelado = await tx.cancelarPeloCliente({ id, telefone, motivo });
      if (cancelado) {
        const agendamento = await tx.obterAgendamentoParaRemarcar(id);
        if (agendamento) await tx.registrarEventoSheets?.({ id_profissional: agendamento.id_profissional, id_agendamento: id });
      }
      return cancelado;
    });
    if (!ok) return res.status(404).json({ erro: 'Agendamento não encontrado ou não pode mais ser cancelado.' });
    res.json({ ok: true });
  });

  return r;
}
