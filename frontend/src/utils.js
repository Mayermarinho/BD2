const FUSO = 'America/Sao_Paulo';

/** Data de hoje em São Paulo: "AAAA-MM-DD" */
export function hojeSP() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function somarDias(data, dias) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** "2026-10-06" -> "terça-feira, 06/10/2026" */
export function dataExtenso(data) {
  const d = new Date(`${data}T12:00:00Z`);
  const dia = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long' }).format(d);
  return `${dia}, ${data.split('-').reverse().join('/')}`;
}

export const dataCurta = (data) => data.split('-').reverse().join('/');

export const moeda = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function duracao(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}

/** Máscara de telefone brasileiro: (18) 99999-9999 */
export function mascararTelefone(valor) {
  const n = valor.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : '';
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

export const soDigitos = (t) => String(t ?? '').replace(/\D/g, '');

export const linkWhatsApp = (telefone) => {
  const n = soDigitos(telefone);
  return `https://wa.me/${n.startsWith('55') ? n : `55${n}`}`;
};

export const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const diaDaSemana = (data) => new Date(`${data}T12:00:00Z`).getUTCDay();

/** Segunda-feira da semana que contém `data` */
export function inicioDaSemana(data) {
  const dow = diaDaSemana(data);
  return somarDias(data, dow === 0 ? -6 : 1 - dow);
}

export const dataMuitoCurta = (data) => data.split('-').reverse().slice(0, 2).join('/');

/** Primeiro e último dia do mês de `data` ("AAAA-MM-DD") e do mês anterior. */
export const primeiroDiaDoMes = (data) => `${data.slice(0, 7)}-01`;
export function ultimoDiaDoMes(data) {
  const [a, m] = data.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10); // dia 0 do mês seguinte
}
export const mesAnterior = (data) => primeiroDiaDoMes(somarDias(primeiroDiaDoMes(data), -1));

/**
 * CSV para o Excel brasileiro (separador ";" e BOM). Textos que começam com = + - @ ganham um apóstrofo
 * para o Excel não executar como fórmula (nomes vêm de formulário público).
 */
export function gerarCsv(linhas) {
  const celula = (v) => {
    let t = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return `\uFEFF${linhas.map((l) => l.map(celula).join(';')).join('\r\n')}`;
}
