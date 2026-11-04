import { createSign } from 'node:crypto';

const API = 'https://sheets.googleapis.com/v4/spreadsheets/';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ESCOPO = 'https://www.googleapis.com/auth/spreadsheets';
const COLUNAS = [
  'ID do agendamento', 'Data', 'Início', 'Fim', 'Cliente',
  'Serviço', 'Profissional', 'Valor', 'Status',
];

const base64url = (valor) => Buffer.from(valor).toString('base64url');
const codificarRange = (range) => encodeURIComponent(range);

export function criarClienteGoogleSheets(config) {
  let tokenCache = null;
  let tokenExpiraEm = 0;

  async function obterToken() {
    if (tokenCache && Date.now() < tokenExpiraEm - 60_000) return tokenCache;

    const agora = Math.floor(Date.now() / 1000);
    const cabecalho = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({
      iss: config.googleServiceAccountEmail,
      scope: ESCOPO,
      aud: TOKEN_URL,
      iat: agora,
      exp: agora + 3600,
    }));
    const unsigned = cabecalho + '.' + payload;
    const chave = config.googleServiceAccountPrivateKey.replace(/\\n/g, '\n');
    const assinatura = createSign('RSA-SHA256').update(unsigned).sign(chave, 'base64url');
    const assertion = unsigned + '.' + assinatura;

    const resposta = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error('Falha ao autenticar no Google: ' + (dados.error_description || dados.error || resposta.status));
    tokenCache = dados.access_token;
    tokenExpiraEm = Date.now() + Number(dados.expires_in || 3600) * 1000;
    return tokenCache;
  }

  async function requisitar(url, opcoes = {}) {
    const token = await obterToken();
    const resposta = await fetch(url, {
      ...opcoes,
      headers: {
        authorization: 'Bearer ' + token,
        'content-type': 'application/json',
        ...(opcoes.headers || {}),
      },
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      const mensagem = dados.error?.message || resposta.statusText || 'Erro na API Google Sheets';
      throw new Error('Google Sheets (' + resposta.status + '): ' + mensagem);
    }
    return dados;
  }

  const base = API + encodeURIComponent(config.googleSheetsSpreadsheetId);
  const range = (r) => base + '/values/' + codificarRange("'Agendamentos'!" + r);

  async function garantirCabecalho() {
    const dados = await requisitar(range('A1:I1'));
    if (dados.values?.length) return;
    await requisitar(range('A1:I1') + '?valueInputOption=RAW', {
      method: 'PUT',
      body: JSON.stringify({ values: [COLUNAS] }),
    });
  }

  async function salvarAgendamento(agendamento) {
    await garantirCabecalho();
    const ids = await requisitar(range('A:A'));
    const linhas = ids.values || [];
    const indice = linhas.findIndex((linha, i) => i > 0 && String(linha[0]) === String(agendamento.id_agendamento));
    const valores = [[
      String(agendamento.id_agendamento),
      agendamento.data_agendamento,
      agendamento.hora_inicio,
      agendamento.hora_fim,
      agendamento.cliente,
      agendamento.servico,
      agendamento.profissional,
      Number(agendamento.preco),
      agendamento.status,
    ]];

    if (indice >= 0) {
      const numeroLinha = indice + 1;
      await requisitar(range('A' + numeroLinha + ':I' + numeroLinha) + '?valueInputOption=RAW', {
        method: 'PUT',
        body: JSON.stringify({ values: valores }),
      });
      return 'atualizado';
    }

    await requisitar(range('A:I') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', {
      method: 'POST',
      body: JSON.stringify({ values: valores }),
    });
    return 'incluido';
  }

  return { salvarAgendamento };
}
