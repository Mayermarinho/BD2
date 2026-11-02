// Rotas do painel da profissional (todas exigem login; dados sempre filtrados pela profissional logada).
import { Router } from 'express';
import { agoraNoFuso, dataValida, horaValida } from '../datas.js';
import { gerarRelatorio, resumirClientes } from '../relatorios.js';
import { paraMinutos } from '../slots.js';

const texto = (v, max) => String(v ?? '').trim().slice(0, max);
const somarDias = (data, n) => {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const bad = (res, detalhes) => res.status(400).json({ erro: 'Dados inválidos.', detalhes });
const naoEncontrado = (res, o = 'Registro') => res.status(404).json({ erro: `${o} não encontrado.` });

/** Valida e normaliza os dados de um serviço. Retorna { erros, dados }. */
async function validarServico(repo, corpo = {}) {
  const erros = [];
  const nome = texto(corpo.nome, 100);
  const preco = Number(corpo.preco);
  const duracao = Number(corpo.duracao_minutos);
  const idCategoria = corpo.id_categoria === null || corpo.id_categoria === '' || corpo.id_categoria === undefined ? null : Number(corpo.id_categoria);
  if (nome.length < 2) erros.push('nome obrigatório (mínimo 2 caracteres)');
  if (!Number.isFinite(preco) || preco < 0 || preco > 99999.99) erros.push('preço inválido');
  if (!Number.isInteger(duracao) || duracao < 5 || duracao > 600) erros.push('duração deve ser um número inteiro de 5 a 600 minutos');
  if (idCategoria !== null && (!Number.isInteger(idCategoria) || !(await repo.categoriaExiste(idCategoria)))) erros.push('categoria inexistente');
  return {
    erros,
    dados: {
      nome, descricao: texto(corpo.descricao, 1000) || null, preco: Math.round(preco * 100) / 100,
      duracao_minutos: duracao, id_categoria: idCategoria, ativo: corpo.ativo === undefined ? true : Boolean(corpo.ativo),
    },
  };
}

export function rotasPainel(repo, config) {
  const r = Router();
  const prof = (req) => req.usuario.id_profissional;
  const idDe = (req) => Number.parseInt(req.params.id, 10);

  // ===== Dashboard =====
  r.get('/resumo', async (req, res) => {
    const agora = agoraNoFuso(config.fusoHorario);
    const hoje = agora.data;
    const lista = await repo.agendaDoPeriodo(prof(req), hoje, somarDias(hoje, 30));
    const ativos = lista.filter((a) => a.status !== 'CANCELADO');
    const soma = (itens) => itens.reduce((t, a) => t + Number(a.preco), 0);
    const hojeItens = ativos.filter((a) => a.data_agendamento === hoje);
    const dias = [...Array(7)].map((_, i) => somarDias(hoje, i));
    const semana = ativos.filter((a) => a.data_agendamento <= dias[6]);
    res.json({
      data: hoje,
      hoje: { quantidade: hojeItens.length, previsto: soma(hojeItens) },
      semana: { quantidade: semana.length, previsto: soma(semana) },
      pendentes: lista.filter((a) => a.status === 'PENDENTE').length,
      porDia: dias.map((d) => ({ data: d, quantidade: ativos.filter((a) => a.data_agendamento === d).length })),
      proximos: ativos
        .filter((a) => ['PENDENTE', 'CONFIRMADO'].includes(a.status)
          && (a.data_agendamento > hoje || (a.data_agendamento === hoje && paraMinutos(a.hora_fim) > agora.minutos)))
        .slice(0, 6),
    });
  });

  // ===== Clientes (quem já agendou com a profissional) =====
  const TUDO = ['2000-01-01', '2999-12-31'];
  const semAcento = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  r.get('/clientes', async (req, res) => {
    const busca = semAcento(texto(req.query.busca, 60));
    const digitos = busca.replace(/\D/g, '');
    const [clientes, historico] = await Promise.all([repo.listarClientesDaProfissional(prof(req)), repo.agendaDoPeriodo(prof(req), ...TUDO)]);
    const lista = resumirClientes(clientes, historico, agoraNoFuso(config.fusoHorario).data)
      .filter((c) => !busca || semAcento(c.nome).includes(busca) || semAcento(c.email ?? '').includes(busca)
        || (digitos.length >= 3 && String(c.telefone).replace(/\D/g, '').includes(digitos)));
    res.json(lista);
  });

  r.get('/clientes/:id', async (req, res) => {
    const [clientes, historico] = await Promise.all([repo.listarClientesDaProfissional(prof(req)), repo.agendaDoPeriodo(prof(req), ...TUDO)]);
    const [c] = resumirClientes(clientes.filter((x) => x.id_cliente === idDe(req)), historico, agoraNoFuso(config.fusoHorario).data);
    if (!c) return naoEncontrado(res, 'Cliente');
    const agendamentos = historico.filter((a) => a.id_cliente === c.id_cliente)
      .sort((x, y) => y.data_agendamento.localeCompare(x.data_agendamento) || y.hora_inicio.localeCompare(x.hora_inicio));
    res.json({ ...c, agendamentos });
  });

  // ===== Relatórios: /api/admin/relatorios?inicio=2026-11-01&fim=2026-11-30 =====
  r.get('/relatorios', async (req, res) => {
    const { inicio, fim } = req.query;
    if (!dataValida(inicio) || !dataValida(fim)) return bad(res, ['informe "inicio" e "fim" (AAAA-MM-DD)']);
    if (fim < inicio) return bad(res, ['a data final não pode ser antes da inicial']);
    if (fim > somarDias(inicio, 366)) return bad(res, ['o período pode ter no máximo 366 dias']);
    res.json(gerarRelatorio(await repo.agendaDoPeriodo(prof(req), inicio, fim), inicio, fim));
  });

  // ===== Serviços =====
  r.get('/servicos', async (req, res) => res.json(await repo.listarServicosAdmin(prof(req))));

  r.post('/servicos', async (req, res) => {
    const { erros, dados } = await validarServico(repo, req.body);
    if (erros.length) return bad(res, erros);
    res.status(201).json(await repo.criarServico(prof(req), dados));
  });

  r.put('/servicos/:id', async (req, res) => {
    const { erros, dados } = await validarServico(repo, req.body);
    if (erros.length) return bad(res, erros);
    const s = await repo.atualizarServico(idDe(req), prof(req), dados);
    if (!s) return naoEncontrado(res, 'Serviço');
    res.json(s);
  });

  r.delete('/servicos/:id', async (req, res) => {
    if (!(await repo.excluirServico(idDe(req), prof(req)))) return naoEncontrado(res, 'Serviço');
    res.json({ ok: true });
  });

  // ===== Categorias =====
  r.get('/categorias', async (_req, res) => res.json(await repo.listarCategorias()));

  r.post('/categorias', async (req, res) => {
    const nome = texto(req.body?.nome, 50);
    if (nome.length < 2) return bad(res, ['nome obrigatório (2 a 50 caracteres)']);
    res.status(201).json(await repo.criarCategoria(nome));
  });

  r.put('/categorias/:id', async (req, res) => {
    const nome = texto(req.body?.nome, 50);
    if (nome.length < 2) return bad(res, ['nome obrigatório (2 a 50 caracteres)']);
    const c = await repo.atualizarCategoria(idDe(req), nome);
    if (!c) return naoEncontrado(res, 'Categoria');
    res.json(c);
  });

  r.delete('/categorias/:id', async (req, res) => {
    if (!(await repo.excluirCategoria(idDe(req)))) return naoEncontrado(res, 'Categoria');
    res.json({ ok: true });
  });

  // ===== Horários de atendimento =====
  r.get('/horarios', async (req, res) => res.json(await repo.listarHorarios(prof(req))));

  r.post('/horarios', async (req, res) => {
    const dia = Number(req.body?.dia_semana);
    const { hora_inicio, hora_fim } = req.body ?? {};
    const erros = [];
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) erros.push('dia_semana deve ser de 0 (domingo) a 6 (sábado)');
    if (!horaValida(hora_inicio)) erros.push('hora_inicio inválida (HH:MM)');
    if (!horaValida(hora_fim)) erros.push('hora_fim inválida (HH:MM)');
    if (!erros.length && paraMinutos(hora_fim) <= paraMinutos(hora_inicio)) erros.push('o fim deve ser depois do início');
    if (erros.length) return bad(res, erros);

    const existentes = (await repo.listarHorarios(prof(req))).filter((h) => h.dia_semana === dia);
    const choca = existentes.some((h) => paraMinutos(hora_inicio) < paraMinutos(h.hora_fim) && paraMinutos(hora_fim) > paraMinutos(h.hora_inicio));
    if (choca) return res.status(409).json({ erro: 'Este período se sobrepõe a outro já cadastrado no mesmo dia.' });
    res.status(201).json(await repo.criarHorario(prof(req), { dia_semana: dia, hora_inicio, hora_fim }));
  });

  r.delete('/horarios/:id', async (req, res) => {
    if (!(await repo.excluirHorario(idDe(req), prof(req)))) return naoEncontrado(res, 'Horário');
    res.json({ ok: true });
  });

  // ===== Folgas e feriados =====
  r.get('/bloqueios', async (req, res) => {
    res.json(await repo.listarBloqueios(prof(req), agoraNoFuso(config.fusoHorario).data));
  });

  r.post('/bloqueios', async (req, res) => {
    const { data_inicio } = req.body ?? {};
    const data_fim = req.body?.data_fim || data_inicio;
    const erros = [];
    if (!dataValida(data_inicio)) erros.push('data_inicio inválida (AAAA-MM-DD)');
    if (!dataValida(data_fim)) erros.push('data_fim inválida (AAAA-MM-DD)');
    if (!erros.length && data_fim < data_inicio) erros.push('a data final não pode ser antes da inicial');
    if (erros.length) return bad(res, erros);
    const bloqueio = await repo.criarBloqueio(prof(req), { data_inicio, data_fim, motivo: texto(req.body?.motivo, 255) || null });
    const afetados = await repo.contarAgendamentosAtivos(prof(req), data_inicio, data_fim);
    res.status(201).json({ ...bloqueio, agendamentos_afetados: afetados });
  });

  r.delete('/bloqueios/:id', async (req, res) => {
    if (!(await repo.excluirBloqueio(idDe(req), prof(req)))) return naoEncontrado(res, 'Bloqueio');
    res.json({ ok: true });
  });

  return r;
}
