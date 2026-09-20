import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OperacoesApi } from '../../core/api.service';
import { Compra } from '../../core/models';
import { diasAtrasIso, hojeIso } from '../../shared/datas';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-compras',
  imports: [FormsModule, RouterLink, DatePipe, DinheiroPipe],
  template: `
    <div class="page">
      <div class="page-head">
        <div><h1>Compras</h1><p>Entradas de estoque vindas de fornecedores.</p></div>
        <a routerLink="/compras/nova" class="btn btn-primary">Registrar compra</a>
      </div>
      <div class="filters">
        <div class="field"><label>De</label><input class="input" type="date" [ngModel]="inicio()" (ngModelChange)="inicio.set($event); carregar()" /></div>
        <div class="field"><label>Até</label><input class="input" type="date" [ngModel]="fim()" (ngModelChange)="fim.set($event); carregar()" /></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Data</th><th>Fornecedor</th><th>Observação</th><th>Registrado por</th><th class="num">Total</th><th></th></tr></thead>
          <tbody>
            @for (c of lista(); track c.id) {
              <tr class="clickable" (click)="abrir(c)">
                <td>{{ c.data | date:'dd/MM/yyyy' }}</td><td>{{ c.fornecedorNome }}</td><td>{{ c.observacao || '—' }}</td>
                <td>{{ c.usuarioNome || '—' }}</td><td class="num">{{ c.valorTotal | dinheiro }}</td>
                <td class="actions"><button class="btn btn-sm">{{ aberta()?.id === c.id ? 'Fechar' : 'Itens' }}</button></td>
              </tr>
              @if (aberta()?.id === c.id) {
                <tr><td colspan="6" style="background: var(--surface-2)">
                  <table class="table" style="font-size:.875rem">
                    <thead><tr><th>Produto</th><th class="num">Qtd</th><th class="num">Custo unit.</th><th class="num">Subtotal</th></tr></thead>
                    <tbody>@for (i of aberta()!.itens; track i.id) { <tr><td>{{ i.produtoNome }}</td><td class="num">{{ i.quantidade }}</td><td class="num">{{ i.custoUnitario | dinheiro }}</td><td class="num">{{ i.subtotal | dinheiro }}</td></tr> }</tbody>
                  </table>
                </td></tr>
              }
            } @empty { <tr><td colspan="6" class="empty">Nenhuma compra no período.</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ComprasComponent {
  private api = inject(OperacoesApi);
  lista = signal<Compra[]>([]);
  aberta = signal<Compra | null>(null);
  inicio = signal(diasAtrasIso(30));
  fim = signal(hojeIso());

  constructor() { this.carregar(); }
  carregar() { this.api.compras(this.inicio(), this.fim()).subscribe(l => this.lista.set(l)); }
  abrir(c: Compra) {
    if (this.aberta()?.id === c.id) { this.aberta.set(null); return; }
    this.api.compra(c.id).subscribe(d => this.aberta.set(d));
  }
}
