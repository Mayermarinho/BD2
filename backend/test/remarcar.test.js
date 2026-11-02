// Remarcar horário pela conta do cliente: regras, isolamento entre contas e concorrência.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { criarApp } from '../src/app.js';
import { config as base } from '../src/config.js';
import { agoraNoFuso, proximaData } from '../src/datas.js';
import { criarRepoMemoria } from '../src/repos/memoria.js';

const config = { ...base, jwtSecret: 'segredo-de-teste-bem-longo-123', statusInicial: 'CONFIRMADO', passoMinutos: 30, antecedenciaMinutos: 60 };
const hoje = agoraNoFuso(config.fusoHorario).data;
const quarta = proximaData(3, hoje, 2);
const quinta = proximaData(4, hoje, 2);
const terca = proximaData(2, hoje, 2); // o seed põe aqui: Ana 10:00-11:00 (Corte) e Juliana 11:30-12:15 (Escova)
const ontem = new Date(Date.now() - 36 * 3600 * 1000).toISOString().slice(0, 10);

let repo; let srv; let srvPendente; let url; let urlPendente;
const chamar = (base_) => async (m, c, corpo, token) => {
  const r = await fetch(base_ + c, {
    method: m,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return [r.status, await r.json()];
};
const j = (...a) => chamar(url)(...a);
const jp = (...a) => chamar(urlPendente)(...a);
let bia; let carol; let admin;

before(async () => {
  repo = criarRepoMemoria();
  srv = criarApp(repo, config).listen(0);
  srvPendente = criarApp(repo, { ...config, statusInicial: 'PENDENTE' }).listen(0);
  url = `http://localhost:${srv.address().port}/api`;
  urlPendente = `http://localhost:${srvPendente.address().port}/api`;
  bia = (await j('POST', '/clientes/cadastro', { nome: 'Bia Souza', email: 'bia@email.com', telefone: '18999991111', senha: 'senha-segura-1' }))[1].token;
  carol = (await j('POST', '/clientes/cadastro', { nome: 'Carol Dias', email: 'carol@email.com', telefone: '18988887777', senha: 'senha-segura-2' }))[1].token;
  admin = (await j('POST', '/auth/login', { email: 'admin@mariana.com', senha: 'admin123' }))[1].token;
});
after(() => { srv.close(); srvPendente.close(); });

test('remarcar: o horário atual não bloqueia a si mesmo, o antigo é liberado e o novo é ocupado', async () => {
  const [, ag] = await j('POST', '/agendamentos', { id_servico: 2, data: quarta, hora_inicio: '10:00' }, bia); // Escova 45 min
  const [s, d] = await j('GET', `/cliente/agendamentos/${ag.id_agendamento}/disponibilidade?data=${quarta}`, null, bia);
  assert.equal(s, 200);
  assert.ok(d.horarios.includes('10:00') && d.horarios.includes('10:30'), 'horários que só sobrepõem ao próprio agendamento continuam livres');

  const [, publico] = await j('GET', `/disponibilidade?servico=2&data=${quarta}`);
  assert.ok(!publico.horarios.includes('10:30'), 'para os outros, o horário segue ocupado');

  const [sr, novo] = await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/remarcar`, { data: quinta, hora_inicio: '14:00' }, bia);
  assert.equal(sr, 200);
  assert.deepEqual([novo.data_agendamento, novo.hora_inicio, novo.hora_fim, novo.status], [quinta, '14:00', '14:45', 'CONFIRMADO']);
  assert.deepEqual(novo.anterior, { data_agendamento: quarta, hora_inicio: '10:00' });

  const [, depois] = await j('GET', `/disponibilidade?servico=2&data=${quarta}`);
  assert.ok(depois.horarios.includes('10:00'), 'horário antigo voltou a ficar livre');
  const [, lista] = await j('GET', '/cliente/agendamentos', null, bia);
  assert.equal(lista.length, 1);                                 // continua sendo o mesmo agendamento
  assert.equal(lista[0].id_agendamento, ag.id_agendamento);
  assert.equal(lista[0].data_agendamento, quinta);
  const [, agenda] = await j('GET', `/admin/agenda?inicio=${quinta}&fim=${quinta}`, null, admin);
  assert.ok(agenda.some((a) => a.id_agendamento === ag.id_agendamento && a.hora_inicio === '14:00'));
});

test('remarcar no mesmo dia, para um horário que só sobrepõe ao próprio agendamento', async () => {
  const [, ag] = await j('POST', '/agendamentos', { id_servico: 3, data: quarta, hora_inicio: '09:00' }, carol); // Coloração 2 h
  const [s, r] = await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/remarcar`, { data: quarta, hora_inicio: '09:30' }, carol);
  assert.equal(s, 200);
  assert.equal(r.hora_fim, '11:30');
  assert.equal((await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/remarcar`, { data: quarta, hora_inicio: '09:30' }, carol))[0], 400); // igual ao atual
  await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/cancelar`, {}, carol); // libera o dia para os próximos testes
});

test('remarcar recusa horário ocupado, passado, dia de folga e dados inválidos', async () => {
  const [, meu] = await j('POST', '/agendamentos', { id_servico: 4, data: quarta, hora_inicio: '13:00' }, bia);
  await j('POST', '/agendamentos', { id_servico: 2, data: quarta, hora_inicio: '15:00' }, carol); // 15:00-15:45
  const rem = (corpo) => j('POST', `/cliente/agendamentos/${meu.id_agendamento}/remarcar`, corpo, bia);

  assert.equal((await rem({ data: quarta, hora_inicio: '15:30' }))[0], 409);   // invade o da Carol
  assert.equal((await rem({ data: ontem, hora_inicio: '10:00' }))[0], 409);    // passado
  assert.equal((await rem({ data: quarta, hora_inicio: '20:00' }))[0], 409);   // fora do expediente
  assert.equal((await rem({ data: 'abc', hora_inicio: '10:00' }))[0], 400);
  assert.equal((await rem({ data: quarta, hora_inicio: '25:00' }))[0], 400);

  const [, b] = await j('POST', '/admin/bloqueios', { data_inicio: quinta, data_fim: quinta, motivo: 'Folga' }, admin);
  assert.equal((await rem({ data: quinta, hora_inicio: '10:00' }))[0], 409);   // folga
  await j('DELETE', `/admin/bloqueios/${b.id_bloqueio}`, null, admin);

  const [, depois] = await j('GET', '/cliente/agendamentos', null, bia);
  assert.ok(depois.some((a) => a.id_agendamento === meu.id_agendamento && a.hora_inicio === '13:00'), 'nada mudou após as recusas');
});

test('remarcar: só a dona remarca; visitante e administradora não; cancelado e já iniciado não', async () => {
  const [, ag] = await j('POST', '/agendamentos', { id_servico: 4, data: quinta, hora_inicio: '09:00' }, bia);
  const corpo = { data: quinta, hora_inicio: '09:30' };
  assert.equal((await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/remarcar`, corpo, carol))[0], 404);
  assert.equal((await j('GET', `/cliente/agendamentos/${ag.id_agendamento}/disponibilidade?data=${quinta}`, null, carol))[0], 404);
  assert.equal((await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/remarcar`, corpo))[0], 401);
  assert.equal((await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/remarcar`, corpo, admin))[0], 403);

  await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/cancelar`, {}, bia);
  assert.equal((await j('POST', `/cliente/agendamentos/${ag.id_agendamento}/remarcar`, corpo, bia))[0], 409); // cancelado
  assert.equal((await j('GET', `/cliente/agendamentos/${ag.id_agendamento}/disponibilidade?data=${quinta}`, null, bia))[0], 409);

  // atendimento de ontem (inserido direto: a API não deixa criar no passado)
  const idBia = (await j('GET', '/cliente/perfil', null, bia))[1].id_cliente;
  repo._db.agendamentos.push({ id_agendamento: 900, id_cliente: idBia, id_servico: 4, id_profissional: 1, data_agendamento: ontem,
    hora_inicio: '10:00', hora_fim: '10:30', preco_cobrado: 50, status: 'CONFIRMADO', observacao: null, motivo_cancelamento: null });
  assert.equal((await j('POST', '/cliente/agendamentos/900/remarcar', corpo, bia))[0], 409);
});

test('remarcar com confirmação obrigatória volta o agendamento para PENDENTE', async () => {
  const [, ag] = await j('POST', '/agendamentos', { id_servico: 4, data: quinta, hora_inicio: '11:00' }, carol);
  assert.equal(ag.status, 'CONFIRMADO');
  const [s, r] = await jp('POST', `/cliente/agendamentos/${ag.id_agendamento}/remarcar`, { data: quinta, hora_inicio: '11:30' }, carol);
  assert.equal(s, 200);
  assert.equal(r.status, 'PENDENTE');
});

test('remarcar: dois pedidos ao mesmo tempo para o mesmo horário, só um vence', async () => {
  const [, a1] = await j('POST', '/agendamentos', { id_servico: 4, data: quarta, hora_inicio: '16:00' }, bia);
  const [, a2] = await j('POST', '/agendamentos', { id_servico: 4, data: quarta, hora_inicio: '16:30' }, carol);
  const alvo = { data: quinta, hora_inicio: '17:00' };
  const resp = await Promise.all([
    j('POST', `/cliente/agendamentos/${a1.id_agendamento}/remarcar`, alvo, bia),
    j('POST', `/cliente/agendamentos/${a2.id_agendamento}/remarcar`, alvo, carol),
  ]);
  assert.deepEqual(resp.map((x) => x[0]).sort(), [200, 409]);
});

test('painel: a profissional remarca qualquer agendamento (inclusive de visitante) e o status é mantido', async () => {
  const [, agenda] = await j('GET', `/admin/agenda?inicio=${terca}&fim=${terca}`, null, admin);
  const ana = agenda.find((a) => a.cliente === 'Ana Paula');                 // Corte de 60 min, sem conta
  const [sd, d] = await j('GET', `/admin/agendamentos/${ana.id_agendamento}/disponibilidade?data=${terca}`, null, admin);
  assert.equal(sd, 200);
  assert.ok(d.horarios.includes('10:00') && d.horarios.includes('10:30'));   // o próprio horário não bloqueia

  const [s, r] = await j('POST', `/admin/agendamentos/${ana.id_agendamento}/remarcar`, { data: terca, hora_inicio: '10:30' }, admin);
  assert.equal(s, 200);
  assert.deepEqual([r.hora_inicio, r.hora_fim, r.status], ['10:30', '11:30', 'CONFIRMADO']);
  assert.equal((await j('POST', `/admin/agendamentos/${ana.id_agendamento}/remarcar`, { data: terca, hora_inicio: '11:00' }, admin))[0], 409); // invadiria a Juliana (11:30)

  // mesmo com STATUS_INICIAL=PENDENTE (regra da cliente), quando é a profissional que remarca o status não muda
  const [sp, rp] = await jp('POST', `/admin/agendamentos/${ana.id_agendamento}/remarcar`, { data: terca, hora_inicio: '10:00' }, admin);
  assert.equal(sp, 200);
  assert.equal(rp.status, 'CONFIRMADO');
});

test('painel: remarcar valida dados, recusa cancelado, id inexistente e exige login de profissional', async () => {
  const [, ag] = await j('POST', '/agendamentos', { id_servico: 4, data: quinta, hora_inicio: '09:00' }, bia);
  const url_ = `/admin/agendamentos/${ag.id_agendamento}/remarcar`;
  assert.equal((await j('POST', url_, { data: quinta, hora_inicio: '09:00' }, admin))[0], 400);   // igual ao atual
  assert.equal((await j('POST', url_, { data: 'x', hora_inicio: '09:30' }, admin))[0], 400);
  assert.equal((await j('POST', url_, { data: quinta, hora_inicio: '09:30' }))[0], 401);          // sem login
  assert.equal((await j('POST', url_, { data: quinta, hora_inicio: '09:30' }, bia))[0], 403);     // token de cliente
  assert.equal((await j('POST', '/admin/agendamentos/99999/remarcar', { data: quinta, hora_inicio: '09:30' }, admin))[0], 404);
  assert.equal((await j('GET', `/admin/agendamentos/${ag.id_agendamento}/disponibilidade`, null, admin))[0], 400); // sem data

  assert.equal((await j('PATCH', `/admin/agendamentos/${ag.id_agendamento}`, { status: 'CANCELADO' }, admin))[0], 200);
  assert.equal((await j('POST', url_, { data: quinta, hora_inicio: '09:30' }, admin))[0], 409);   // cancelado
  assert.equal((await j('GET', `/admin/agendamentos/${ag.id_agendamento}/disponibilidade?data=${quinta}`, null, admin))[0], 409);
});
