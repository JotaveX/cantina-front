import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RelatoriosApi } from '../../core/api.service';
import { VendasPeriodo } from '../../core/models';
import { hojeIso, primeiroDiaDoMesIso } from '../../shared/datas';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-rel-vendas-periodo',
  imports: [FormsModule, DatePipe, DinheiroPipe],
  template: `
    <div class="filters">
      <div class="field"><label>De</label><input class="input" type="date" [ngModel]="inicio()" (ngModelChange)="inicio.set($event); carregar()" /></div>
      <div class="field"><label>Até</label><input class="input" type="date" [ngModel]="fim()" (ngModelChange)="fim.set($event); carregar()" /></div>
    </div>
    @if (r(); as r) {
      <div class="grid grid-4 mb">
        <div class="card stat"><span class="label">Total vendido</span><span class="value">{{ r.totalGeral | dinheiro }}</span><span class="sub">{{ r.quantidadeVendas }} fichas · {{ r.quantidadeItens }} itens</span></div>
        <div class="card stat"><span class="label">Pago na hora</span><span class="value">{{ r.totalPago | dinheiro }}</span></div>
        <div class="card stat"><span class="label">Fiado</span><span class="value">{{ r.totalFiado | dinheiro }}</span></div>
        <div class="card stat"><span class="label">Ticket médio</span><span class="value">{{ (r.quantidadeVendas ? r.totalGeral / r.quantidadeVendas : 0) | dinheiro }}</span></div>
      </div>
      <div class="grid grid-2">
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Dia</th><th class="num">Fichas</th><th class="num">Fiado</th><th class="num">Pago</th><th class="num">Total</th></tr></thead>
          <tbody>@for (d of r.porDia; track d.data) {
            <tr><td>{{ d.data | date:'dd/MM (EEE)' }}</td><td class="num">{{ d.quantidadeVendas }}</td><td class="num">{{ d.totalFiado | dinheiro }}</td><td class="num">{{ d.totalPago | dinheiro }}</td><td class="num">{{ d.total | dinheiro }}</td></tr>
          } @empty { <tr><td colspan="5" class="empty">Sem vendas.</td></tr> }</tbody>
        </table></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Produto</th><th class="num">Qtd</th><th class="num">Total</th></tr></thead>
          <tbody>@for (p of r.porProduto; track p.produtoId) {
            <tr><td>{{ p.nome }}</td><td class="num">{{ p.quantidade }}</td><td class="num">{{ p.total | dinheiro }}</td></tr>
          } @empty { <tr><td colspan="3" class="empty">Sem vendas.</td></tr> }</tbody>
        </table></div>
      </div>
    }
  `,
})
export class RelVendasPeriodoComponent {
  private api = inject(RelatoriosApi);
  r = signal<VendasPeriodo | null>(null);
  inicio = signal(primeiroDiaDoMesIso()); fim = signal(hojeIso());
  constructor() { this.carregar(); }
  carregar() { this.api.vendasPeriodo(this.inicio(), this.fim()).subscribe(r => this.r.set(r)); }
}
