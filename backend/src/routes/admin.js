import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { assinarToken, assinarTokenCliente, exigirLogin } from '../auth.js';
import { dataValida } from '../datas.js';
import { rotasPainel } from './painel.js';

const TRANSICOES = {
  PENDENTE: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: [],
  CANCELADO: [],
};

export function rotasAdmin(repo, config) {
  const r = Router();

  const limiteLogin = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

  r.post('/auth/login', limiteLogin, async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const senha = String(req.body?.senha ?? '');
    const u = await repo.buscarUsuarioPorEmail(email);
    if (u && (await bcrypt.compare(senha, u.senha_hash))) {
      return res.json({ token: assinarToken(u, config.jwtSecret), usuario: { nome: u.nome, email: u.email, perfil: u.perfil, tipo: 'admin' } });
    }
    // Login único: se não for a profissional, tenta conta de cliente
    const conta = await repo.buscarContaPorEmail(email);
    if (conta && (await bcrypt.compare(senha, conta.senha_hash))) {
      return res.json({ token: assinarTokenCliente(conta, config.jwtSecret), usuario: { nome: conta.nome, email: conta.email, telefone: conta.telefone, perfil: 'CLIENTE', tipo: 'cliente' } });
    }
    res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  });

  const protegido = Router();
  protegido.use(exigirLogin(config.jwtSecret, 'admin'));
  protegido.use(rotasPainel(repo, config));

  // Estado da fila de sincronização Google Sheets (não expõe credenciais).
  protegido.get('/integracoes/google-sheets/status', async (req, res) => {
    const fila = repo.resumoFilaSheets
      ? await repo.resumoFilaSheets(req.usuario.id_profissional)
      : { pendentes: 0, com_erro: 0 };
    res.json({ habilitada: Boolean(config.googleSheetsHabilitado), ...fila });
  });

  // Agenda num período: /api/admin/agenda?inicio=2026-10-05&fim=2026-10-11
  protegido.get('/agenda', async (req, res) => {
    const { inicio, fim = inicio } = req.query;
    if (!dataValida(inicio) || !dataValida(fim)) return res.status(400).json({ erro: 'Informe "inicio" e "fim" (AAAA-MM-DD).' });
    const rows = await repo.agendaDoPeriodo(req.usuario.id_profissional, inicio, fim);
    res.json(rows);
  });

  // Muda status: confirmar, concluir ou cancelar (com motivo)
  protegido.patch('/agendamentos/:id', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const novo = req.body?.status;
    if (!Number.isInteger(id) || !Object.keys(TRANSICOES).includes(novo)) {
      return res.status(400).json({ erro: 'Informe um status válido.' });
    }
    const atual = await repo.statusDoAgendamento(id, req.usuario.id_profissional);
    if (!atual) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    if (!TRANSICOES[atual].includes(novo)) {
      return res.status(409).json({ erro: `Não é possível mudar de ${atual} para ${novo}.` });
    }
    const motivo = novo === 'CANCELADO' ? String(req.body?.motivo_cancelamento ?? 'Cancelado pela profissional').slice(0, 255) : null;
    await repo.transacao(async (tx) => {
      await tx.atualizarStatus({ id, status: novo, motivo });
      await tx.registrarEventoSheets?.({ id_profissional: req.usuario.id_profissional, id_agendamento: id });
    });
    res.json({ ok: true });
  });

  r.use('/admin', protegido);
  return r;
}
