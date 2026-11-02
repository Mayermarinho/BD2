// Painel: clientes e relatórios.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { criarApp } from '../src/app.js';
import { config as base } from '../src/config.js';
import { agoraNoFuso, proximaData } from '../src/datas.js';
import { criarRepoMemoria } from '../src/repos/memoria.js';
import { gerarRelatorio } from '../src/relatorios.js';

const config = { ...base, jwtSecret: 'segredo-de-teste-bem-longo-123', statusInicial: 'CONFIRMADO', passoMinutos: 30, antecedenciaMinutos: 60 };
const hoje = agoraNoFuso(config.fusoHorario).data;
const terca = proximaData(2, hoje, 2); // o seed põe 2 agendamentos aqui: Ana (Corte R$60) e Juliana (Escova R$45)

let srv; let url; let tk; let tkCliente;
const j = async (m, c, corpo, token = tk) => {
  const r = await fetch(url + c, {
    method: m,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return [r.status, await r.json()];
};
const periodo = `inicio=${terca}&fim=${terca}`;

before(async () => {
  srv = criarApp(criarRepoMemoria(), config).listen(0);
  url = `http://localhost:${srv.address().port}/api`;
  tk = (await j('POST', '/auth/login', { email: 'admin@mariana.com', senha: 'admin123' }, null))[1].token;
  tkCliente = (await j('POST', '/clientes/cadastro', { nome: 'Bia Souza', email: 'bia@email.com', telefone: '18999991111', senha: 'senha-segura-1' }, null))[1].token;
});
after(() => srv.close());

test('relatório: protegido, valida o período e soma o seed', async () => {
  assert.equal((await j('GET', `/admin/relatorios?${periodo}`, null, null))[0], 401);
  assert.equal((await j('GET', `/admin/relatorios?${periodo}`, null, tkCliente))[0], 403);
  assert.equal((await j('GET', '/admin/relatorios?inicio=abc&fim=2026-01-01'))[0], 400);
  assert.equal((await j('GET', `/admin/relatorios?inicio=${terca}&fim=2000-01-01`))[0], 400);
  assert.equal((await j('GET', `/admin/relatorios?inicio=${terca}&fim=2999-01-01`))[0], 400); // máx. 366 dias

  const [s, r] = await j('GET', `/admin/relatorios?${periodo}`);
  assert.equal(s, 200);
  assert.deepEqual(r.periodo, { inicio: terca, fim: terca });
  assert.equal(r.totais.agendamentos, 2);
  assert.equal(r.totais.abertos, 2);
  assert.equal(r.totais.receita_prevista, 105);
  assert.equal(r.totais.receita_realizada, 0);
  assert.equal(r.totais.clientes_atendidos, 2);
  assert.equal(r.porServico.length, 2);
  assert.deepEqual(r.porDia, [{ data: terca, quantidade: 2, realizado: 0, previsto: 105 }]);
});

test('relatório acompanha concluir e cancelar na agenda', async () => {
  const [, agenda] = await j('GET', `/admin/agenda?${periodo}`);
  const corte = agenda.find((a) => a.servico === 'Corte feminino');
  const escova = agenda.find((a) => a.servico === 'Escova');
  assert.equal((await j('PATCH', `/admin/agendamentos/${corte.id_agendamento}`, { status: 'CONCLUIDO' }))[0], 200);
  assert.equal((await j('PATCH', `/admin/agendamentos/${escova.id_agendamento}`, { status: 'CANCELADO' }))[0], 200);

  const [, r] = await j('GET', `/admin/relatorios?${periodo}`);
  assert.equal(r.totais.agendamentos, 2);
  assert.equal(r.totais.concluidos, 1);
  assert.equal(r.totais.cancelados, 1);
  assert.equal(r.totais.taxa_cancelamento, 50);
  assert.equal(r.totais.receita_realizada, 60);
  assert.equal(r.totais.receita_prevista, 0);
  assert.equal(r.totais.ticket_medio, 60);
  assert.equal(r.totais.clientes_atendidos, 1);               // cancelado não conta como atendido
  const esc = r.porServico.find((x) => x.servico === 'Escova');
  assert.deepEqual([esc.quantidade, esc.cancelados, esc.realizado], [0, 1, 0]);
  assert.equal(r.melhoresClientes.length, 1);
});

test('gerarRelatorio: ordenação, ticket médio e período vazio', () => {
  const a = (id_cliente, cliente, id_servico, servico, status, preco, data = '2026-11-10') =>
    ({ id_cliente, cliente, id_servico, servico, status, preco, data_agendamento: data });
  const r = gerarRelatorio([
    a(1, 'Ana', 1, 'Corte', 'CONCLUIDO', 60), a(1, 'Ana', 1, 'Corte', 'CONCLUIDO', 60, '2026-11-12'),
    a(2, 'Bia', 2, 'Escova', 'CONCLUIDO', 45), a(3, 'Cris', 3, 'Cor', 'CONFIRMADO', 150), a(4, 'Dani', 1, 'Corte', 'CANCELADO', 60),
  ], '2026-11-01', '2026-11-30');
  assert.equal(r.totais.receita_realizada, 165);
  assert.equal(r.totais.ticket_medio, 55);
  assert.equal(r.totais.taxa_cancelamento, 20);
  assert.equal(r.porServico[0].servico, 'Corte');               // mais agendamentos primeiro
  assert.equal(r.melhoresClientes[0].cliente, 'Ana');
  assert.deepEqual(r.porDia.map((d) => d.data), ['2026-11-10', '2026-11-12']);

  const vazio = gerarRelatorio([], '2026-11-01', '2026-11-30');
  assert.equal(vazio.totais.taxa_cancelamento, 0);
  assert.equal(vazio.totais.ticket_medio, 0);
  assert.deepEqual(vazio.porServico, []);
});

test('clientes: lista só quem agendou, busca por nome, e-mail e telefone, e abre o histórico', async () => {
  assert.equal((await j('GET', '/admin/clientes', null, null))[0], 401);
  assert.equal((await j('GET', '/admin/clientes', null, tkCliente))[0], 403);

  const [s, todos] = await j('GET', '/admin/clientes');
  assert.equal(s, 200);
  assert.deepEqual(todos.map((c) => c.nome), ['Ana Paula', 'Juliana Santos']); // Carla e Bia nunca agendaram
  const ana = todos[0];
  assert.deepEqual([ana.total, ana.concluidos, ana.cancelados, ana.gasto, ana.tem_conta], [1, 1, 0, 60, false]); // concluída no teste anterior
  assert.equal(ana.ultimo_atendimento, terca);
  assert.equal(ana.proximo, null);
  const jul = todos[1];
  assert.deepEqual([jul.cancelados, jul.gasto], [1, 0]);

  assert.deepEqual((await j('GET', '/admin/clientes?busca=JULIANA'))[1].map((c) => c.nome), ['Juliana Santos']);
  assert.deepEqual((await j('GET', '/admin/clientes?busca=97777'))[1].map((c) => c.nome), ['Juliana Santos']); // telefone
  assert.deepEqual((await j('GET', '/admin/clientes?busca=juliana@email'))[1].map((c) => c.nome), ['Juliana Santos']);
  assert.deepEqual((await j('GET', '/admin/clientes?busca=zzz'))[1], []);

  const [sd, det] = await j('GET', `/admin/clientes/${ana.id_cliente}`);
  assert.equal(sd, 200);
  assert.equal(det.agendamentos.length, 1);
  assert.equal(det.agendamentos[0].servico, 'Corte feminino');
  assert.equal((await j('GET', '/admin/clientes/3'))[0], 404);   // Carla nunca agendou
  assert.equal((await j('GET', '/admin/clientes/999'))[0], 404);
});

test('clientes: conta de cliente aparece com "tem_conta" e o próximo agendamento', async () => {
  const [, ag] = await j('POST', '/agendamentos', { id_servico: 4, data: proximaData(3, hoje, 2), hora_inicio: '10:00' }, tkCliente);
  const [, lista] = await j('GET', '/admin/clientes?busca=bia');
  assert.equal(lista.length, 1);
  assert.equal(lista[0].tem_conta, true);
  assert.equal(lista[0].proximo.hora_inicio, '10:00');
  assert.equal(lista[0].proximo.servico, 'Design de sobrancelha');
  assert.ok(ag.id_agendamento);
});
