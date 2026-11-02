// Repositório em memória: mesma interface do MySQL, sem banco.
// Usado nos testes automatizados e no "modo demo" (npm run demo), para o front-end
// poder ser desenvolvido sem MySQL instalado. Os dados somem ao reiniciar.
import bcrypt from 'bcryptjs';
import { agoraNoFuso, proximaData } from '../datas.js';
import { ConflitoError } from '../erros.js';
import { deMinutos, paraMinutos } from '../slots.js';

export function criarRepoMemoria({ fuso = 'America/Sao_Paulo' } = {}) {
  const hoje = agoraNoFuso(fuso).data;
  const proximaTerca = proximaData(2, hoje, 2);

  const db = {
    categorias: [{ id_categoria: 1, nome: 'Cabelo' }, { id_categoria: 2, nome: 'Estética' }, { id_categoria: 3, nome: 'Manicure e Pedicure' }],
    servicos: [
      { id_servico: 1, id_profissional: 1, id_categoria: 1, nome: 'Corte feminino', descricao: 'Corte de cabelo feminino', preco: 60, duracao_minutos: 60, ativo: true },
      { id_servico: 2, id_profissional: 1, id_categoria: 1, nome: 'Escova', descricao: 'Escova modelada', preco: 45, duracao_minutos: 45, ativo: true },
      { id_servico: 3, id_profissional: 1, id_categoria: 1, nome: 'Coloração', descricao: 'Coloração completa', preco: 150, duracao_minutos: 120, ativo: true },
      { id_servico: 4, id_profissional: 1, id_categoria: 2, nome: 'Design de sobrancelha', descricao: 'Design com henna', preco: 50, duracao_minutos: 30, ativo: true },
    ],
    janelas: [[1, '09:00', '18:00'], [2, '09:00', '18:00'], [3, '09:00', '18:00'], [4, '09:00', '18:00'], [5, '09:00', '18:00'], [6, '09:00', '13:00']]
      .map(([dia, hora_inicio, hora_fim], i) => ({ id_horario: i + 1, id_profissional: 1, dia, hora_inicio, hora_fim })),
    bloqueios: [],
    clientes: [
      { id_cliente: 1, nome: 'Ana Paula', telefone: '(18) 98888-2222', email: 'ana@email.com' },
      { id_cliente: 2, nome: 'Juliana Santos', telefone: '(18) 97777-3333', email: 'juliana@email.com' },
      { id_cliente: 3, nome: 'Carla Mendes', telefone: '(18) 96666-4444', email: 'carla@email.com' },
    ],
    agendamentos: [],
    contas: [],
    usuarios: [{ id_usuario: 1, id_profissional: 1, nome: 'Mariana Admin', email: 'admin@mariana.com', senha_hash: bcrypt.hashSync('admin123', 10), perfil: 'ADMIN' }],
    seq: { conta: 0, cliente: 3, agendamento: 0, servico: 4, categoria: 3, horario: 0, bloqueio: 0 },
  };

  db.seq.horario = db.janelas.length;
  const semDigitos = (t) => String(t).replace(/\D/g, '');
  const ativo = (a) => a.status !== 'CANCELADO';
  const sobrepoe = (a, b) => paraMinutos(a.hora_inicio) < paraMinutos(b.hora_fim) && paraMinutos(a.hora_fim) > paraMinutos(b.hora_inicio);

  function inserir(a) { // espelha o trigger trg_impede_conflito_horario
    const novo = { id_agendamento: ++db.seq.agendamento, observacao: null, motivo_cancelamento: null, ...a };
    const conflito = db.agendamentos.some((x) =>
      x.id_profissional === novo.id_profissional && x.data_agendamento === novo.data_agendamento && ativo(x) && sobrepoe(novo, x));
    if (conflito) { db.seq.agendamento--; throw new ConflitoError(); }
    db.agendamentos.push(novo);
    return novo;
  }
  inserir({ id_cliente: 1, id_servico: 1, id_profissional: 1, data_agendamento: proximaTerca, hora_inicio: '10:00', hora_fim: '11:00', preco_cobrado: 60, status: 'CONFIRMADO' });
  inserir({ id_cliente: 2, id_servico: 2, id_profissional: 1, data_agendamento: proximaTerca, hora_inicio: '11:30', hora_fim: '12:15', preco_cobrado: 45, status: 'CONFIRMADO' });

  const leituras = {
    async ping() {},
    async listarServicos() {
      return db.servicos.filter((s) => s.ativo).map((s) => ({
        ...s, categoria: db.categorias.find((c) => c.id_categoria === s.id_categoria)?.nome ?? null,
      })).sort((a, b) => (a.categoria ?? '￿').localeCompare(b.categoria ?? '￿') || a.nome.localeCompare(b.nome));
    },
    async obterServicoAtivo(id) {
      const s = db.servicos.find((x) => x.id_servico === id && x.ativo);
      return s ? { id_servico: s.id_servico, id_profissional: s.id_profissional, duracao_minutos: s.duracao_minutos, preco: s.preco } : null;
    },
    async bloqueioNoDia(idProf, data) {
      return db.bloqueios.find((b) => b.id_profissional === idProf && data >= b.data_inicio && data <= b.data_fim) ?? null;
    },
    async janelasDoDia(idProf, dia) {
      return db.janelas.filter((j) => j.id_profissional === idProf && j.dia === dia)
        .map(({ hora_inicio, hora_fim }) => ({ hora_inicio, hora_fim })).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    },
    async ocupadosDoDia(idProf, data, ignorarId = null) {
      return db.agendamentos.filter((a) => a.id_profissional === idProf && a.data_agendamento === data && ativo(a) && a.id_agendamento !== ignorarId)
        .map(({ hora_inicio, hora_fim }) => ({ hora_inicio, hora_fim }));
    },
    async cancelarPeloCliente({ id, telefone, motivo }) {
      const a = db.agendamentos.find((x) => x.id_agendamento === id);
      const c = a && db.clientes.find((x) => x.id_cliente === a.id_cliente);
      if (!a || semDigitos(c.telefone) !== telefone || !['PENDENTE', 'CONFIRMADO'].includes(a.status)) return false;
      Object.assign(a, { status: 'CANCELADO', motivo_cancelamento: motivo, data_cancelamento: new Date().toISOString() });
      return true;
    },

    // ===== Conta de cliente (opcional) =====
    async buscarContaPorEmail(email) {
      const k = db.contas.find((x) => x.email === email);
      if (!k) return null;
      const c = db.clientes.find((x) => x.id_cliente === k.id_cliente);
      return { id_conta: k.id_conta, id_cliente: k.id_cliente, nome: c.nome, telefone: c.telefone, email: k.email, senha_hash: k.senha_hash };
    },
    async criarConta({ nome, telefone, email, senha_hash }) {
      if (db.contas.some((x) => x.email === email)) throw new ConflitoError('Já existe uma conta com este e-mail.');
      const c = { id_cliente: ++db.seq.cliente, nome, telefone, email };
      db.clientes.push(c);
      const k = { id_conta: ++db.seq.conta, id_cliente: c.id_cliente, email, senha_hash };
      db.contas.push(k);
      return { id_conta: k.id_conta, id_cliente: c.id_cliente, nome, telefone, email };
    },
    async obterPerfilCliente(idCliente) {
      const c = db.clientes.find((x) => x.id_cliente === idCliente);
      const k = db.contas.find((x) => x.id_cliente === idCliente);
      return c && k ? { id_cliente: c.id_cliente, nome: c.nome, telefone: c.telefone, email: k.email } : null;
    },
    async agendamentosDoCliente(idCliente) {
      return db.agendamentos.filter((a) => a.id_cliente === idCliente)
        .sort((a, b) => b.data_agendamento.localeCompare(a.data_agendamento) || b.hora_inicio.localeCompare(a.hora_inicio))
        .map((a) => {
          const s = db.servicos.find((x) => x.id_servico === a.id_servico);
          return { id_agendamento: a.id_agendamento, data_agendamento: a.data_agendamento, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim,
            status: a.status, id_servico: s.id_servico, servico: s.nome, preco: a.preco_cobrado ?? s.preco };
        });
    },
    async cancelarDoCliente({ id, idCliente, motivo }) {
      const a = db.agendamentos.find((x) => x.id_agendamento === id && x.id_cliente === idCliente);
      if (!a || !['PENDENTE', 'CONFIRMADO'].includes(a.status)) return false;
      Object.assign(a, { status: 'CANCELADO', motivo_cancelamento: motivo, data_cancelamento: new Date().toISOString() });
      return true;
    },
    async obterAgendamentoDoCliente(id, idCliente) {
      const a = db.agendamentos.find((x) => x.id_agendamento === id && x.id_cliente === idCliente);
      if (!a) return null;
      const s = db.servicos.find((x) => x.id_servico === a.id_servico);
      return { id_agendamento: a.id_agendamento, id_profissional: a.id_profissional, id_servico: a.id_servico, data_agendamento: a.data_agendamento,
        hora_inicio: a.hora_inicio, hora_fim: a.hora_fim, status: a.status, servico: s.nome, duracao_minutos: s.duracao_minutos, ativo: s.ativo };
    },
    async buscarUsuarioPorEmail(email) { return db.usuarios.find((u) => u.email.toLowerCase() === email) ?? null; },
    async agendaDoPeriodo(idProf, ini, fim) {
      return db.agendamentos.filter((a) => a.id_profissional === idProf && a.data_agendamento >= ini && a.data_agendamento <= fim)
        .sort((a, b) => a.data_agendamento.localeCompare(b.data_agendamento) || a.hora_inicio.localeCompare(b.hora_inicio))
        .map((a) => {
          const c = db.clientes.find((x) => x.id_cliente === a.id_cliente);
          const s = db.servicos.find((x) => x.id_servico === a.id_servico);
          return { id_agendamento: a.id_agendamento, data_agendamento: a.data_agendamento, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim,
            status: a.status, observacao: a.observacao ?? null, id_cliente: c.id_cliente, cliente: c.nome, telefone_cliente: c.telefone,
            id_servico: s.id_servico, servico: s.nome, preco: a.preco_cobrado ?? s.preco };
        });
    },
    async listarClientesDaProfissional(idProf) {
      const ids = new Set(db.agendamentos.filter((a) => a.id_profissional === idProf).map((a) => a.id_cliente));
      return db.clientes.filter((c) => ids.has(c.id_cliente))
        .map((c) => ({ id_cliente: c.id_cliente, nome: c.nome, telefone: c.telefone, email: c.email ?? null, tem_conta: db.contas.some((k) => k.id_cliente === c.id_cliente) }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    },
    async statusDoAgendamento(id, idProf) {
      return db.agendamentos.find((a) => a.id_agendamento === id && a.id_profissional === idProf)?.status ?? null;
    },
    async atualizarStatus({ id, status, motivo }) {
      Object.assign(db.agendamentos.find((a) => a.id_agendamento === id), { status, motivo_cancelamento: motivo });
    },

    // ===== Painel =====
    async listarServicosAdmin(idProf) {
      return db.servicos.filter((s) => s.id_profissional === idProf)
        .map((s) => ({ ...s, categoria: db.categorias.find((c) => c.id_categoria === s.id_categoria)?.nome ?? null }))
        .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));
    },
    async obterServicoAdmin(id, idProf) {
      const s = db.servicos.find((x) => x.id_servico === id && x.id_profissional === idProf);
      return s ? { ...s, categoria: db.categorias.find((c) => c.id_categoria === s.id_categoria)?.nome ?? null } : null;
    },
    async criarServico(idProf, d) {
      const s = { id_servico: ++db.seq.servico, id_profissional: idProf, ...d };
      db.servicos.push(s);
      return this.obterServicoAdmin(s.id_servico, idProf);
    },
    async atualizarServico(id, idProf, d) {
      const s = db.servicos.find((x) => x.id_servico === id && x.id_profissional === idProf);
      if (!s) return null;
      Object.assign(s, d);
      return this.obterServicoAdmin(id, idProf);
    },
    async excluirServico(id, idProf) {
      const i = db.servicos.findIndex((x) => x.id_servico === id && x.id_profissional === idProf);
      if (i < 0) return false;
      if (db.agendamentos.some((a) => a.id_servico === id)) throw new ConflitoError('Este serviço já tem agendamentos. Desative-o em vez de excluir.');
      db.servicos.splice(i, 1);
      return true;
    },
    async listarCategorias() {
      return db.categorias.map((c) => ({ ...c, qtd_servicos: db.servicos.filter((s) => s.id_categoria === c.id_categoria).length }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    },
    async categoriaExiste(id) { return db.categorias.some((c) => c.id_categoria === id); },
    async criarCategoria(nome) {
      if (db.categorias.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) throw new ConflitoError('Já existe uma categoria com esse nome.');
      const c = { id_categoria: ++db.seq.categoria, nome };
      db.categorias.push(c);
      return { ...c, qtd_servicos: 0 };
    },
    async atualizarCategoria(id, nome) {
      const c = db.categorias.find((x) => x.id_categoria === id);
      if (!c) return null;
      if (db.categorias.some((x) => x.id_categoria !== id && x.nome.toLowerCase() === nome.toLowerCase())) throw new ConflitoError('Já existe uma categoria com esse nome.');
      c.nome = nome;
      return { id_categoria: id, nome };
    },
    async excluirCategoria(id) {
      const i = db.categorias.findIndex((x) => x.id_categoria === id);
      if (i < 0) return false;
      db.categorias.splice(i, 1);
      db.servicos.forEach((s) => { if (s.id_categoria === id) s.id_categoria = null; });
      return true;
    },
    async listarHorarios(idProf) {
      return db.janelas.filter((j) => j.id_profissional === idProf)
        .map((j) => ({ id_horario: j.id_horario, dia_semana: j.dia, hora_inicio: j.hora_inicio, hora_fim: j.hora_fim }))
        .sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio));
    },
    async criarHorario(idProf, { dia_semana, hora_inicio, hora_fim }) {
      const j = { id_horario: ++db.seq.horario, id_profissional: idProf, dia: dia_semana, hora_inicio, hora_fim };
      db.janelas.push(j);
      return { id_horario: j.id_horario, dia_semana, hora_inicio, hora_fim };
    },
    async excluirHorario(id, idProf) {
      const i = db.janelas.findIndex((j) => j.id_horario === id && j.id_profissional === idProf);
      if (i < 0) return false;
      db.janelas.splice(i, 1);
      return true;
    },
    async listarBloqueios(idProf, aPartirDe) {
      return db.bloqueios.filter((b) => b.id_profissional === idProf && b.data_fim >= aPartirDe)
        .map(({ id_bloqueio, data_inicio, data_fim, motivo }) => ({ id_bloqueio, data_inicio, data_fim, motivo }))
        .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
    },
    async criarBloqueio(idProf, { data_inicio, data_fim, motivo }) {
      const b = { id_bloqueio: ++db.seq.bloqueio, id_profissional: idProf, data_inicio, data_fim, motivo };
      db.bloqueios.push(b);
      return { id_bloqueio: b.id_bloqueio, data_inicio, data_fim, motivo };
    },
    async excluirBloqueio(id, idProf) {
      const i = db.bloqueios.findIndex((b) => b.id_bloqueio === id && b.id_profissional === idProf);
      if (i < 0) return false;
      db.bloqueios.splice(i, 1);
      return true;
    },
    async contarAgendamentosAtivos(idProf, ini, fim) {
      return db.agendamentos.filter((a) => a.id_profissional === idProf && a.data_agendamento >= ini && a.data_agendamento <= fim
        && ['PENDENTE', 'CONFIRMADO'].includes(a.status)).length;
    },
    async travarProfissional() {},
    async upsertCliente({ nome, telefone, email }) {
      const c = db.clientes.find((x) => semDigitos(x.telefone) === telefone && !db.contas.some((k) => k.id_cliente === x.id_cliente));
      if (c) { c.email ??= email; return c.id_cliente; }
      db.clientes.push({ id_cliente: ++db.seq.cliente, nome, telefone, email });
      return db.seq.cliente;
    },
    async remarcarAgendamento({ id, data, hora_inicio, hora_fim, status }) {
      const a = db.agendamentos.find((x) => x.id_agendamento === id);
      if (!a || !['PENDENTE', 'CONFIRMADO'].includes(a.status)) throw new ConflitoError('Este agendamento não pode mais ser remarcado.');
      const novo = { ...a, data_agendamento: data, hora_inicio, hora_fim };
      const conflito = db.agendamentos.some((x) => x.id_agendamento !== id && x.id_profissional === a.id_profissional
        && x.data_agendamento === data && ativo(x) && sobrepoe(novo, x)); // espelha trg_impede_conflito_horario_update
      if (conflito) throw new ConflitoError();
      Object.assign(a, { data_agendamento: data, hora_inicio, hora_fim, status });
      return { id_agendamento: id, data_agendamento: data, hora_inicio, hora_fim, status };
    },
    async inserirAgendamento(a) {
      const n = inserir({ id_cliente: a.id_cliente, id_servico: a.id_servico, id_profissional: a.id_profissional,
        data_agendamento: a.data, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim, preco_cobrado: a.preco_cobrado,
        status: a.status, observacao: a.observacao });
      return { id_agendamento: n.id_agendamento, data_agendamento: n.data_agendamento, hora_inicio: n.hora_inicio, hora_fim: n.hora_fim, status: n.status, preco_cobrado: n.preco_cobrado };
    },
  };

  let fila = Promise.resolve(); // uma transação por vez (equivale ao FOR UPDATE)
  return {
    ...leituras,
    transacao(fn) {
      const exec = fila.then(() => fn(leituras));
      fila = exec.catch(() => {});
      return exec;
    },
    _db: db,
  };
}
