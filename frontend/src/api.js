// Cliente da API. Em desenvolvimento o Vite repassa /api para o backend.
async function req(caminho, { method = 'GET', corpo, token } = {}) {
  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
  }
  let dados = null;
  try { dados = await resposta.json(); } catch { /* corpo vazio */ }
  if (!resposta.ok) {
    const semApi = !dados && resposta.status >= 500; // proxy sem resposta da API
    const e = new Error(dados?.erro || (semApi
      ? 'Servidor indisponível. Confira se a API está rodando (cd backend && npm run demo ou npm run dev).'
      : 'Ocorreu um erro. Tente novamente.'));
    e.status = resposta.status;
    e.detalhes = dados?.detalhes;
    throw e;
  }
  return dados;
}

export const api = {
  servicos: () => req('/servicos'),
  disponibilidade: (servico, data) => req(`/disponibilidade?servico=${servico}&data=${data}`),
  agendar: (corpo, token) => req('/agendamentos', { method: 'POST', corpo, token }),
  cadastro: (dados) => req('/clientes/cadastro', { method: 'POST', corpo: dados }),
  cliente: (token) => ({
    agendamentos: () => req('/cliente/agendamentos', { token }),
    cancelar: (id, motivo) => req(`/cliente/agendamentos/${id}/cancelar`, { method: 'POST', corpo: { motivo }, token }),
    horariosParaRemarcar: (id, data) => req(`/cliente/agendamentos/${id}/disponibilidade?data=${data}`, { token }),
    remarcar: (id, data, hora_inicio) => req(`/cliente/agendamentos/${id}/remarcar`, { method: 'POST', corpo: { data, hora_inicio }, token }),
  }),
  cancelar: (id, telefone, motivo) => req(`/agendamentos/${id}/cancelar`, { method: 'POST', corpo: { telefone, motivo } }),
  login: (email, senha) => req('/auth/login', { method: 'POST', corpo: { email, senha } }),
  agenda: (token, inicio, fim) => req(`/admin/agenda?inicio=${inicio}&fim=${fim}`, { token }),
  admin: (token) => ({
    resumo: () => req('/admin/resumo', { token }),
    clientes: (busca = '') => req(`/admin/clientes?busca=${encodeURIComponent(busca)}`, { token }),
    cliente: (id) => req(`/admin/clientes/${id}`, { token }),
    relatorio: (inicio, fim) => req(`/admin/relatorios?inicio=${inicio}&fim=${fim}`, { token }),
    agenda: (inicio, fim) => req(`/admin/agenda?inicio=${inicio}&fim=${fim}`, { token }),
    mudarStatus: (id, status, motivo) => req(`/admin/agendamentos/${id}`, { method: 'PATCH', corpo: { status, motivo_cancelamento: motivo }, token }),
    servicos: () => req('/admin/servicos', { token }),
    salvarServico: (dados, id) => req(id ? `/admin/servicos/${id}` : '/admin/servicos', { method: id ? 'PUT' : 'POST', corpo: dados, token }),
    excluirServico: (id) => req(`/admin/servicos/${id}`, { method: 'DELETE', token }),
    categorias: () => req('/admin/categorias', { token }),
    salvarCategoria: (nome, id) => req(id ? `/admin/categorias/${id}` : '/admin/categorias', { method: id ? 'PUT' : 'POST', corpo: { nome }, token }),
    excluirCategoria: (id) => req(`/admin/categorias/${id}`, { method: 'DELETE', token }),
    horarios: () => req('/admin/horarios', { token }),
    criarHorario: (dados) => req('/admin/horarios', { method: 'POST', corpo: dados, token }),
    excluirHorario: (id) => req(`/admin/horarios/${id}`, { method: 'DELETE', token }),
    bloqueios: () => req('/admin/bloqueios', { token }),
    criarBloqueio: (dados) => req('/admin/bloqueios', { method: 'POST', corpo: dados, token }),
    excluirBloqueio: (id) => req(`/admin/bloqueios/${id}`, { method: 'DELETE', token }),
  }),
  mudarStatus: (token, id, status, motivo) =>
    req(`/admin/agendamentos/${id}`, { method: 'PATCH', corpo: { status, motivo_cancelamento: motivo }, token }),
};
