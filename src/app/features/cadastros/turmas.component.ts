import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CadastrosApi } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Turma } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-turmas',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page" style="max-width: 900px">
      <div class="page-head">
        <div><h1>Turmas</h1><p>Usadas para filtrar alunos e relatórios. A próxima turma define para onde os alunos vão na troca de ano — cadastre a partir da última série, que é a turma final.</p></div>
        <a routerLink="/troca-de-ano" class="btn">Troca de ano</a>
      </div>
      <form class="card card-tight mb" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="row" style="align-items: flex-end">
          <div class="field" style="flex:1"><label>Nome</label><input class="input" formControlName="nome" placeholder="Ex.: 5º A" /></div>
          <div class="field" style="flex:1"><label>Série</label><input class="input" formControlName="serie" placeholder="Ex.: 5º ano" /></div>
          <div class="field" style="flex:1"><label>Próxima turma</label>
            <select class="input" formControlName="destino" title="Para onde os alunos vão na troca de ano">
              <option [ngValue]="null" disabled>Escolha…</option>
              @for (o of turmas(); track o.id) { @if (o.ativo && o.id !== editando()?.id) { <option [ngValue]="o.id">{{ o.nome }}</option> } }
              <option ngValue="FINAL">Turma final (formandos saem)</option>
            </select>
          </div>
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid">{{ editando() ? 'Salvar' : 'Adicionar' }}</button>
          @if (editando()) { <button class="btn" type="button" (click)="cancelar()">Cancelar</button> }
        </div>
      </form>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Nome</th><th>Série</th><th>Próxima turma</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            @for (t of turmas(); track t.id) {
              <tr>
                <td>{{ t.nome }}</td><td>{{ t.serie || '—' }}</td><td>
                  @if (t.turmaFinal) { <span class="muted">Turma final</span> }
                  @else if (t.proximaTurmaNome) { {{ t.proximaTurmaNome }} }
                  @else { <span class="badge badge-amber" title="Edite a turma para definir o destino na troca de ano">Não definida</span> }
                </td>
                <td><span class="badge" [class.badge-green]="t.ativo">{{ t.ativo ? 'Ativa' : 'Inativa' }}</span></td>
                <td class="actions">
                  <button class="btn btn-sm" (click)="editar(t)">Editar</button>
                  @if (t.ativo && auth.admin()) { <button class="btn btn-sm btn-danger" (click)="desativar(t)">Desativar</button> }
                </td>
              </tr>
            } @empty { <tr><td colspan="5" class="empty">Nenhuma turma cadastrada.</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class TurmasComponent {
  private fb = inject(FormBuilder);
  private api = inject(CadastrosApi);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  turmas = signal<Turma[]>([]);
  editando = signal<Turma | null>(null);
  form = this.fb.group({ nome: this.fb.nonNullable.control('', Validators.required), serie: this.fb.nonNullable.control(''), destino: this.fb.control<number | 'FINAL' | null>(null, Validators.required) });

  constructor() { this.carregar(); }
  carregar() { this.api.turmas().subscribe(t => this.turmas.set(t)); }

  editar(t: Turma) { this.editando.set(t); this.form.setValue({ nome: t.nome, serie: t.serie ?? '', destino: t.turmaFinal ? 'FINAL' : t.proximaTurmaId ?? null }); }
  cancelar() { this.editando.set(null); this.form.reset(); }

  salvar() {
    const v = this.form.getRawValue();
    const atual = this.editando();
    this.api.salvarTurma({ id: atual?.id, nome: v.nome, serie: v.serie || undefined, ativo: atual ? atual.ativo : true,
      proximaTurmaId: typeof v.destino === 'number' ? v.destino : undefined, turmaFinal: v.destino === 'FINAL' })
      .subscribe(() => { this.toast.sucesso('Turma salva'); this.cancelar(); this.carregar(); });
  }

  desativar(t: Turma) {
    if (!confirm(`Desativar a turma ${t.nome}?`)) return;
    this.api.desativarTurma(t.id).subscribe(() => { this.toast.sucesso('Turma desativada'); this.carregar(); });
  }
}
