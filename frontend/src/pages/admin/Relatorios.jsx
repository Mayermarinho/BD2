import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import {
  dataCurta, dataMuitoCurta, gerarCsv, hojeSP, mesAnterior, moeda, primeiroDiaDoMes, somarDias, ultimoDiaDoMes,
} from '../../utils.js';

const ROTULO = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' };

export default function Relatorios() {
  const { sessao, sair } = useAuth();
  const hoje = hojeSP();
  const [inicio, setInicio] = useState(primeiroDiaDoMes(hoje));
  const [fim, setFim] = useState(ultimoDiaDoMes(hoje));
  const [r, setR] = useState(null);
  const [erro, setErro] = useState('');
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (!inicio || !fim) return undefined;
    if (fim < inicio) { setErro('A data final não pode ser antes da inicial.'); return undefined; }
    let ativo = true;
    setErro(''); setR(null);
    api.admin(sessao.token).relatorio(inicio, fim)
      .then((x) => { if (ativo) setR(x); })
      .catch((e) => {
        if (!ativo) return;
        if (e.status === 401) { sair(); return; }
        setErro(e.message);
      });
    return () => { ativo = false; };
  }, [inicio, fim, sessao.token, sair]);

  const periodo = (a, b) => { setInicio(a); setFim(b); };
  const mesPassado = mesAnterior(hoje);

  async function baixarCsv() {
    setBaixando(true); setErro('');
    try {
      const lista = await api.admin(sessao.token).agenda(inicio, fim);
      const linhas = [['Data', 'Início', 'Fim', 'Cliente', 'Telefone', 'Serviço', 'Valor', 'Situação'],
        ...lista.map((a) => [dataCurta(a.data_agendamento), a.hora_inicio, a.hora_fim, a.cliente, a.telefone_cliente, a.servico,
          Number(a.preco).toFixed(2).replace('.', ','), ROTULO[a.status]])];
      const url = URL.createObjectURL(new Blob([gerarCsv(linhas)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = `agendamentos-${inicio}-a-${fim}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
    } catch (e) { setErro(e.message); }
    setBaixando(false);
  }

  const t = r?.totais;
  const maior = Math.max(1, ...(r?.porDia ?? []).map((d) => d.quantidade));

  return (
    <section aria-labelledby="t">
      <h1 id="t" className="titulo">Relatórios</h1>
      <p className="muted">Cancelados não entram nos valores. <strong>Realizado</strong> = atendimentos marcados como Concluído na agenda; <strong>previsto</strong> = pendentes e confirmados.</p>

      <div className="cartao">
        <div className="formulario formulario--linha">
          <div className="campo">
            <label htmlFor="ini">De</label>
            <input id="ini" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="fim">Até</label>
            <input id="fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>
        <div className="chips" role="group" aria-label="Períodos prontos">
          <button type="button" className="filtro" onClick={() => periodo(primeiroDiaDoMes(hoje), ultimoDiaDoMes(hoje))}>Este mês</button>
          <button type="button" className="filtro" onClick={() => periodo(mesPassado, ultimoDiaDoMes(mesPassado))}>Mês passado</button>
          <button type="button" className="filtro" onClick={() => periodo(somarDias(hoje, -29), hoje)}>Últimos 30 dias</button>
          <button type="button" className="filtro" onClick={() => periodo(`${hoje.slice(0, 4)}-01-01`, `${hoje.slice(0, 4)}-12-31`)}>Este ano</button>
        </div>
      </div>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!r && !erro && <p>Carregando…</p>}

      {r && (
        <>
          <p className="muted" aria-live="polite">Período: {dataCurta(r.periodo.inicio)} a {dataCurta(r.periodo.fim)}</p>
          <ul className="indicadores">
            <li className="indicador"><span className="indicador__valor">{t.agendamentos}</span><span className="indicador__rotulo">agendamentos</span>
              <span className="indicador__extra">{t.concluidos} concluído(s) · {t.abertos} em aberto</span></li>
            <li className="indicador"><span className="indicador__valor">{moeda(t.receita_realizada)}</span><span className="indicador__rotulo">realizado</span>
              <span className="indicador__extra">ticket médio {moeda(t.ticket_medio)}</span></li>
            <li className="indicador"><span className="indicador__valor">{moeda(t.receita_prevista)}</span><span className="indicador__rotulo">previsto</span>
              <span className="indicador__extra">ainda não concluído</span></li>
            <li className={`indicador ${t.taxa_cancelamento >= 20 ? 'indicador--alerta' : ''}`}><span className="indicador__valor">{String(t.taxa_cancelamento).replace('.', ',')}%</span>
              <span className="indicador__rotulo">cancelamentos</span><span className="indicador__extra">{t.cancelados} de {t.agendamentos}</span></li>
            <li className="indicador"><span className="indicador__valor">{t.clientes_atendidos}</span><span className="indicador__rotulo">clientes</span>
              <span className="indicador__extra">com horário no período</span></li>
          </ul>

          {t.agendamentos === 0 && <p className="aviso">Não há agendamentos neste período.</p>}

          {t.agendamentos > 0 && (
            <>
              <div className="acoes acoes--linha">
                <button type="button" className="btn" onClick={baixarCsv} disabled={baixando}>{baixando ? 'Gerando…' : 'Baixar lista (CSV para Excel)'}</button>
              </div>

              <section className="cartao" aria-labelledby="t-serv">
                <h2 id="t-serv" className="subtitulo">Por serviço</h2>
                <div className="tabela-rolagem">
                  <table className="tabela">
                    <thead><tr><th scope="col">Serviço</th><th scope="col">Agendados</th><th scope="col">Cancelados</th><th scope="col">Realizado</th><th scope="col">Previsto</th></tr></thead>
                    <tbody>
                      {r.porServico.map((s) => (
                        <tr key={s.id_servico}><th scope="row">{s.servico}</th><td>{s.quantidade}</td><td>{s.cancelados}</td><td>{moeda(s.realizado)}</td><td>{moeda(s.previsto)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="duas-colunas">
                <section className="cartao" aria-labelledby="t-dia">
                  <h2 id="t-dia" className="subtitulo">Por dia</h2>
                  <ul className="lista-simples">
                    {r.porDia.map((d) => (
                      <li key={d.data} className="dia-linha">
                        <span>{dataMuitoCurta(d.data)}</span>
                        <span className="dia-linha__barra" aria-hidden="true"><span style={{ width: `${(d.quantidade / maior) * 100}%` }} /></span>
                        <span>{d.quantidade} · {moeda(d.realizado + d.previsto)}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="cartao" aria-labelledby="t-cli">
                  <h2 id="t-cli" className="subtitulo">Clientes que mais agendaram</h2>
                  <ol className="lista-simples">
                    {r.melhoresClientes.map((c) => (
                      <li key={c.id_cliente}><strong>{c.cliente}</strong><span>{c.quantidade} atendimento(s) · {moeda(c.gasto)}</span></li>
                    ))}
                  </ol>
                </section>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
