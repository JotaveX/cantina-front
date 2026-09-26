import { code128 } from './code128';

describe('code128', () => {
  it('gera start B, dados, checksum e stop com a largura esperada', () => {
    // 6 caracteres: (start + 6 + checksum) × 11 módulos + stop de 13
    const { modulos } = code128('AL1127');
    expect(modulos).toBe(8 * 11 + 13);
  });

  it('calcula o checksum do exemplo clássico "PJJ123C"', () => {
    // Valores B: P=48 J=42 J=42 1=17 2=18 3=19 C=35; (104 + 48 + 84 + 126 + 68 + 90 + 114 + 245) % 103 = 55
    const { barras } = code128('PJJ123C');
    // o penúltimo símbolo (checksum 55 = '311321') começa com uma barra de 3 módulos
    const inicioChecksum = 8 * 11;
    expect(barras.find(b => b.x === inicioChecksum)?.largura).toBe(3);
  });

  it('rejeita caracteres fora do subconjunto B', () => {
    expect(() => code128('AÇ')).toThrow();
  });
});
