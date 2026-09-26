import { Component, computed, input } from '@angular/core';
import { code128 } from './code128';

/** Código de barras Code 128 em SVG; o tamanho vem do CSS de quem usa (largura e altura do host). */
@Component({
  selector: 'app-codigo-barras',
  template: `
    <svg [attr.viewBox]="'0 0 ' + total() + ' 1'" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" [attr.aria-label]="codigo()">
      @for (b of barras(); track $index) { <rect [attr.x]="b.x + SILENCIO" y="0" [attr.width]="b.largura" height="1" /> }
    </svg>
  `,
  styles: [`
    :host { display: block; }
    svg { display: block; width: 100%; height: 100%; }
    rect { fill: #000; }
  `],
})
export class CodigoBarrasComponent {
  /** Zona de silêncio (em módulos) de cada lado, exigida pelo padrão para o leitor achar o início. */
  protected readonly SILENCIO = 10;
  codigo = input.required<string>();
  private simbolo = computed(() => code128(this.codigo()));
  barras = computed(() => this.simbolo().barras);
  total = computed(() => this.simbolo().modulos + 2 * this.SILENCIO);
}
