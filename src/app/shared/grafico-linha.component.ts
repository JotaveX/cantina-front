import { Component, DestroyRef, ElementRef, computed, inject, input, signal } from '@angular/core';

export interface PontoGrafico { rotulo: string; detalhe: string; valor: number; parcial?: boolean; }

const A = 160, M_ESQ = 8, M_DIR = 8, M_TOPO = 12, M_BASE = 22;

/**
 * Gráfico de linha simples em SVG (sem dependências): uma série, linha de base em zero,
 * rótulos do eixo X espaçados e leitura do ponto sob o cursor. Ponto "parcial" (período em
 * andamento) fica tracejado e vazado, para não parecer queda de faturamento.
 */
@Component({
  selector: 'app-grafico-linha',
  template: `
    <div class="leitura small">
      @if (ativo(); as p) { <strong>{{ p.detalhe }}</strong> · {{ formatar()(p.valor) }}@if (p.parcial) { <span class="muted"> (em andamento)</span> } }
      @else { <span class="muted">Passe o cursor sobre o gráfico para ver cada período.</span> }
    </div>
    <svg [attr.viewBox]="'0 0 ' + L() + ' ' + A" [attr.height]="A" role="img" [attr.aria-label]="rotuloAcessivel()" (mouseleave)="hover.set(null)">
      @for (g of grades(); track $index) {
        <line class="grade" [attr.x1]="M_ESQ" [attr.x2]="L() - M_DIR" [attr.y1]="g.y" [attr.y2]="g.y" />
        <text class="eixo" [attr.x]="M_ESQ" [attr.y]="g.y - 4">{{ g.rotulo }}</text>
      }
      <path class="linha" [attr.d]="caminhoFechado()" />
      @if (caminhoParcial()) { <path class="linha parcial" [attr.d]="caminhoParcial()" /> }
      @if (hover() !== null) { <line class="guia" [attr.x1]="xy()[hover()!].x" [attr.x2]="xy()[hover()!].x" [attr.y1]="M_TOPO" [attr.y2]="A - M_BASE" /> }
      @for (p of xy(); track $index) {
        <circle class="ponto" [class.vazado]="p.parcial" [class.ativo]="hover() === $index" [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="hover() === $index ? 5 : 3.5" />
        @if (mostrarRotulo($index)) { <text class="eixo" text-anchor="middle" [attr.x]="p.x" [attr.y]="A - 6">{{ pontos()[$index].rotulo }}</text> }
        <rect class="alvo" [attr.x]="p.x - passo() / 2" [attr.y]="0" [attr.width]="passo()" [attr.height]="A" (mouseenter)="hover.set($index)" />
      }
    </svg>
  `,
  styles: [`
    :host { display: block; }
    svg { width: 100%; display: block; overflow: visible; }
    .leitura { min-height: 1.4em; margin-bottom: 6px; }
    .grade { stroke: var(--line); stroke-width: 1; }
    .eixo { fill: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
    .linha { fill: none; stroke: var(--primary); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .linha.parcial { stroke-dasharray: 4 4; }
    .ponto { fill: var(--primary); stroke: var(--surface); stroke-width: 2; }
    .ponto.vazado { fill: var(--surface); stroke: var(--primary); }
    .guia { stroke: var(--line-strong); stroke-width: 1; }
    .alvo { fill: transparent; cursor: crosshair; }
  `],
})
export class GraficoLinhaComponent {
  /** Largura real do container: o SVG desenha em escala 1:1, então o texto fica sempre em 11px. */
  readonly L = signal(600);
  readonly A = A; readonly M_ESQ = M_ESQ; readonly M_DIR = M_DIR; readonly M_TOPO = M_TOPO; readonly M_BASE = M_BASE;

  pontos = input.required<PontoGrafico[]>();
  formatar = input<(v: number) => string>(v => String(v));
  titulo = input('Gráfico de linha');
  hover = signal<number | null>(null);

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const obs = new ResizeObserver(([e]) => { if (e.contentRect.width > 0) this.L.set(Math.round(e.contentRect.width)); });
    obs.observe(el);
    inject(DestroyRef).onDestroy(() => obs.disconnect());
  }

  ativo = computed(() => { const i = this.hover(); return i === null ? null : this.pontos()[i] ?? null; });

  private maximo = computed(() => {
    const max = Math.max(0, ...this.pontos().map(p => p.valor));
    if (max <= 0) return 1;
    // arredonda o topo para um número "redondo" (1, 2, 5 × 10^n)
    const pot = Math.pow(10, Math.floor(Math.log10(max)));
    return [1, 2, 5, 10].map(m => m * pot).find(v => v >= max)!;
  });

  passo = computed(() => (this.L() - M_ESQ - M_DIR) / Math.max(1, this.pontos().length));

  xy = computed(() => {
    const alt = A - M_TOPO - M_BASE;
    return this.pontos().map((p, i) => ({
      x: M_ESQ + this.passo() * (i + 0.5),
      y: M_TOPO + alt - (p.valor / this.maximo()) * alt,
      parcial: !!p.parcial,
    }));
  });

  grades = computed(() => {
    const alt = A - M_TOPO - M_BASE;
    return [0.5, 1].map(f => ({ y: M_TOPO + alt - f * alt, rotulo: this.formatar()(this.maximo() * f) }))
      .concat([{ y: A - M_BASE, rotulo: '' }]);
  });

  /** Linha sólida até o último período fechado. */
  caminhoFechado = computed(() => {
    const pts = this.xy();
    const fim = pts.length && pts[pts.length - 1].parcial ? pts.length - 1 : pts.length;
    return pts.slice(0, fim).map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  });

  /** Trecho tracejado até o período em andamento. */
  caminhoParcial = computed(() => {
    const pts = this.xy();
    if (pts.length < 2 || !pts[pts.length - 1].parcial) return '';
    const [a, b] = pts.slice(-2);
    return `M${a.x},${a.y} L${b.x},${b.y}`;
  });

  rotuloAcessivel = computed(() =>
    `${this.titulo()}: ` + this.pontos().map(p => `${p.detalhe} ${this.formatar()(p.valor)}`).join('; '));

  /** Rótulo em pontos alternados quando há muitos, sempre mostrando o último. */
  mostrarRotulo(i: number) {
    const n = this.pontos().length;
    const salto = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(this.L() / 70))));
    return i === n - 1 || (n - 1 - i) % salto === 0;
  }
}
