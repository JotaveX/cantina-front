/** Data local no formato YYYY-MM-DD (o que os inputs type=date e a API esperam). */
export function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function primeiroDiaDoMesIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function diasAtrasIso(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** YYYY-MM-DD -> DD/MM/YYYY sem passar por Date (evita deslocar o dia pelo fuso). */
export function dataBr(iso: string | null | undefined): string {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** Ex.: (2026, 9) -> "setembro/2026". */
export function mesAno(ano: number, mes: number): string {
  return `${MESES[mes - 1]}/${ano}`;
}

/** (2026, 9) -> "2026-09", formato do input type=month. */
export function mesIso(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

/**
 * Período do "fechamento de M" — espelha ConfiguracaoService.periodo no backend: do dia seguinte ao
 * fechamento de M-1 até o dia de fechamento de M (limitado ao tamanho do mês). Datas em YYYY-MM-DD.
 */
export function periodoFechamento(ano: number, mes: number, diaFechamento: number): { inicio: string; fim: string } {
  const diaEm = (a: number, m: number) => Math.min(diaFechamento, new Date(a, m, 0).getDate());
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fim = new Date(ano, mes - 1, diaEm(ano, mes));
  const inicio = new Date(ano, mes - 2, diaEm(mes === 1 ? ano - 1 : ano, mes === 1 ? 12 : mes - 1) + 1);
  return { inicio: iso(inicio), fim: iso(fim) };
}
