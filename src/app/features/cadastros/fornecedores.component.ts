import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CadastrosApi } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Fornecedor } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-fornecedores',
  imports: [ReactiveFormsModule],
  template: `
    <div class="page" style="max-width: 900px">
      <div class="page-head"><div><h1>Fornecedores</h1><p>Usados nas compras (entrada de estoque).</p></div></div>
      <form class="card card-tight mb" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="row" style="align-items: flex-end">
          <div class="field" style="flex:1"><label>Nome</label><input class="input" formControlName="nome" /></div>
          <div class="field" style="flex:1"><label>Contato</label><input class="input" formControlName="contato" placeholder="Telefone, e-mail ou vendedor" /></div>
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid">{{ editando() ? 'Salvar' : 'Adicionar' }}</button>
          @if (editando()) { <button class="btn" type="button" (click)="cancelar()">Cancelar</button> }
        </div>
      </form>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Nome</th><th>Contato</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            @for (f of lista(); track f.id) {
              <tr>
                <td>{{ f.nome }}</td><td>{{ f.contato || '—' }}</td>
                <td><span class="badge" [class.badge-green]="f.ativo">{{ f.ativo ? 'Ativo' : 'Inativo' }}</span></td>
                <td class="actions">
                  <button class="btn btn-sm" (click)="editar(f)">Editar</button>
                  @if (f.ativo && auth.admin()) { <button class="btn btn-sm btn-danger" (click)="desativar(f)">Desativar</button> }
                </td>
              </tr>
            } @empty { <tr><td colspan="4" class="empty">Nenhum fornecedor cadastrado.</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class FornecedoresComponent {
  private fb = inject(FormBuilder);
  private api = inject(CadastrosApi);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  lista = signal<Fornecedor[]>([]);
  editando = signal<Fornecedor | null>(null);
  form = this.fb.nonNullable.group({ nome: ['', Validators.required], contato: [''] });

  constructor() { this.carregar(); }
  carregar() { this.api.fornecedores().subscribe(l => this.lista.set(l)); }
  editar(f: Fornecedor) { this.editando.set(f); this.form.setValue({ nome: f.nome, contato: f.contato ?? '' }); }
  cancelar() { this.editando.set(null); this.form.reset(); }

  salvar() {
    const v = this.form.getRawValue();
    const atual = this.editando();
    this.api.salvarFornecedor({ id: atual?.id, nome: v.nome, contato: v.contato || undefined, ativo: atual ? atual.ativo : true })
      .subscribe(() => { this.toast.sucesso('Fornecedor salvo'); this.cancelar(); this.carregar(); });
  }

  desativar(f: Fornecedor) {
    if (!confirm(`Desativar ${f.nome}?`)) return;
    this.api.desativarFornecedor(f.id).subscribe(() => { this.toast.sucesso('Fornecedor desativado'); this.carregar(); });
  }
}
