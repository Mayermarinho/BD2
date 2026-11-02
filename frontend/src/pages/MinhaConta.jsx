import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { BotaoConfirmar, Mensagens } from '../components.jsx';
import { dataCurta, dataExtenso, hojeSP, moeda, somarDias } from '../utils.js';

const ROTULO = { PENDENTE: 'Aguardando confirmação', CONFIRMADO: 'Confirmado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' };

function Item({ a, acao, children }) {
  return (
    <li className={`cartao item item--${a.status.toLowerCase()}`}>
      <div className="item__corpo">
        <p className="item__nome">{a.servico} <span className={`selo selo--${a.status.toLowerCase()}`}>{ROTULO[a.status]}</span></p>
        <p>{dataExtenso(a.data_agendamento)} · {a.hora_inicio} às {a.hora_fim}</p>
        <p className="muted">{moeda(a.preco)} · #{a.id_agendamento}</p>
      </div>
      {acao && <div className="item__acoes">{acao}</div>}
      {children}
    </li>
  );
}

/** Painel para escolher outro dia/horário do mesmo serviço. */
function Remarcar({ a, token, onFechar, onRemarcado }) {
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
    api.cliente(token).horariosParaRemarcar(a.id_agendamento, data)
      .then((r) => { if (ativo) { setHorarios(r.horarios); setMotivo(r.motivoIndisponivel || ''); } })
      .catch((e) => { if (ativo) setErro(e.message); })
      .finally(() => { if (ativo) setBuscando(false); });
    return () => { ativo = false; };
  }, [data, a.id_agendamento, token]);

  // O horário que o próprio agendamento já ocupa não é uma opção (não seria uma remarcação)
  const opcoes = (horarios || []).filter((h) => !(data === a.data_agendamento && h === a.hora_inicio));

  async function confirmar() {
    setErro(''); setEnviando(true);
    try {
      const r = await api.cliente(token).remarcar(a.id_agendamento, data, hora);
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

export default function MinhaConta() {
  const { sessao, sair } = useAuth();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [remarcando, setRemarcando] = useState(null);

  const carregar = useCallback(async () => {
    try { setLista(await api.cliente(sessao.token).agendamentos()); }
    catch (e) {
      if (e.status === 401 || e.status === 403) { sair(); return; }
      setErro(e.message); setLista([]);
    }
  }, [sessao.token, sair]);

  useEffect(() => { carregar(); }, [carregar]);

  async function cancelar(id) {
    setErro(''); setOk('');
    try { await api.cliente(sessao.token).cancelar(id, 'Cancelado pelo cliente'); setOk('Agendamento cancelado.'); await carregar(); }
    catch (e) { setErro(e.message); }
  }

  async function aoRemarcar(r) {
    setRemarcando(null); setErro('');
    setOk(`Agendamento remarcado para ${dataCurta(r.data_agendamento)} às ${r.hora_inicio}.${r.status === 'PENDENTE' ? ' Ele volta a aguardar a confirmação da profissional.' : ''}`);
    await carregar();
  }

  const hoje = hojeSP();
  const proximos = (lista || []).filter((a) => ['PENDENTE', 'CONFIRMADO'].includes(a.status) && a.data_agendamento >= hoje).reverse();
  const historico = (lista || []).filter((a) => !proximos.includes(a));

  return (
    <section aria-labelledby="t">
      <h1 id="t" className="titulo">Olá, {sessao.usuario.nome.split(' ')[0]}!</h1>
      <p className="muted">{sessao.usuario.email}{sessao.usuario.telefone ? ` · ${sessao.usuario.telefone}` : ''}</p>
      <div className="acoes acoes--linha"><Link className="btn btn--primario" to="/#servicos">Novo agendamento</Link></div>
      <Mensagens erro={erro} ok={ok} />
      {lista === null && <p>Carregando…</p>}

      {lista && (
        <>
          <h2 className="subtitulo espaco">Próximos agendamentos</h2>
          {proximos.length === 0 && <p className="aviso">Você não tem agendamentos futuros.</p>}
          <ul className="lista">
            {proximos.map((a) => (
              <Item key={a.id_agendamento} a={a}
                acao={remarcando === a.id_agendamento ? null : (
                  <>
                    <button type="button" className="btn" aria-label={`Remarcar ${a.servico} de ${dataCurta(a.data_agendamento)}`}
                      onClick={() => { setOk(''); setErro(''); setRemarcando(a.id_agendamento); }}>Remarcar</button>
                    <BotaoConfirmar rotulo="Cancelar" pergunta={`Cancelar ${a.servico} em ${dataCurta(a.data_agendamento)}?`} onConfirmar={() => cancelar(a.id_agendamento)} />
                  </>
                )}>
                {remarcando === a.id_agendamento && (
                  <Remarcar a={a} token={sessao.token} onFechar={() => setRemarcando(null)} onRemarcado={aoRemarcar} />
                )}
              </Item>
            ))}
          </ul>

          {historico.length > 0 && (
            <>
              <h2 className="subtitulo espaco">Histórico</h2>
              <ul className="lista">{historico.map((a) => <Item key={a.id_agendamento} a={a} />)}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
