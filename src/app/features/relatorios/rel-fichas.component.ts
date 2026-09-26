import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RelatoriosApi } from '../../core/api.service';
import { FichaProduto } from '../../core/models';
import { hojeIso } from '../../shared/datas';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-rel-fichas',
  imports: [FormsModule, DinheiroPipe],
  template: `
    <div class="filters">
      <div class="field"><label>De</label><input class="input" type="date" [ngModel]="inicio()" (ngModelChange)="inicio.set($event); carregar()" /></div>
      <div class="field"><label>Até</label><input class="input" type="date" [ngModel]="fim()" (ngModelChange)="fim.set($event); carregar()" /></div>
    </div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Produto</th><th class="num">Fichas emitidas</th><th class="num">Valor</th></tr></thead>
      <tbody>@for (f of lista(); track f.produtoId) {
        <tr><td>{{ f.nome }}</td><td class="num">{{ f.fichasEmitidas }}</td><td class="num">{{ f.valorTotal | dinheiro }}</td></tr>
      } @empty { <tr><td colspan="3" class="empty">Nenhuma ficha no período.</td></tr> }</tbody>
    </table></div>
  `,
})
export class RelFichasComponent {
  private api = inject(RelatoriosApi);
  lista = signal<FichaProduto[]>([]);
  inicio = signal(hojeIso()); fim = signal(hojeIso());
  constructor() { this.carregar(); }
  carregar() { this.api.fichasProdutos(this.inicio(), this.fim()).subscribe(l => this.lista.set(l)); }
}
