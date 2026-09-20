import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OperacoesApi } from '../../core/api.service';
import { Sobras } from '../../core/models';
import { diasAtrasIso, hojeIso } from '../../shared/datas';

@Component({
  selector: 'app-sobras',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="page">
      <div class="page-head">
        <div><h1>Contagem de sobras</h1><p>Contagem física (ex.: pós-recreio) comparada com o que o sistema registrou.</p></div>
        <a routerLink="/sobras/nova" class="btn btn-primary">Nova contagem</a>
      </div>
      <div class="filters">
        <div class="field"><label>De</label><input class="input" type="date" [ngModel]="inicio()" (ngModelChange)="inicio.set($event); carregar()" /></div>
        <div class="field"><label>Até</label><input class="input" type="date" [ngModel]="fim()" (ngModelChange)="fim.set($event); carregar()" /></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Data</th><th>Observação</th><th>Por</th><th class="num">Divergências</th><th></th></tr></thead>
          <tbody>
            @for (c of lista(); track c.id) {
              <tr class="clickable" (click)="abrir(c)">
                <td>{{ c.dataHora | date:'dd/MM/yyyy HH:mm' }}</td><td>{{ c.observacao || '—' }}</td><td>{{ c.usuarioNome || '—' }}</td>
                <td class="num" [class.neg]="c.totalDivergencias > 0">{{ c.totalDivergencias }}</td>
                <td class="actions"><button class="btn btn-sm">{{ aberta()?.id === c.id ? 'Fechar' : 'Detalhes' }}</button></td>
              </tr>
              @if (aberta()?.id === c.id) {
                <tr><td colspan="5" style="background: var(--surface-2)">
                  <table class="table" style="font-size:.875rem">
                    <thead><tr><th>Produto</th><th class="num">Sistema</th><th class="num">Contado</th><th class="num">Diferença</th></tr></thead>
                    <tbody>@for (i of aberta()!.itens; track i.id) {
                      <tr><td>{{ i.produtoNome }}</td><td class="num">{{ i.quantidadeSistema }}</td><td class="num">{{ i.quantidadeContada }}</td>
                        <td class="num" [class.neg]="i.diferenca < 0" [class.pos]="i.diferenca > 0">{{ i.diferenca > 0 ? '+' : '' }}{{ i.diferenca }}</td></tr> }</tbody>
                  </table>
                </td></tr>
              }
            } @empty { <tr><td colspan="5" class="empty">Nenhuma contagem no período.</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class SobrasComponent {
  private api = inject(OperacoesApi);
  lista = signal<Sobras[]>([]);
  aberta = signal<Sobras | null>(null);
  inicio = signal(diasAtrasIso(30));
  fim = signal(hojeIso());
  constructor() { this.carregar(); }
  carregar() { this.api.sobras(this.inicio(), this.fim()).subscribe(l => this.lista.set(l)); }
  abrir(c: Sobras) {
    if (this.aberta()?.id === c.id) { this.aberta.set(null); return; }
    this.api.sobra(c.id).subscribe(d => this.aberta.set(d));
  }
}
