import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { Mensagens } from '../../components.jsx';
import Remarcar from '../../remarcar.jsx';
import { DIAS_CURTOS, dataCurta, dataExtenso, dataMuitoCurta, diaDaSemana, hojeSP, inicioDaSemana, linkWhatsApp, moeda, somarDias } from '../../utils.js';

const ROTULO = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' };

export default function Agenda() {
  const { sessao, sair } = useAuth();
  const [modo, setModo] = useState('dia');          // 'dia' | 'semana'
  const [data, setData] = useState(hojeSP());
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [cancelando, setCancelando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [remarcando, setRemarcando] = useState(null);
  const [avisarZap, setAvisarZap] = useState(null);   // depois de remarcar: link para avisar a cliente
  const [sheetsStatus, setSheetsStatus] = useState(null);
  const ultima = useRef(0);

  const inicio = modo === 'semana' ? inicioDaSemana(data) : data;
  const fim = modo === 'semana' ? somarDias(inicio, 6) : data;

  const carregar = useCallback(async () => {
    const minha = ++ultima.current; // ignora respostas antigas (troca rápida de dia/semana)
    setErro('');
    try {
      const lista = await api.admin(sessao.token).agenda(inicio, fim);
      if (minha === ultima.current) setItens(lista);
    } catch (e) {
      if (minha !== ultima.current) return;
      if (e.status === 401) { sair(); return; }
      setErro(e.message); setItens([]);
    }
  }, [inicio, fim, sessao.token, sair]);

  useEffect(() => { setItens(null); carregar(); }, [carregar]);

  useEffect(() => {
    let ativo = true;
    api.admin(sessao.token).integracaoSheets()
      .then((status) => { if (ativo) setSheetsStatus(status); })
      .catch(() => { if (ativo) setSheetsStatus(null); });
    return () => { ativo = false; };
  }, [sessao.token]);

  const buscarHorarios = useCallback((id, d) => api.admin(sessao.token).horariosParaRemarcar(id, d), [sessao.token]);
  const remarcarApi = (id, d, hora) => api.admin(sessao.token).remarcar(id, d, hora);

  async function aoRemarcar(a, r) {
    setRemarcando(null); setErro('');
    setAviso(`Agendamento de ${a.cliente} remarcado para ${dataCurta(r.data_agendamento)} às ${r.hora_inicio}.`);
    setAvisarZap({
      nome: a.cliente,
      link: linkWhatsApp(a.telefone_cliente,
        `Olá, ${a.cliente.split(' ')[0]}! Precisei remarcar o seu horário (${a.servico}) para ${dataCurta(r.data_agendamento)} às ${r.hora_inicio}. Tudo bem para você?`),
    });
    await carregar();
  }

  async function mudar(id, status, mot) {
    setErro(''); setAviso(''); setAvisarZap(null);
    try {
      await api.admin(sessao.token).mudarStatus(id, status, mot);
      setAviso(`Agendamento ${ROTULO[status].toLowerCase()}.`);
      setCancelando(null); setMotivo('');
      await carregar();
    } catch (e) { setErro(e.message); }
  }

  const passo = modo === 'semana' ? 7 : 1;
  const ativos = useMemo(() => (itens || []).filter((i) => i.status !== 'CANCELADO'), [itens]);
  const total = ativos.reduce((s, i) => s + Number(i.preco), 0);

  return (
    <section aria-labelledby="t">
      <h1 id="t" className="titulo">Agenda</h1>
      {sheetsStatus && (
        <p className="muted" role="status">
          Google Sheets: {sheetsStatus.habilitada
            ? 'sincronização automática ativa'
            : 'integração ainda não configurada'}
          {sheetsStatus.habilitada && ` · ${sheetsStatus.pendentes} pendente(s)`}
          {sheetsStatus.com_erro > 0 && ` · ${sheetsStatus.com_erro} com erro (nova tentativa automática)`}
        </p>
      )}

      <div className="barra">
        <div className="segmentado" role="group" aria-label="Visualização">
          <button type="button" className={modo === 'dia' ? 'segmentado__on' : ''} aria-pressed={modo === 'dia'} onClick={() => setModo('dia')}>Dia</button>
          <button type="button" className={modo === 'semana' ? 'segmentado__on' : ''} aria-pressed={modo === 'semana'} onClick={() => setModo('semana')}>Semana</button>
        </div>
        <div className="navdia">
          <button type="button" className="btn" onClick={() => setData(somarDias(data, -passo))} aria-label={modo === 'semana' ? 'Semana anterior' : 'Dia anterior'}>‹</button>
          <div className="campo campo--inline">
            <label htmlFor="dia" className="sr-only">Data</label>
            <input id="dia" type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
          </div>
          <button type="button" className="btn" onClick={() => setData(somarDias(data, passo))} aria-label={modo === 'semana' ? 'Próxima semana' : 'Próximo dia'}>›</button>
          <button type="button" className="btn btn--link" onClick={() => setData(hojeSP())}>Hoje</button>
        </div>
      </div>

      <p className="muted" aria-live="polite">
        {modo === 'dia' ? dataExtenso(data) : `Semana de ${dataMuitoCurta(inicio)} a ${dataMuitoCurta(fim)}`}
        {' · '}{ativos.length} atendimento(s) · previsto {moeda(total)}
      </p>

      <Mensagens erro={erro} ok={aviso} />
      {avisarZap && (
        <p><a className="btn" href={avisarZap.link} target="_blank" rel="noreferrer">Avisar {avisarZap.nome} pelo WhatsApp</a></p>
      )}
      {itens === null && <p>Carregando…</p>}

      {modo === 'semana' && itens && (
        <div className="semana">
          {[...Array(7)].map((_, i) => {
            const d = somarDias(inicio, i);
            const doDia = itens.filter((a) => a.data_agendamento === d && a.status !== 'CANCELADO');
            return (
              <section key={d} className={`semana__dia ${d === hojeSP() ? 'semana__dia--hoje' : ''}`} aria-label={dataExtenso(d)}>
                <h2 className="semana__titulo">
                  <button type="button" className="btn btn--link" onClick={() => { setData(d); setModo('dia'); }}>
                    {DIAS_CURTOS[diaDaSemana(d)]} {dataMuitoCurta(d)}
                  </button>
                </h2>
                {doDia.length === 0 && <p className="muted semana__vazio">Livre</p>}
                <ul>
                  {doDia.map((a) => (
                    <li key={a.id_agendamento} className={`semana__item semana__item--${a.status.toLowerCase()}`}>
                      <strong>{a.hora_inicio}</strong> {a.cliente}
                      <span className="muted"> · {a.servico}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {modo === 'dia' && itens && (
        <>
          {itens.length === 0 && !erro && <p className="aviso">Nenhum agendamento neste dia.</p>}
          <ul className="lista">
            {itens.map((a) => (
              <li key={a.id_agendamento} className={`ag ag--${a.status.toLowerCase()}`}>
                <div className="ag__hora"><strong>{a.hora_inicio}</strong><span>{a.hora_fim}</span></div>
                <div className="ag__corpo">
                  <p className="ag__cliente">{a.cliente} <span className={`selo selo--${a.status.toLowerCase()}`}>{ROTULO[a.status]}</span></p>
                  <p>{a.servico} · {moeda(a.preco)}</p>
                  <p className="muted">
                    <a href={linkWhatsApp(a.telefone_cliente)} target="_blank" rel="noreferrer">{a.telefone_cliente} (WhatsApp)</a>
                    {' · '}#{a.id_agendamento}
                  </p>
                  {a.observacao && <p className="muted">Obs.: {a.observacao}</p>}

                  {cancelando === a.id_agendamento ? (
                    <form className="ag__cancelar" onSubmit={(e) => { e.preventDefault(); mudar(a.id_agendamento, 'CANCELADO', motivo); }}>
                      <label htmlFor={`m${a.id_agendamento}`}>Motivo do cancelamento</label>
                      <input id={`m${a.id_agendamento}`} value={motivo} maxLength={255} onChange={(e) => setMotivo(e.target.value)} autoFocus />
                      <div className="acoes acoes--linha">
                        <button type="submit" className="btn btn--perigo">Confirmar cancelamento</button>
                        <button type="button" className="btn" onClick={() => setCancelando(null)}>Voltar</button>
                      </div>
                    </form>
                  ) : remarcando === a.id_agendamento ? (
                    <Remarcar a={a} buscarHorarios={buscarHorarios} remarcar={remarcarApi}
                      onFechar={() => setRemarcando(null)} onRemarcado={(r) => aoRemarcar(a, r)} />
                  ) : (
                    <div className="acoes acoes--linha">
                      {a.status === 'PENDENTE' && <button type="button" className="btn btn--primario" onClick={() => mudar(a.id_agendamento, 'CONFIRMADO')}>Confirmar</button>}
                      {a.status === 'CONFIRMADO' && <button type="button" className="btn btn--primario" onClick={() => mudar(a.id_agendamento, 'CONCLUIDO')}>Concluir</button>}
                      {['PENDENTE', 'CONFIRMADO'].includes(a.status) && <button type="button" className="btn" aria-label={`Remarcar ${a.cliente}`} onClick={() => { setRemarcando(a.id_agendamento); setAvisarZap(null); setAviso(''); }}>Remarcar</button>}
                      {['PENDENTE', 'CONFIRMADO'].includes(a.status) && <button type="button" className="btn" onClick={() => { setCancelando(a.id_agendamento); setMotivo(''); }}>Cancelar</button>}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
