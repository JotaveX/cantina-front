import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CadastrosApi } from '../../core/api.service';
import { Perfil, Usuario } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule, DatePipe, StatusBadgeComponent],
  template: `
    <div class="page" style="max-width: 980px">
      <div class="page-head"><div><h1>Usuários</h1><p>Administradores têm acesso total. Operadores fazem cadastros, vendas, retiradas e estoque.</p></div></div>
      <form class="card card-tight mb" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="form-grid" style="grid-template-columns: 2fr 1.5fr 1.5fr 1fr">
          <div class="field"><label>Nome</label><input class="input" formControlName="nome" /></div>
          <div class="field"><label>Login</label><input class="input" formControlName="login" autocomplete="off" /></div>
          <div class="field"><label>{{ editando() ? 'Nova senha (opcional)' : 'Senha' }}</label><input class="input" type="password" formControlName="senha" autocomplete="new-password" /></div>
          <div class="field"><label>Perfil</label>
            <select class="input" formControlName="perfil"><option value="OPERADOR">Operador</option><option value="ADMIN">Admin</option></select></div>
        </div>
        <div class="row mt">
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || (!editando() && !form.value.senha)">{{ editando() ? 'Salvar' : 'Criar usuário' }}</button>
          @if (editando()) { <button class="btn" type="button" (click)="cancelar()">Cancelar</button> }
        </div>
      </form>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Situação</th><th>Criado em</th><th></th></tr></thead>
          <tbody>
            @for (u of lista(); track u.id) {
              <tr>
                <td>{{ u.nome }}</td><td>{{ u.login }}</td><td><app-badge [valor]="u.perfil" /></td>
                <td><span class="badge" [class.badge-green]="u.ativo">{{ u.ativo ? 'Ativo' : 'Inativo' }}</span></td>
                <td>{{ u.criadoEm | date:'dd/MM/yyyy' }}</td>
                <td class="actions">
                  <button class="btn btn-sm" (click)="editar(u)">Editar</button>
                  @if (u.ativo) { <button class="btn btn-sm btn-danger" (click)="desativar(u)">Desativar</button> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class UsuariosComponent {
  private fb = inject(FormBuilder);
  private api = inject(CadastrosApi);
  private toast = inject(ToastService);
  lista = signal<Usuario[]>([]);
  editando = signal<Usuario | null>(null);
  form = this.fb.nonNullable.group({
    nome: ['', Validators.required], login: ['', [Validators.required, Validators.minLength(3)]],
    senha: [''], perfil: ['OPERADOR' as Perfil, Validators.required],
  });

  constructor() { this.carregar(); }
  carregar() { this.api.usuarios().subscribe(l => this.lista.set(l)); }
  editar(u: Usuario) { this.editando.set(u); this.form.setValue({ nome: u.nome, login: u.login, senha: '', perfil: u.perfil }); }
  cancelar() { this.editando.set(null); this.form.reset({ perfil: 'OPERADOR' }); }

  salvar() {
    const v = this.form.getRawValue();
    const atual = this.editando();
    this.api.salvarUsuario({ id: atual?.id, nome: v.nome, login: v.login, senha: v.senha || undefined, perfil: v.perfil, ativo: atual ? atual.ativo : true })
      .subscribe(() => { this.toast.sucesso('Usuário salvo'); this.cancelar(); this.carregar(); });
  }

  desativar(u: Usuario) {
    if (!confirm(`Desativar o acesso de ${u.nome}?`)) return;
    this.api.desativarUsuario(u.id).subscribe(() => { this.toast.sucesso('Usuário desativado'); this.carregar(); });
  }
}
