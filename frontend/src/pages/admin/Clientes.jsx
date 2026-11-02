import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { dataCurta, dataExtenso, linkWhatsApp, moeda } from '../../utils.js';

const ROTULO = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' };

function Historico({ id, token }) {
  const [det, setDet] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    api.admin(token).cliente(id).then(setDet).catch((e) => setErro(e.message));
  }, [id, token]);
  if (erro) return <p className="erro" role="alert">{erro}</p>;
  if (!det) return <p>Carregando histórico…</p>;
  return (
    <ul className="lista-simples cliente__historico">
      {det.agendamentos.map((a) => (
        <li key={a.id_agendamento}>
          <strong>{dataExtenso(a.data_agendamento)} · {a.hora_inicio}</strong>
          <span>{a.servico} · {moeda(a.preco)} <span className={`selo selo--${a.status.toLowerCase()}`}>{ROTULO[a.status]}</span></span>
          {a.observacao && <span className="muted">Obs.: {a.observacao}</span>}
        </li>
      ))}
    </ul>
  );
}

export default function Clientes() {
  const { sessao, sair } = useAuth();
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState(null);

  useEffect(() => {
    let ativo = true;
    setErro('');
    const espera = setTimeout(() => { // espera a pessoa parar de digitar
      api.admin(sessao.token).clientes(busca.trim())
        .then((l) => { if (ativo) setLista(l); })
        .catch((e) => {
          if (!ativo) return;
          if (e.status === 401) { sair(); return; }
          setErro(e.message); setLista([]);
        });
    }, busca ? 250 : 0);
    return () => { ativo = false; clearTimeout(espera); };
  }, [busca, sessao.token, sair]);

  return (
    <section aria-labelledby="t">
      <h1 id="t" className="titulo">Clientes</h1>
      <p className="muted">Quem já agendou com você, com ou sem conta no site. Os valores consideram só atendimentos marcados como Concluído.</p>

      <div className="campo">
        <label htmlFor="busca">Buscar por nome, telefone ou e-mail</label>
        <input id="busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} autoComplete="off" />
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {lista === null && <p>Carregando…</p>}
      <div aria-live="polite">
        {lista && <p className="muted">{lista.length === 1 ? '1 cliente' : `${lista.length} clientes`}{busca ? ' encontrado(s)' : ''}</p>}
        {lista && lista.length === 0 && !erro && <p className="aviso">{busca ? 'Nenhum cliente encontrado.' : 'Ainda não há clientes com agendamentos.'}</p>}
      </div>

      <ul className="lista">
        {(lista || []).map((c) => (
          <li key={c.id_cliente} className="cartao cliente">
            <div className="item">
              <div className="item__corpo">
                <p className="item__nome">{c.nome} <span className={`selo ${c.tem_conta ? 'selo--confirmado' : 'selo--cancelado'}`}>{c.tem_conta ? 'Com conta' : 'Sem conta'}</span></p>
                <p>{c.telefone}{c.email ? ` · ${c.email}` : ''}</p>
                <p className="muted">
                  {c.concluidos} atendimento(s) concluído(s) · {moeda(c.gasto)}
                  {c.cancelados > 0 && ` · ${c.cancelados} cancelado(s)`}
                </p>
                <p className="muted">
                  Último atendimento: {c.ultimo_atendimento ? dataCurta(c.ultimo_atendimento) : 'nenhum ainda'}
                  {c.proximo && ` · Próximo: ${dataCurta(c.proximo.data_agendamento)} às ${c.proximo.hora_inicio} (${c.proximo.servico})`}
                </p>
              </div>
              <div className="item__acoes">
                <a className="btn" href={linkWhatsApp(c.telefone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${c.nome}`}>WhatsApp</a>
                <button type="button" className="btn" aria-expanded={aberto === c.id_cliente}
                  aria-label={`${aberto === c.id_cliente ? 'Ocultar' : 'Ver'} histórico de ${c.nome}`}
                  onClick={() => setAberto(aberto === c.id_cliente ? null : c.id_cliente)}>
                  {aberto === c.id_cliente ? 'Ocultar histórico' : 'Ver histórico'}
                </button>
              </div>
            </div>
            {aberto === c.id_cliente && <Historico id={c.id_cliente} token={sessao.token} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
