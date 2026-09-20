import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CadastrosApi, RelatoriosApi } from '../../core/api.service';
import { Carteirinha, Turma } from '../../core/models';

@Component({
  selector: 'app-rel-carteirinhas',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="filters">
      <div class="field"><label>Turma</label>
        <select class="input" [ngModel]="turmaId()" (ngModelChange)="turmaId.set($event); carregar()"><option [ngValue]="null">Todas</option>
          @for (t of turmas(); track t.id) { <option [ngValue]="t.id">{{ t.nome }}</option> }</select></div>
      <label class="check"><input type="checkbox" [ngModel]="apenasAtivos()" (ngModelChange)="apenasAtivos.set($event); carregar()" /> Só ativos</label>
      <span class="muted small">Use "Imprimir" para gerar a lista de códigos; a reemissão de código é feita no cadastro do aluno.</span>
    </div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Aluno</th><th>Turma</th><th>Código de barras</th><th></th></tr></thead>
      <tbody>@for (c of lista(); track c.alunoId) {
        <tr><td>{{ c.nome }}{{ c.ativo ? '' : ' (desativado)' }}</td><td>{{ c.turma || '—' }}</td><td><span class="kbd" style="font-size:1rem">{{ c.codigoBarras }}</span></td>
          <td class="actions"><a [routerLink]="['/alunos', c.alunoId]" class="btn btn-sm">Cadastro</a></td></tr>
      } @empty { <tr><td colspan="4" class="empty">Nenhum aluno.</td></tr> }</tbody>
    </table></div>
  `,
})
export class RelCarteirinhasComponent {
  private api = inject(RelatoriosApi);
  private cadastros = inject(CadastrosApi);
  lista = signal<Carteirinha[]>([]);
  turmas = signal<Turma[]>([]);
  turmaId = signal<number | null>(null);
  apenasAtivos = signal(true);
  constructor() { this.cadastros.turmas().subscribe(t => this.turmas.set(t)); this.carregar(); }
  carregar() { this.api.carteirinhas(this.turmaId(), this.apenasAtivos()).subscribe(l => this.lista.set(l)); }
}
