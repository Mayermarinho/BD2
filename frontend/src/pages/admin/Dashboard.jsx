import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { DIAS_CURTOS, dataExtenso, dataMuitoCurta, diaDaSemana, moeda } from '../../utils.js';

export default function Dashboard() {
  const { sessao } = useAuth();
  const [r, setR] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.admin(sessao.token).resumo().then(setR).catch((e) => setErro(e.message));
  }, [sessao.token]);

  if (erro) return <p className="erro" role="alert">{erro}</p>;
  if (!r) return <p>Carregando…</p>;

  const maior = Math.max(1, ...r.porDia.map((d) => d.quantidade));

  return (
    <section aria-labelledby="t">
      <h1 id="t" className="titulo">Olá, {sessao.usuario.nome.split(' ')[0]}!</h1>
      <p className="muted">{dataExtenso(r.data)}</p>

      <ul className="indicadores">
        <li className="indicador">
          <span className="indicador__valor">{r.hoje.quantidade}</span>
          <span className="indicador__rotulo">atendimento(s) hoje</span>
          <span className="indicador__extra">{moeda(r.hoje.previsto)} previsto</span>
        </li>
        <li className="indicador">
          <span className="indicador__valor">{r.semana.quantidade}</span>
          <span className="indicador__rotulo">nos próximos 7 dias</span>
          <span className="indicador__extra">{moeda(r.semana.previsto)} previsto</span>
        </li>
        <li className={`indicador ${r.pendentes ? 'indicador--alerta' : ''}`}>
          <span className="indicador__valor">{r.pendentes}</span>
          <span className="indicador__rotulo">aguardando confirmação</span>
          <Link className="indicador__extra" to="/admin/agenda">{r.pendentes ? 'Abrir agenda' : 'Tudo em dia'}</Link>
        </li>
      </ul>

      <div className="duas-colunas">
        <section className="cartao" aria-labelledby="t-prox">
          <h2 id="t-prox" className="subtitulo">Próximos atendimentos</h2>
          {r.proximos.length === 0 && <p className="muted">Nenhum atendimento marcado.</p>}
          <ul className="lista-simples">
            {r.proximos.map((a) => (
              <li key={a.id_agendamento}>
                <strong>{a.data_agendamento === r.data ? 'Hoje' : dataMuitoCurta(a.data_agendamento)} · {a.hora_inicio}</strong>
                <span>{a.cliente} — {a.servico}</span>
                {a.status === 'PENDENTE' && <span className="selo selo--pendente">Pendente</span>}
              </li>
            ))}
          </ul>
          <p><Link to="/admin/agenda">Ver agenda completa</Link></p>
        </section>

        <section className="cartao" aria-labelledby="t-sem">
          <h2 id="t-sem" className="subtitulo">Próximos 7 dias</h2>
          <ol className="barras">
            {r.porDia.map((d) => (
              <li key={d.data} className="barras__item">
                <span className="barras__num">{d.quantidade}<span className="sr-only"> atendimento(s)</span></span>
                <span className="barras__barra" style={{ height: `${(d.quantidade / maior) * 100}%` }} aria-hidden="true" />
                <span className="barras__rotulo">{DIAS_CURTOS[diaDaSemana(d.data)]}<br />{dataMuitoCurta(d.data)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="cartao" aria-labelledby="t-at">
        <h2 id="t-at" className="subtitulo">Atalhos</h2>
        <div className="acoes acoes--linha">
          <Link className="btn" to="/admin/servicos">Gerenciar serviços</Link>
          <Link className="btn" to="/admin/horarios">Horários e folgas</Link>
          <Link className="btn" to="/admin/clientes">Clientes</Link>
          <Link className="btn" to="/admin/relatorios">Relatórios</Link>
          <Link className="btn" to="/" target="_blank" rel="noreferrer">Ver página do cliente</Link>
        </div>
      </section>
    </section>
  );
}
