import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RelatoriosApi } from '../../core/api.service';
import { Reconciliacao } from '../../core/models';
import { hojeIso } from '../../shared/datas';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-rel-reconciliacao',
  imports: [FormsModule, RouterLink, DatePipe, DinheiroPipe],
  template: `
    <div class="filters">
      <div class="field"><label>Dia</label><input class="input" type="date" [ngModel]="data()" (ngModelChange)="data.set($event); carregar()" /></div>
      <button class="btn" (click)="carregar()">Atualizar</button>
      <span class="spacer"></span>
      <a routerLink="/sobras/nova" class="btn">Registrar contagem de sobras</a>
    </div>
    @if (r(); as r) {
      <div class="grid grid-4 mb">
        <div class="card stat"><span class="label">Caixa esperado (dinheiro)</span><span class="value">{{ r.caixaEsperado | dinheiro }}</span><span class="sub">confira contra o caixa físico</span></div>
        <div class="card stat"><span class="label">Vendido no dia</span><span class="value">{{ r.totalVendas | dinheiro }}</span><span class="sub">{{ r.totalFiado | dinheiro }} fiado · {{ r.totalPagoNaHora | dinheiro }} pago</span></div>
        <div class="card stat"><span class="label">Vendas</span><span class="value">{{ r.pedidosFeitos }}</span><span class="sub">{{ r.pedidosCancelados }} cancelada(s), não contam</span></div>
        <div class="card stat"><span class="label">Fichas (itens)</span><span class="value">{{ r.itensVendidos }}</span><span class="sub"><a routerLink="/conferencia">conferir fichas recolhidas</a></span></div>
      </div>
      @if (r.contagemSobrasEm) { <div class="alert alert-info mb">Comparando com a contagem de sobras feita às {{ r.contagemSobrasEm | date:'HH:mm' }}.</div> }
      @else { <div class="alert alert-warn mb">Nenhuma contagem de sobras registrada neste dia. Registre uma para comparar com o físico.</div> }
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Produto</th><th class="num">Vendidos</th><th class="num">Baixas manuais</th><th class="num">Estoque no sistema</th><th class="num">Contagem física</th><th class="num">Diferença</th></tr></thead>
        <tbody>@for (p of r.produtos; track p.produtoId) {
          <tr><td>{{ p.nome }}</td><td class="num">{{ p.vendidos }}</td>
            <td class="num">{{ p.baixasManuais }}</td><td class="num">{{ p.estoqueAtual }}</td><td class="num">{{ p.contagemFisica ?? '—' }}</td>
            <td class="num" [class.neg]="(p.diferencaContagem ?? 0) < 0" [class.pos]="(p.diferencaContagem ?? 0) > 0">{{ p.diferencaContagem === undefined || p.diferencaContagem === null ? '—' : (p.diferencaContagem > 0 ? '+' : '') + p.diferencaContagem }}</td></tr>
        } @empty { <tr><td colspan="6" class="empty">Nenhum movimento neste dia.</td></tr> }</tbody>
      </table></div>
    }
  `,
})
export class RelReconciliacaoComponent {
  private api = inject(RelatoriosApi);
  r = signal<Reconciliacao | null>(null);
  data = signal(hojeIso());
  constructor() { this.carregar(); }
  carregar() { this.api.reconciliacao(this.data()).subscribe(r => this.r.set(r)); }
}
