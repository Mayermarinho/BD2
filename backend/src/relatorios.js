// Cálculos do painel: relatório do período e resumo por cliente. Funções puras (sem banco).
// Entrada: linhas de agendaDoPeriodo (id_cliente, cliente, id_servico, servico, status, preco, data_agendamento...).
//
// Regras de contagem:
//  - "realizado" = atendimentos CONCLUÍDOS (dinheiro que de fato entrou segundo a agenda);
//  - "previsto"  = PENDENTE + CONFIRMADO (ainda não marcados como concluídos);
//  - cancelados não entram em quantidade nem em valores.
const ABERTOS = ['PENDENTE', 'CONFIRMADO'];
const centavos = (n) => Math.round(Number(n) * 100) / 100;
const soma = (itens) => centavos(itens.reduce((t, a) => t + Number(a.preco), 0));

export function gerarRelatorio(lista, inicio, fim) {
  const nao = lista.filter((a) => a.status !== 'CANCELADO');
  const concluidos = lista.filter((a) => a.status === 'CONCLUIDO');
  const abertos = lista.filter((a) => ABERTOS.includes(a.status));
  const cancelados = lista.filter((a) => a.status === 'CANCELADO');

  const totais = {
    agendamentos: lista.length,
    concluidos: concluidos.length,
    abertos: abertos.length,
    cancelados: cancelados.length,
    taxa_cancelamento: lista.length ? Math.round((cancelados.length / lista.length) * 1000) / 10 : 0,
    receita_realizada: soma(concluidos),
    receita_prevista: soma(abertos),
    ticket_medio: concluidos.length ? centavos(soma(concluidos) / concluidos.length) : 0,
    clientes_atendidos: new Set(nao.map((a) => a.id_cliente)).size,
  };

  const agrupar = (itens, chave) => {
    const mapa = new Map();
    for (const a of itens) mapa.set(chave(a), [...(mapa.get(chave(a)) ?? []), a]);
    return mapa;
  };

  const porServico = [...agrupar(lista, (a) => a.id_servico).values()].map((g) => ({
    id_servico: g[0].id_servico,
    servico: g[0].servico,
    quantidade: g.filter((a) => a.status !== 'CANCELADO').length,
    cancelados: g.filter((a) => a.status === 'CANCELADO').length,
    realizado: soma(g.filter((a) => a.status === 'CONCLUIDO')),
    previsto: soma(g.filter((a) => ABERTOS.includes(a.status))),
  })).sort((x, y) => y.quantidade - x.quantidade || y.realizado - x.realizado || x.servico.localeCompare(y.servico));

  const porDia = [...agrupar(nao, (a) => a.data_agendamento).entries()]
    .map(([data, g]) => ({
      data,
      quantidade: g.length,
      realizado: soma(g.filter((a) => a.status === 'CONCLUIDO')),
      previsto: soma(g.filter((a) => ABERTOS.includes(a.status))),
    })).sort((x, y) => x.data.localeCompare(y.data));

  const melhoresClientes = [...agrupar(nao, (a) => a.id_cliente).values()].map((g) => ({
    id_cliente: g[0].id_cliente,
    cliente: g[0].cliente,
    quantidade: g.length,
    gasto: soma(g),
  })).sort((x, y) => y.quantidade - x.quantidade || y.gasto - x.gasto || x.cliente.localeCompare(y.cliente)).slice(0, 5);

  return { periodo: { inicio, fim }, totais, porServico, porDia, melhoresClientes };
}

/** Resumo de cada cliente a partir de todo o histórico com a profissional. */
export function resumirClientes(clientes, historico, hoje) {
  return clientes.map((c) => {
    const h = historico.filter((a) => a.id_cliente === c.id_cliente);
    const concluidos = h.filter((a) => a.status === 'CONCLUIDO');
    const futuros = h.filter((a) => ABERTOS.includes(a.status) && a.data_agendamento >= hoje)
      .sort((x, y) => x.data_agendamento.localeCompare(y.data_agendamento) || x.hora_inicio.localeCompare(y.hora_inicio));
    const ultimo = concluidos.map((a) => a.data_agendamento).sort().pop() ?? null;
    return {
      ...c,
      total: h.length,
      concluidos: concluidos.length,
      cancelados: h.filter((a) => a.status === 'CANCELADO').length,
      gasto: soma(concluidos),
      ultimo_atendimento: ultimo,
      proximo: futuros[0] ? { data_agendamento: futuros[0].data_agendamento, hora_inicio: futuros[0].hora_inicio, servico: futuros[0].servico } : null,
    };
  });
}
