import { useEffect, useState } from 'react';
import { dataCurta, hojeSP, somarDias } from './utils.js';

/** Painel para escolher outro dia/horário do mesmo serviço. */
export default function Remarcar({ a, buscarHorarios, remarcar, onFechar, onRemarcado }) {
  const hoje = hojeSP();
  const [data, setData] = useState('');
  const [horarios, setHorarios] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [hora, setHora] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!data) return undefined;
    let ativo = true;
    setBuscando(true); setHorarios(null); setHora(''); setErro('');
    buscarHorarios(a.id_agendamento, data)
      .then((r) => { if (ativo) { setHorarios(r.horarios); setMotivo(r.motivoIndisponivel || ''); } })
      .catch((e) => { if (ativo) setErro(e.message); })
      .finally(() => { if (ativo) setBuscando(false); });
    return () => { ativo = false; };
  }, [data, a.id_agendamento, buscarHorarios]);

  // O horário que o próprio agendamento já ocupa não é uma opção (não seria uma remarcação)
  const opcoes = (horarios || []).filter((h) => !(data === a.data_agendamento && h === a.hora_inicio));

  async function confirmar() {
    setErro(''); setEnviando(true);
    try {
      const r = await remarcar(a.id_agendamento, data, hora);
      onRemarcado(r);
    } catch (e) { setErro(e.message); setEnviando(false); }
  }

  return (
    <div className="remarcar" role="group" aria-label={`Remarcar ${a.servico}`}>
      <h3 className="subtitulo">Escolha o novo dia e horário</h3>
      <p className="muted">Atual: {dataCurta(a.data_agendamento)} às {a.hora_inicio}. O serviço continua o mesmo ({a.servico}).</p>
      <div className="campo">
        <label htmlFor={`rd-${a.id_agendamento}`}>Nova data</label>
        <input id={`rd-${a.id_agendamento}`} type="date" min={hoje} max={somarDias(hoje, 90)} value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div aria-live="polite">
        {buscando && <p>Buscando horários…</p>}
        {horarios && opcoes.length === 0 && <p className="aviso">Sem horários neste dia{motivo ? ` (${motivo.replace(/\.$/, '')})` : ''}. Tente outra data.</p>}
      </div>
      {opcoes.length > 0 && (
        <fieldset className="grupo">
          <legend>Horários disponíveis</legend>
          <div className="horarios">
            {opcoes.map((h) => (
              <label key={h} className={`horario ${hora === h ? 'horario--marcado' : ''}`}>
                <input type="radio" name={`hora-${a.id_agendamento}`} value={h} checked={hora === h} onChange={() => setHora(h)} />
                {h}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div role="alert" aria-live="assertive">{erro && <p className="erro">{erro}</p>}</div>
      <div className="acoes acoes--linha">
        <button type="button" className="btn btn--primario" disabled={!hora || enviando} onClick={confirmar}>
          {enviando ? 'Remarcando…' : 'Confirmar nova data'}
        </button>
        <button type="button" className="btn" onClick={onFechar}>Fechar</button>
      </div>
    </div>
  );
}
