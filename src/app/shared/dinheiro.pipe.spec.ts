import { describe, expect, it } from 'vitest';
import { DinheiroPipe } from './dinheiro.pipe';

describe('DinheiroPipe', () => {
  const pipe = new DinheiroPipe();

  it('formata em reais no padrão pt-BR', () => {
    expect(pipe.transform(15).replace(/ /g, ' ')).toBe('R$ 15,00');
    expect(pipe.transform(-13.5).replace(/ /g, ' ')).toBe('-R$ 13,50');
    expect(pipe.transform('1234.5').replace(/ /g, ' ')).toBe('R$ 1.234,50');
  });

  it('retorna vazio para nulo ou indefinido', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
