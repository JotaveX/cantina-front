import { Component, computed, inject, output, signal } from '@angular/core';
import { CadastrosApi } from '../core/api.service';
import { dataBr, mesAno, mesIso, periodoFechamento } from './datas';

interface OpcaoFechamento { valor: string; ano: number; mes: number; rotulo: string; periodo: string; atual: boolean; }

/** Quantos fechamentos anteriores ao atual aparecem na lista. */
const QTD_ANTERIORES = 24;

/**
 * Escolha do fechamento mensal: setas para o anterior/próximo e uma lista que já mostra o período
 * de cada fechamento (ex.: "setembro/2026 · 26/08 a 25/09"). Começa no fechamento em andamento e
 * não vai além dele. Emite `mudou` ao carregar e a cada troca.
 */
@Component({
  selector: 'app-seletor-fechamento',
  template: `
    <div class="seletor">
      <button type="button" class="btn seta" title="Fechamento anterior" aria-label="Fechamento anterior"
              [disabled]="indice() >= opcoes().length - 1" (click)="ir(indice() + 1)">‹</button>
      <select class="input" aria-label="Fechamento" [value]="selecionado()" (change)="escolher($any($event.target).value)">
        @for (o of opcoes(); track o.valor) {
          <option [value]="o.valor" [selected]="o.valor === selecionado()">{{ o.rotulo }} · {{ o.periodo }}{{ o.atual ? ' (atual)' : '' }}</option>
        }
      </select>
      <button type="button" class="btn seta" title="Próximo fechamento" aria-label="Próximo fechamento"
              [disabled]="indice() <= 0" (click)="ir(indice() - 1)">›</button>
      @if (indice() > 0) {
        <button type="button" class="btn btn-ghost btn-sm" (click)="ir(0)">Ir para o atual</button>
      }
    </div>
  `,
  styles: [`
    .seletor { display: flex; align-items: center; gap: 6px; }
    .seletor select { width: auto; min-width: 250px; }
    .seta { padding: 7px 12px; font-size: 1.1rem; line-height: 1; }
  `],
})
export class SeletorFechamentoComponent {
  private api = inject(CadastrosApi);
  mudou = output<{ ano: number; mes: number }>();

  /** Do atual (índice 0) para os mais antigos. */
  opcoes = signal<OpcaoFechamento[]>([]);
  selecionado = signal('');
  indice = computed(() => this.opcoes().findIndex(o => o.valor === this.selecionado()));

  constructor() {
    this.api.configuracao().subscribe(c => {
      const { ano, mes } = c.cicloAtual;
      const opcoes: OpcaoFechamento[] = [];
      for (let i = 0; i <= QTD_ANTERIORES; i++) {
        const d = new Date(ano, mes - 1 - i, 1);
        const a = d.getFullYear(), m = d.getMonth() + 1;
        const p = periodoFechamento(a, m, c.diaFechamento);
        opcoes.push({
          valor: mesIso(a, m), ano: a, mes: m, atual: i === 0,
          rotulo: mesAno(a, m).replace(/^./, l => l.toUpperCase()),
          periodo: `${dataBr(p.inicio).slice(0, 5)} a ${dataBr(p.fim).slice(0, 5)}`,
        });
      }
      this.opcoes.set(opcoes);
      this.ir(0);
    });
  }

  escolher(valor: string) {
    this.ir(this.opcoes().findIndex(o => o.valor === valor));
  }

  ir(i: number) {
    const o = this.opcoes()[i];
    if (!o) return;
    this.selecionado.set(o.valor);
    this.mudou.emit({ ano: o.ano, mes: o.mes });
  }
}
