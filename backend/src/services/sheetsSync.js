import { criarClienteGoogleSheets } from './googleSheets.js';

export function iniciarSincronizacaoSheets(repo, config) {
  if (config.modoDemo || !config.googleSheetsHabilitado) {
    console.log('Google Sheets: sincronização automática desabilitada (configure as credenciais no ambiente).');
    return () => {};
  }

  const google = criarClienteGoogleSheets(config);
  let executando = false;

  async function processarFila() {
    if (executando) return;
    executando = true;
    try {
      const eventos = await repo.listarEventosSheetsPendentes(20);
      for (const evento of eventos) {
        try {
          const agendamento = await repo.obterAgendamentoParaSheets(evento.id_agendamento, evento.id_profissional);
          if (agendamento) await google.salvarAgendamento(agendamento);
          await repo.marcarEventoSheetsEnviado(evento.id_evento);
        } catch (erro) {
          console.error('Google Sheets: falha no evento ' + evento.id_evento + ':', erro.message);
          await repo.registrarFalhaEventoSheets(evento.id_evento, erro.message.slice(0, 2000));
        }
      }
    } catch (erro) {
      console.error('Google Sheets: não foi possível consultar a fila:', erro.message);
    } finally {
      executando = false;
    }
  }

  void processarFila();
  const intervalo = setInterval(processarFila, config.googleSheetsIntervaloMs);
  intervalo.unref?.();
  console.log('Google Sheets: sincronização automática iniciada.');
  return () => clearInterval(intervalo);
}
