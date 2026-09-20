import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CadastrosApi } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Aluno, Turma } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-aluno-form',
  imports: [ReactiveFormsModule, RouterLink, DinheiroPipe],
  template: `
    <div class="page" style="max-width: 820px">
      <div class="page-head">
        <div><h1>{{ id() ? 'Editar aluno' : 'Novo aluno' }}</h1>
          @if (aluno(); as a) { <p>Saldo atual: <strong [class.neg]="a.saldo < 0" [class.pos]="a.saldo > 0">{{ a.saldo | dinheiro }}</strong>. O saldo só muda por vendas e lançamentos.</p> }
          @else { <p>Deixe o código de barras em branco para gerar um automaticamente.</p> }
        </div>
        <a routerLink="/alunos" class="btn">Voltar</a>
      </div>
      <form class="card" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="form-grid">
          <div class="field full"><label>Nome</label><input class="input" formControlName="nome" />
            @if (form.controls.nome.touched && form.controls.nome.invalid) { <span class="error">Informe o nome.</span> }
          </div>
          <div class="field"><label>Turma</label>
            <select class="input" formControlName="turmaId">
              <option [ngValue]="null">Sem turma</option>
              @for (t of turmas(); track t.id) { <option [ngValue]="t.id">{{ t.nome }}</option> }
            </select>
          </div>
          <div class="field"><label>Código de barras da carteirinha</label>
            <div class="row" style="flex-wrap: nowrap">
              <input class="input" formControlName="codigoBarras" placeholder="Gerado automaticamente" />
              @if (id()) { <button type="button" class="btn" (click)="reemitir()">Reemitir</button> }
            </div>
            <span class="hint">Pode ler a etiqueta com o leitor com o cursor neste campo.</span>
          </div>
          <div class="field"><label>Responsável</label><input class="input" formControlName="responsavelNome" /></div>
          <div class="field"><label>Contato do responsável</label><input class="input" formControlName="responsavelContato" placeholder="Telefone ou e-mail" /></div>
          @if (id()) { <label class="check full"><input type="checkbox" formControlName="ativo" /> Aluno ativo</label> }
          <label class="check full"><input type="checkbox" formControlName="permiteSaldoNegativo" /> Pode ficar com saldo negativo (compra fiado no PDV mesmo sem saldo)</label>
        </div>
        <div class="row mt">
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || salvando()">{{ salvando() ? 'Salvando…' : 'Salvar' }}</button>
          @if (id() && auth.admin()) { <a [routerLink]="['/conta', id()]" class="btn">Ver conta e extrato</a> }
        </div>
      </form>
    </div>
  `,
})
export class AlunoFormComponent {
  id = input<string>();
  private fb = inject(FormBuilder);
  private api = inject(CadastrosApi);
  private router = inject(Router);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  turmas = signal<Turma[]>([]);
  aluno = signal<Aluno | null>(null);
  salvando = signal(false);
  form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    turmaId: [null as number | null],
    codigoBarras: [''],
    responsavelNome: [''],
    responsavelContato: [''],
    ativo: [true],
    permiteSaldoNegativo: [false],
  });

  constructor() {
    this.api.turmas().subscribe(t => this.turmas.set(t.filter(x => x.ativo)));
    setTimeout(() => { if (this.id()) this.carregar(Number(this.id())); });
  }

  private carregar(id: number) {
    this.api.aluno(id).subscribe(a => {
      this.aluno.set(a);
      this.form.patchValue({ nome: a.nome, turmaId: a.turmaId ?? null, codigoBarras: a.codigoBarras,
        responsavelNome: a.responsavelNome ?? '', responsavelContato: a.responsavelContato ?? '', ativo: a.ativo,
        permiteSaldoNegativo: a.permiteSaldoNegativo });
    });
  }

  salvar() {
    if (this.form.invalid) return;
    this.salvando.set(true);
    const v = this.form.getRawValue();
    this.api.salvarAluno({ id: this.id() ? Number(this.id()) : undefined, nome: v.nome!, turmaId: v.turmaId ?? undefined,
      codigoBarras: v.codigoBarras || undefined, responsavelNome: v.responsavelNome || undefined,
      responsavelContato: v.responsavelContato || undefined, ativo: v.ativo ?? true,
      permiteSaldoNegativo: v.permiteSaldoNegativo ?? false })
      .subscribe({
        next: a => { this.toast.sucesso(`Aluno salvo. Carteirinha: ${a.codigoBarras}`); this.router.navigate(['/alunos']); },
        error: () => this.salvando.set(false),
      });
  }

  reemitir() {
    if (!confirm('Gerar um novo código de barras? O código atual deixa de funcionar.')) return;
    this.api.reemitirCodigo(Number(this.id())).subscribe(a => {
      this.form.patchValue({ codigoBarras: a.codigoBarras });
      this.toast.sucesso(`Novo código: ${a.codigoBarras}`);
    });
  }
}
