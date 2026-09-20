import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RelatoriosApi } from '../../core/api.service';
import { EmAtraso } from '../../core/models';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-rel-em-atraso',
  imports: [RouterLink, DinheiroPipe],
  template: `
    @if (r(); as r) {
      <div class="grid grid-2 mb">
        <div class="card stat"><span class="label">Alunos com saldo negativo</span><span class="value">{{ r.quantidadeAlunos }}</span></div>
        <div class="card stat"><span class="label">Total em aberto</span><span class="value neg">{{ r.totalEmAberto | dinheiro }}</span></div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Aluno</th><th>Turma</th><th>Responsável</th><th>Contato</th><th class="num">Saldo</th><th></th></tr></thead>
        <tbody>@for (a of r.alunos; track a.alunoId) {
          <tr><td>{{ a.nome }}</td><td>{{ a.turma || '—' }}</td><td>{{ a.responsavelNome || '—' }}</td><td>{{ a.responsavelContato || '—' }}</td>
            <td class="num neg">{{ a.saldo | dinheiro }}</td><td class="actions"><a [routerLink]="['/conta', a.alunoId]" class="btn btn-sm">Receber</a></td></tr>
        } @empty { <tr><td colspan="6" class="empty">Nenhum aluno em atraso.</td></tr> }</tbody>
      </table></div>
    }
  `,
})
export class RelEmAtrasoComponent {
  private api = inject(RelatoriosApi);
  r = signal<EmAtraso | null>(null);
  constructor() { this.api.emAtraso().subscribe(r => this.r.set(r)); }
}
