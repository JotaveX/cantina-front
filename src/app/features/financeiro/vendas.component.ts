import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperacoesApi } from '../../core/api.service';
import { FormaPagamento, Page, StatusVenda, Venda } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { hojeIso } from '../../shared/datas';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-vendas',
  imports: [FormsModule, DatePipe, DinheiroPipe, StatusBadgeComponent],
  template: `
    <div class="page">
      <div class="page-head"><div><h1>Vendas</h1><p>Todas as fichas emitidas. Pedidos ainda pendentes podem ser cancelados, devolvendo estoque e saldo.</p></div></div>
      <div class="filters">
        <div class="field"><label>De</label><input class="input" type="date" [ngModel]="inicio()" (ngModelChange)="inicio.set($event); carregar(0)" /></div>
        <div class="field"><label>Até</label><input class="input" type="date" [ngModel]="fim()" (ngModelChange)="fim.set($event); carregar(0)" /></div>
        <div class="field"><label>Status</label>
          <select class="input" [ngModel]="status()" (ngModelChange)="status.set($event); carregar(0)">
            <option value="">Todos</option><option value="PENDENTE">Pendente</option><option value="RETIRADO_PARCIAL">Parcial</option><option value="RETIRADO">Retirado</option><option value="CANCELADO">Cancelado</option></select></div>
        <div class="field"><label>Forma</label>
          <select class="input" [ngModel]="forma()" (ngModelChange)="forma.set($event); carregar(0)">
            <option value="">Todas</option><option value="FIADO">Fiado</option><option value="PAGO_NA_HORA">Pago na hora</option></select></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Ficha</th><th>Data</th><th>Aluno</th><th>Forma</th><th>Status</th><th class="num">Total</th><th>Operador</th><th></th></tr></thead>
          <tbody>
            @for (v of pagina()?.content; track v.id) {
              <tr class="clickable" (click)="abrir(v)">
                <td>#{{ v.id }}</td><td>{{ v.dataHora | date:'dd/MM HH:mm' }}</td><td>{{ v.alunoNome }} <span class="muted small">{{ v.alunoTurma || '' }}</span></td>
                <td><app-badge [valor]="v.formaPagamento" /></td><td><app-badge [valor]="v.status" /></td>
                <td class="num">{{ v.valorTotal | dinheiro }}</td><td>{{ v.operadorNome || '—' }}</td>
                <td class="actions">@if (v.status === 'PENDENTE') { <button class="btn btn-sm btn-danger" (click)="cancelar(v); $event.stopPropagation()">Cancelar</button> }</td>
              </tr>
              @if (aberta()?.id === v.id) {
                <tr><td colspan="8" style="background: var(--surface-2)">
                  @for (i of aberta()!.itens; track i.id) { <div class="row-between small" style="padding:4px 8px"><span>{{ i.quantidade }}× {{ i.nomeProduto }} {{ i.retirado ? '(entregue)' : '' }}</span><span class="num">{{ i.subtotal | dinheiro }}</span></div> }
                  @if (aberta()!.motivoCancelamento) { <div class="small muted" style="padding:4px 8px">Motivo do cancelamento: {{ aberta()!.motivoCancelamento }}</div> }
                </td></tr>
              }
            } @empty { <tr><td colspan="8" class="empty">Nenhuma venda no período.</td></tr> }
          </tbody>
        </table>
      </div>
      @if (pagina(); as p) {
        <div class="row mt">
          <span class="muted small">{{ p.totalElements }} venda(s)</span><span class="spacer"></span>
          <button class="btn btn-sm" [disabled]="p.number === 0" (click)="carregar(p.number - 1)">Anterior</button>
          <span class="small">Página {{ p.number + 1 }} de {{ p.totalPages || 1 }}</span>
          <button class="btn btn-sm" [disabled]="p.number + 1 >= p.totalPages" (click)="carregar(p.number + 1)">Próxima</button>
        </div>
      }
    </div>
  `,
})
export class VendasComponent {
  private api = inject(OperacoesApi);
  private toast = inject(ToastService);
  pagina = signal<Page<Venda> | null>(null);
  aberta = signal<Venda | null>(null);
  inicio = signal(hojeIso());
  fim = signal(hojeIso());
  status = signal<StatusVenda | ''>('');
  forma = signal<FormaPagamento | ''>('');

  constructor() { this.carregar(0); }
  carregar(page: number) {
    this.api.vendas({ inicio: this.inicio(), fim: this.fim(), status: this.status(), formaPagamento: this.forma(), page, size: 50 }).subscribe(p => this.pagina.set(p));
  }
  abrir(v: Venda) {
    if (this.aberta()?.id === v.id) { this.aberta.set(null); return; }
    this.api.venda(v.id).subscribe(d => this.aberta.set(d));
  }
  cancelar(v: Venda) {
    const motivo = prompt(`Cancelar a ficha #${v.id} de ${v.alunoNome}? Informe o motivo:`);
    if (motivo === null) return;
    this.api.cancelarVenda(v.id, motivo).subscribe(() => { this.toast.sucesso('Venda cancelada, estoque e saldo devolvidos'); this.carregar(this.pagina()?.number ?? 0); });
  }
}
