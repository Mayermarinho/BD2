// Verificação automática do sistema contra o banco configurado no .env (MySQL) ou em memória (--demo).
//
//   npm run verificar         -> usa o MySQL do .env (DATABASE_URL)
//   npm run verificar:demo    -> usa dados em memória (não precisa de banco)
//
// Sobe a API dentro do próprio script, executa o roteiro (serviço, horários, agendamento, conflito,
// concorrência, trigger, cancelamento, folga, conta de cliente) e mostra OK / FALHOU em cada passo.
// O resultado também é salvo em backend/resultado-verificacao.txt (sem senhas), para anexar ao relatório.
//
// No MySQL ele grava dados de teste marcados com "[TESTE]". Ao final cancela os agendamentos e desativa o
// serviço de teste; as contas de cliente de teste (e-mails teste-...@exemplo.com) permanecem no banco.
import { writeFileSync } from 'node:fs';
import { criarApp } from '../src/app.js';
import { config as base } from '../src/config.js';
import { agoraNoFuso, proximaData } from '../src/datas.js';
import { criarPool } from '../src/db.js';
import { criarRepoMemoria } from '../src/repos/memoria.js';
import { criarRepoMysql } from '../src/repos/mysql.js';
import { somarMinutos } from '../src/slots.js';

const demo = base.modoDemo;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mariana.com';
const ADMIN_SENHA = process.env.ADMIN_SENHA || 'admin123';
const config = { ...base, jwtSecret: base.jwtSecret || (demo ? 'segredo-somente-para-verificacao-123' : undefined) };

let pool = null;
let repo;
if (demo) {
  repo = criarRepoMemoria({ fuso: config.fusoHorario });
} else {
  pool = criarPool(config.databaseUrl, { ssl: config.dbSsl });
  repo = criarRepoMysql(pool);
}

const linhas = [];
let falhas = 0;
const registrar = (n, titulo, ok, detalhe = '') => {
  if (!ok) falhas += 1;
  const l = `${String(n).padStart(2)}. ${ok ? 'OK    ' : 'FALHOU'}  ${titulo}${detalhe ? `  -> ${detalhe}` : ''}`;
  linhas.push(l);
  console.log(l);
};
let contador = 0;
async function passo(titulo, fn) {
  contador += 1;
  try {
    const r = await fn();
    registrar(contador, titulo, r === undefined ? true : Boolean(r?.ok ?? r), r?.detalhe);
  } catch (e) {
    registrar(contador, titulo, false, e?.message ?? String(e));
  }
}
const confere = (cond, detalhe) => ({ ok: Boolean(cond), detalhe: cond ? '' : detalhe });

let url; let token = null;
const j = async (metodo, caminho, corpo, tk = token) => {
  const r = await fetch(url + caminho, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(tk ? { authorization: `Bearer ${tk}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let b = null;
  try { b = await r.json(); } catch { /* sem corpo */ }
  return [r.status, b];
};

const hoje = agoraNoFuso(config.fusoHorario).data;
const quarta = proximaData(3, hoje, 14); // quarta-feira, pelo menos 14 dias à frente
const sufixo = Date.now().toString().slice(-8);
const telefone = (n) => `1990${sufixo.slice(-4)}${String(n).padStart(3, '0')}`.slice(0, 11);

const srv = criarApp(repo, config).listen(0);
url = `http://localhost:${srv.address().port}/api`;

const dados = { idServico: null, idHorario: null, ag: [], horarios: [], tokenCliente: null };

async function encerrar(aviso = '') {
  let versao = '';
  if (pool) {
    try { versao = (await pool.query('SELECT VERSION() AS v'))[0][0].v; } catch { /* ignora */ }
  }
  const resumo = falhas === 0 ? `TUDO CERTO: ${contador} verificações OK.` : `ATENÇÃO: ${falhas} de ${contador} verificações FALHARAM.`;
  console.log(`\n${aviso ? `${aviso}\n\n` : ''}${resumo}\n`);
  const cab = [
    'Verificação do Sistema de Agendamento',
    `Data/hora: ${new Date().toLocaleString('pt-BR', { timeZone: config.fusoHorario })}`,
    `Modo: ${demo ? 'DEMO (memória, sem banco)' : `MySQL ${versao}`}`,
    `Node: ${process.version}`,
    `Data usada nos testes: ${quarta}`,
    '',
  ];
  writeFileSync(new URL('../resultado-verificacao.txt', import.meta.url), `${[...cab, ...linhas, '', ...(aviso ? [aviso, ''] : []), resumo].join('\n')}\n`);
  console.log('Resultado salvo em backend/resultado-verificacao.txt');
  srv.close();
  if (pool) await pool.end();
  process.exit(falhas === 0 ? 0 : 1);
}

console.log(`\nVerificação (${demo ? 'MODO DEMO, em memória' : 'MySQL do .env'}) - data de teste: ${quarta}\n`);

await passo('API responde e o banco está acessível (/api/saude)', async () => {
  const [s, b] = await j('GET', '/saude', null, null);
  return confere(s === 200 && b?.ok === true, `status ${s}`);
});

await passo(`Login da profissional (${ADMIN_EMAIL})`, async () => {
  const [s, b] = await j('POST', '/auth/login', { email: ADMIN_EMAIL, senha: ADMIN_SENHA }, null);
  token = b?.token ?? null;
  return confere(s === 200 && token, `status ${s} (rode 03_dev_admin.sql ou informe ADMIN_EMAIL/ADMIN_SENHA)`);
});

if (!token) {
  await encerrar(
    'PARADO: o login da profissional falhou, então os demais passos (que dependem do painel) foram cancelados.\n'
    + `Usuário tentado: ${ADMIN_EMAIL}. A senha usada foi a de ADMIN_SENHA no .env (ou "admin123" se não existir).\n`
    + 'Como resolver: abra backend\\.env e acrescente as linhas ADMIN_EMAIL=... e ADMIN_SENHA=... com a senha ATUAL do painel;\n'
    + 'ou, se nunca rodou o script 03_dev_admin.sql, rode-o para usar a senha de teste admin123. Depois rode "npm run verificar" de novo.',
  );
}

await passo('Painel exige login (sem token = 401)', async () => {
  const [s] = await j('GET', '/admin/servicos', null, null);
  return confere(s === 401, `status ${s}`);
});

await passo('Criar serviço de teste (60 min) e vê-lo no site', async () => {
  const [s, b] = await j('POST', '/admin/servicos', { nome: `[TESTE] Verificação ${sufixo}`, descricao: 'Criado pelo script de verificação', preco: 1, duracao_minutos: 60 });
  dados.idServico = b?.id_servico;
  const [, lista] = await j('GET', '/servicos', null, null);
  return confere(s === 201 && lista?.some((x) => x.id_servico === dados.idServico), `status ${s}`);
});

await passo('Serviço inválido é recusado (preço negativo, duração 0)', async () => {
  const [a] = await j('POST', '/admin/servicos', { nome: 'X', preco: -1, duracao_minutos: 60 });
  const [b] = await j('POST', '/admin/servicos', { nome: 'Teste', preco: 10, duracao_minutos: 0 });
  return confere(a === 400 && b === 400, `status ${a} e ${b}`);
});

await passo('Horário de atendimento na quarta (usa o existente ou cria 09:00-18:00)', async () => {
  const [, lista] = await j('GET', '/admin/horarios');
  if (!lista?.some((h) => Number(h.dia_semana) === 3)) {
    const [s, h] = await j('POST', '/admin/horarios', { dia_semana: 3, hora_inicio: '09:00', hora_fim: '18:00' });
    dados.idHorario = h?.id_horario;
    return confere(s === 201, `status ${s}`);
  }
  return { ok: true };
});

await passo('Horário sobreposto é recusado (409) e fim antes do início é recusado (400)', async () => {
  const [, lista] = await j('GET', '/admin/horarios');
  const h = lista.find((x) => Number(x.dia_semana) === 3);
  const [a] = await j('POST', '/admin/horarios', { dia_semana: 3, hora_inicio: String(h.hora_inicio).slice(0, 5), hora_fim: String(h.hora_fim).slice(0, 5) });
  const [b] = await j('POST', '/admin/horarios', { dia_semana: 3, hora_inicio: '10:00', hora_fim: '09:00' });
  return confere(a === 409 && b === 400, `status ${a} e ${b}`);
});

await passo('Site oferece horários livres na data de teste', async () => {
  const [s, b] = await j('GET', `/disponibilidade?servico=${dados.idServico}&data=${quarta}`, null, null);
  dados.horarios = b?.horarios ?? [];
  return confere(s === 200 && dados.horarios.length >= 3, `status ${s}, ${dados.horarios.length} horários (precisa de pelo menos 3)`);
});

const A = () => dados.horarios[0];
await passo('Agendar sem conta (cliente do formulário) -> 201', async () => {
  const [s, b] = await j('POST', '/agendamentos', { id_servico: dados.idServico, data: quarta, hora_inicio: A(), cliente: { nome: 'Cliente Teste', telefone: telefone(1) } }, null);
  dados.ag.push(b?.id_agendamento);
  return confere(s === 201 && b?.id_agendamento, `status ${s} ${JSON.stringify(b)}`);
});

await passo('O horário agendado (e o que ele cobre) some das opções', async () => {
  const [, b] = await j('GET', `/disponibilidade?servico=${dados.idServico}&data=${quarta}`, null, null);
  const bloqueados = [A(), somarMinutos(A(), 30)];
  const ok = bloqueados.every((h) => !b.horarios.includes(h));
  return confere(ok, `ainda aparecem: ${bloqueados.filter((h) => b.horarios.includes(h)).join(', ')}`);
});

await passo('Mesmo horário de novo é recusado (409)', async () => {
  const [s] = await j('POST', '/agendamentos', { id_servico: dados.idServico, data: quarta, hora_inicio: A(), cliente: { nome: 'Outra Pessoa', telefone: telefone(2) } }, null);
  return confere(s === 409, `status ${s}`);
});

await passo('Horário que invade o agendamento (30 min depois) também é recusado (409)', async () => {
  const [s] = await j('POST', '/agendamentos', { id_servico: dados.idServico, data: quarta, hora_inicio: somarMinutos(A(), 30), cliente: { nome: 'Outra Pessoa', telefone: telefone(2) } }, null);
  return confere(s === 409, `status ${s}`);
});

await passo('Dados inválidos no agendamento (telefone curto, e-mail ruim) -> 400', async () => {
  const [s] = await j('POST', '/agendamentos', { id_servico: dados.idServico, data: quarta, hora_inicio: dados.horarios.at(-1), cliente: { nome: 'A', telefone: '123', email: 'x' } }, null);
  return confere(s === 400, `status ${s}`);
});

await passo('CONCORRÊNCIA: 6 pedidos simultâneos para o mesmo horário -> exatamente 1 vence', async () => {
  const alvo = dados.horarios.at(-1);
  const res = await Promise.all(Array.from({ length: 6 }, (_, i) => j('POST', '/agendamentos', {
    id_servico: dados.idServico, data: quarta, hora_inicio: alvo, cliente: { nome: `Concorrente ${i + 1}`, telefone: telefone(10 + i) },
  }, null)));
  const ok = res.filter(([s]) => s === 201);
  const conflitos = res.filter(([s]) => s === 409);
  ok.forEach(([, b]) => dados.ag.push(b.id_agendamento));
  return confere(ok.length === 1 && conflitos.length === 5, `201: ${ok.length}, 409: ${conflitos.length}, outros: ${res.map(([s]) => s).join(',')}`);
});

if (pool) {
  await passo('TRIGGER do banco: inserir direto um agendamento sobreposto é bloqueado (erro 1644)', async () => {
    const [[ag]] = await pool.query('SELECT id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim FROM agendamento WHERE id_agendamento = ?', [dados.ag[0]]);
    try {
      const [r] = await pool.query(
        "INSERT INTO agendamento (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, status) VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMADO')",
        [ag.id_cliente, ag.id_servico, ag.id_profissional, ag.data_agendamento, ag.hora_inicio, ag.hora_fim],
      );
      await pool.query('DELETE FROM agendamento WHERE id_agendamento = ?', [r.insertId]);
      return confere(false, 'o banco ACEITOU o agendamento sobreposto (trigger ausente ou inativo)');
    } catch (e) {
      return confere(e.errno === 1644 && /Conflito/i.test(e.sqlMessage ?? ''), `erro ${e.errno}: ${e.sqlMessage}`);
    }
  });
}

await passo('Agenda da profissional lista o agendamento; confirmar/concluir funciona', async () => {
  const [s, lista] = await j('GET', `/admin/agenda?inicio=${quarta}&fim=${quarta}`);
  const achou = lista?.some((a) => Number(a.id_agendamento) === Number(dados.ag[0]));
  const [p] = await j('PATCH', `/admin/agendamentos/${dados.ag.at(-1)}`, { status: 'CONCLUIDO' });
  return confere(s === 200 && achou && p === 200, `agenda ${s}, achou=${achou}, concluir ${p}`);
});

await passo('Cancelar com telefone errado é recusado (404); com o telefone certo funciona (200)', async () => {
  const [a] = await j('POST', `/agendamentos/${dados.ag[0]}/cancelar`, { telefone: '18900000000' }, null);
  const [b] = await j('POST', `/agendamentos/${dados.ag[0]}/cancelar`, { telefone: telefone(1) }, null);
  return confere(a === 404 && b === 200, `status ${a} e ${b}`);
});

await passo('Horário cancelado volta a ficar livre', async () => {
  const [, b] = await j('GET', `/disponibilidade?servico=${dados.idServico}&data=${quarta}`, null, null);
  return confere(b.horarios.includes(A()), 'o horário não voltou');
});

await passo('Folga no dia: sem horários e novo agendamento recusado; remover libera de novo', async () => {
  const [s, f] = await j('POST', '/admin/bloqueios', { data_inicio: quarta, motivo: '[TESTE] folga' });
  const [, d] = await j('GET', `/disponibilidade?servico=${dados.idServico}&data=${quarta}`, null, null);
  const [r] = await j('POST', '/agendamentos', { id_servico: dados.idServico, data: quarta, hora_inicio: A(), cliente: { nome: 'Cliente Teste', telefone: telefone(3) } }, null);
  const [x] = await j('DELETE', `/admin/bloqueios/${f?.id_bloqueio}`);
  const [, d2] = await j('GET', `/disponibilidade?servico=${dados.idServico}&data=${quarta}`, null, null);
  return confere(s === 201 && d.horarios.length === 0 && r === 409 && x === 200 && d2.horarios.length > 0, `criar ${s}, livres ${d?.horarios?.length}, agendar ${r}, remover ${x}, livres depois ${d2?.horarios?.length}`);
});

await passo('Serviço com agendamentos não pode ser excluído (409)', async () => {
  const [s] = await j('DELETE', `/admin/servicos/${dados.idServico}`);
  return confere(s === 409, `status ${s}`);
});

const email = `teste-${sufixo}@exemplo.com`;
await passo('Conta de cliente: cadastro (201) e e-mail repetido recusado (409)', async () => {
  const corpo = { nome: 'Cliente Conta Teste', email, telefone: telefone(20), senha: 'senha-de-teste-123' };
  const [s, b] = await j('POST', '/clientes/cadastro', corpo, null);
  dados.tokenCliente = b?.token;
  const [r] = await j('POST', '/clientes/cadastro', corpo, null);
  return confere(s === 201 && dados.tokenCliente && r === 409, `cadastro ${s}, repetido ${r}`);
});

await passo('Conta de cliente: login, agendar logada, listar e cancelar', async () => {
  const [l, b] = await j('POST', '/auth/login', { email, senha: 'senha-de-teste-123' }, null);
  const tk = b?.token;
  const [s, ag] = await j('POST', '/agendamentos', { id_servico: dados.idServico, data: quarta, hora_inicio: A() }, tk);
  if (ag?.id_agendamento) dados.ag.push(ag.id_agendamento);
  const [, minhas] = await j('GET', '/cliente/agendamentos', null, tk);
  const achou = minhas?.some((x) => Number(x.id_agendamento) === Number(ag?.id_agendamento));
  const [c] = await j('POST', `/cliente/agendamentos/${ag?.id_agendamento}/cancelar`, {}, tk);
  const [adm] = await j('GET', '/admin/servicos', null, tk); // token de cliente não acessa o painel
  return confere(l === 200 && s === 201 && achou && c === 200 && (adm === 401 || adm === 403), `login ${l}, agendar ${s}, lista ${achou}, cancelar ${c}, painel com token de cliente ${adm}`);
});

// Limpeza: cancela o que ficou ativo, desativa o serviço e remove o horário criado pelo script
for (const id of dados.ag.filter(Boolean)) {
  await j('PATCH', `/admin/agendamentos/${id}`, { status: 'CANCELADO', motivo_cancelamento: '[TESTE] limpeza' });
}
if (dados.idServico) {
  const [, svc] = await j('GET', '/admin/servicos');
  const s = svc?.find((x) => x.id_servico === dados.idServico);
  if (s) await j('PUT', `/admin/servicos/${dados.idServico}`, { ...s, ativo: false });
}
if (dados.idHorario) await j('DELETE', `/admin/horarios/${dados.idHorario}`);

await encerrar();
