import { describe, expect, it } from 'vitest';
import { gerarCsv, mesAnterior, primeiroDiaDoMes, ultimoDiaDoMes } from '../src/utils.js';

describe('utils: datas do mês e CSV', () => {
  it('primeiro/último dia do mês e mês anterior (fevereiro bissexto e virada de ano)', () => {
    expect(primeiroDiaDoMes('2026-11-18')).toBe('2026-11-01');
    expect(ultimoDiaDoMes('2026-11-18')).toBe('2026-11-30');
    expect(ultimoDiaDoMes('2028-02-10')).toBe('2028-02-29');
    expect(ultimoDiaDoMes('2026-12-05')).toBe('2026-12-31');
    expect(mesAnterior('2026-01-15')).toBe('2025-12-01');
    expect(mesAnterior('2026-11-02')).toBe('2026-10-01');
  });

  it('gerarCsv usa ";" e BOM, protege aspas e neutraliza fórmulas do Excel', () => {
    const csv = gerarCsv([['Nome', 'Obs'], ['Ana; Paula', 'disse "oi"'], ['=1+1', '+55 18 9999']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const linhas = csv.slice(1).split('\r\n');
    expect(linhas[0]).toBe('Nome;Obs');
    expect(linhas[1]).toBe('"Ana; Paula";"disse ""oi"""');
    expect(linhas[2]).toBe("'=1+1;'+55 18 9999");
  });
});
