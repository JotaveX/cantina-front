import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RelatoriosApi } from '../../core/api.service';
import { RelatorioEstoque } from '../../core/models';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-rel-estoque',
  imports: [FormsModule, DinheiroPipe],
  template: `
    <div class="filters"><label class="check"><input type="checkbox" [ngModel]="apenasBaixo()" (ngModelChange)="apenasBaixo.set($event); carregar()" /> Só produtos com estoque baixo</label></div>
    @if (r(); as r) {
      <div class="grid grid-3 mb">
        <div class="card stat"><span class="label">Produtos ativos</span><span class="value">{{ r.totalProdutos }}</span></div>
        <div class="card stat"><span class="label">Abaixo do mínimo</span><span class="value" [class.neg]="r.produtosComEstoqueBaixo > 0">{{ r.produtosComEstoqueBaixo }}</span></div>
        <div class="card stat"><span class="label">Valor em estoque (preço de venda)</span><span class="value">{{ r.valorTotalEstoque | dinheiro }}</span></div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Produto</th><th>Categoria</th><th class="num">Estoque</th><th class="num">Mínimo</th><th class="num">Preço</th><th class="num">Valor</th></tr></thead>
        <tbody>@for (p of r.produtos; track p.produtoId) {
          <tr><td>{{ p.nome }} @if (p.estoqueBaixo) { <span class="badge badge-amber">baixo</span> }</td><td>{{ p.categoria || '—' }}</td>
            <td class="num" [class.neg]="p.estoqueBaixo">{{ p.quantidadeEstoque }}</td><td class="num">{{ p.estoqueMinimo }}</td><td class="num">{{ p.preco | dinheiro }}</td><td class="num">{{ p.valorEmEstoque | dinheiro }}</td></tr>
        } @empty { <tr><td colspan="6" class="empty">Nenhum produto.</td></tr> }</tbody>
      </table></div>
    }
  `,
})
export class RelEstoqueComponent {
  private api = inject(RelatoriosApi);
  r = signal<RelatorioEstoque | null>(null);
  apenasBaixo = signal(false);
  constructor() { this.carregar(); }
  carregar() { this.api.estoque(this.apenasBaixo()).subscribe(r => this.r.set(r)); }
}
