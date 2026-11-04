// Remarcar um agendamento (só data/hora; o serviço continua o mesmo).
// Usado pela cliente (conta) e pela profissional (painel): as regras de horário são as mesmas da reserva.
import { agoraNoFuso } from './datas.js';
import { buscarHorariosLivres } from './disponibilidade.js';
import { paraMinutos, somarMinutos } from './slots.js';

export const ATIVOS = ['PENDENTE', 'CONFIRMADO'];

const jaComecou = (a, agora) => a.data_agendamento < agora.data
  || (a.data_agendamento === agora.data && paraMinutos(a.hora_inicio) <= agora.minutos);

/** Horários livres para o agendamento `a`; o horário que ele já ocupa não conta como ocupado. */
export async function horariosParaRemarcar(repo, config, a, data) {
  if (!ATIVOS.includes(a.status) || !a.ativo) return { status: 409, corpo: { erro: 'Este agendamento não pode ser remarcado.' } };
  const { horarios, motivoIndisponivel } = await buscarHorariosLivres(repo, a, data, config, a.id_agendamento);
  return { status: 200, corpo: { data, agendamento: a.id_agendamento, horarios, motivoIndisponivel: motivoIndisponivel ?? null } };
}

/**
 * Remarca dentro de uma transação, com a mesma trava da reserva (uma por vez para a profissional).
 * @param {(a: object) => boolean} pertence  quem está pedindo tem direito a este agendamento?
 * @param {(a: object) => string}  statusNovo status depois de remarcar
 */
export async function remarcarAgendamento(repo, config, { id, pertence, data, hora_inicio, statusNovo }) {
  return repo.transacao(async (tx) => {
    const antes = await tx.obterAgendamentoParaRemarcar(id);
    if (!antes || !pertence(antes)) return { status: 404, corpo: { erro: 'Agendamento não encontrado.' } };
    await tx.travarProfissional(antes.id_profissional);

    const a = await tx.obterAgendamentoParaRemarcar(id); // releitura já com a trava
    if (!ATIVOS.includes(a.status)) return { status: 409, corpo: { erro: 'Este agendamento não pode mais ser remarcado.' } };
    if (!a.ativo) return { status: 409, corpo: { erro: 'Este serviço não está mais disponível. Cancele o agendamento e combine outro horário.' } };
    if (jaComecou(a, agoraNoFuso(config.fusoHorario))) return { status: 409, corpo: { erro: 'Este atendimento já começou ou passou e não pode ser remarcado.' } };
    if (a.data_agendamento === data && a.hora_inicio === hora_inicio) {
      return { status: 400, corpo: { erro: 'Escolha um dia ou horário diferente do atual.' } };
    }

    const { horarios } = await buscarHorariosLivres(tx, a, data, config, a.id_agendamento);
    if (!horarios.includes(hora_inicio)) return { status: 409, corpo: { erro: 'Este horário não está mais disponível. Escolha outro.' } };

    const atualizado = await tx.remarcarAgendamento({
      id, data, hora_inicio, hora_fim: somarMinutos(hora_inicio, a.duracao_minutos), status: statusNovo(a),
    });
    await tx.registrarEventoSheets?.({ id_profissional: a.id_profissional, id_agendamento: id });
    return { status: 200, corpo: { ...atualizado, anterior: { data_agendamento: a.data_agendamento, hora_inicio: a.hora_inicio } } };
  });
}
