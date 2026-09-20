import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RelatoriosApi } from '../../core/api.service';
import { FechamentoMensal } from '../../core/models';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-rel-fechamento',
  imports: [FormsModule, RouterLink, DinheiroPipe],
  template: `
    <div class="filters">
      <div class="field"><label>Mês</label><input class="input" type="month" [ngModel]="mes()" (ngModelChange)="mes.set($event); carregar()" /></div>
      <label class="check"><input type="checkbox" [ngModel]="apenasEmAberto()" (ngModelChange)="apenasEmAberto.set($event); carregar()" /> Só quem tem saldo negativo</label>
    </div>
    @if (r(); as r) {
      <div class="grid grid-3 mb">
        <div class="card stat"><span class="label">Alunos em aberto</span><span class="value">{{ r.quantidadeAlunosEmAberto }}</span></div>
        <div class="card stat"><span class="label">Total a cobrar</span><span class="value neg">{{ r.totalEmAberto | dinheiro }}</span></div>
        <div class="card stat"><span class="label">Comprado fiado no mês</span><span class="value">{{ r.totalFiadoNoMes | dinheiro }}</span></div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Aluno</th><th>Turma</th><th>Responsável</th><th class="num">Fiado no mês</th><th class="num">Créditos</th><th class="num">Pagamentos</th><th class="num">Saldo atual</th><th></th></tr></thead>
        <tbody>@for (a of r.alunos; track a.alunoId) {
          <tr><td>{{ a.nome }}</td><td>{{ a.turma || '—' }}</td><td>{{ a.responsavelNome || '—' }}<span class="muted small">{{ a.responsavelContato ? ' · ' + a.responsavelContato : '' }}</span></td>
            <td class="num">{{ a.comprasFiadoNoMes | dinheiro }}</td><td class="num">{{ a.creditosNoMes | dinheiro }}</td><td class="num">{{ a.pagamentosNoMes | dinheiro }}</td>
            <td class="num" [class.neg]="a.saldoAtual < 0" [class.pos]="a.saldoAtual > 0">{{ a.saldoAtual | dinheiro }}</td>
            <td class="actions"><a [routerLink]="['/conta', a.alunoId]" class="btn btn-sm">Extrato</a></td></tr>
        } @empty { <tr><td colspan="8" class="empty">Nenhum movimento no mês.</td></tr> }</tbody>
      </table></div>
    }
  `,
})
export class RelFechamentoComponent {
  private api = inject(RelatoriosApi);
  r = signal<FechamentoMensal | null>(null);
  mes = signal(new Date().toISOString().slice(0, 7));
  apenasEmAberto = signal(true);
  constructor() { this.carregar(); }
  carregar() {
    const [ano, mes] = this.mes().split('-').map(Number);
    if (!ano || !mes) return;
    this.api.fechamentoMensal(ano, mes, this.apenasEmAberto()).subscribe(r => this.r.set(r));
  }
}
