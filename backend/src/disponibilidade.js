import { agoraNoFuso, diaDaSemana } from './datas.js';
import { calcularHorariosLivres } from './slots.js';

/**
 * Horários livres de um serviço em uma data.
 * `repo` pode ser o repositório normal ou o `tx` dentro de uma transação.
 * `ignorarId`: agendamento a desconsiderar (usado ao remarcar, para o horário atual não bloquear a si mesmo).
 */
export async function buscarHorariosLivres(repo, servico, data, config, ignorarId = null) {
  const agora = agoraNoFuso(config.fusoHorario);
  if (data < agora.data) return { horarios: [], motivoIndisponivel: 'Data no passado.' };

  const bloqueio = await repo.bloqueioNoDia(servico.id_profissional, data);
  if (bloqueio) return { horarios: [], motivoIndisponivel: bloqueio.motivo || 'Dia sem atendimento.' };

  const janelas = await repo.janelasDoDia(servico.id_profissional, diaDaSemana(data));
  if (!janelas.length) return { horarios: [], motivoIndisponivel: 'Sem atendimento neste dia da semana.' };

  const ocupados = await repo.ocupadosDoDia(servico.id_profissional, data, ignorarId);
  const horarios = calcularHorariosLivres({
    janelas,
    ocupados,
    duracao: servico.duracao_minutos,
    passo: config.passoMinutos,
    minimoMinutos: data === agora.data ? agora.minutos + config.antecedenciaMinutos : 0,
  });
  return { horarios };
}
