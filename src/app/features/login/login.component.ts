import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensagemErro } from '../../core/erro.util';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-bg">
      <div class="login-card">
        <div class="login-illustration">
          <img src="login-illustration.svg" alt="" aria-hidden="true" />
        </div>
        <form class="login-form" [formGroup]="form" (ngSubmit)="entrar()">
          <div class="brand">
            <img src="logo-anglo.png" width="44" height="44" alt="Anglo Pirapozinho" />
            <span>Cantina</span>
          </div>
          <h1>Entrar</h1>
          <p class="muted">Sistema de vendas, fichas e estoque do Anglo Pirapozinho.</p>
          <div class="field">
            <label for="login">Usuário</label>
            <input id="login" class="input" formControlName="login" autocomplete="username" autofocus />
          </div>
          <div class="field">
            <label for="senha">Senha</label>
            <input id="senha" class="input" type="password" formControlName="senha" autocomplete="current-password" />
          </div>
          @if (erro()) { <div class="alert alert-error">{{ erro() }}</div> }
          <button class="btn btn-primary btn-lg btn-block" type="submit" [disabled]="form.invalid || carregando()">
            {{ carregando() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-bg {
      min-height: 100vh; display: grid; place-items: center; padding: 40px 20px;
      background: var(--fresh-sky);
    }
    .login-card {
      width: 100%; max-width: 960px; min-height: 560px; background: var(--surface);
      border-radius: 24px; overflow: hidden; box-shadow: 0 30px 60px rgba(0, 23, 31, 0.28);
      display: grid; grid-template-columns: 1.1fr 1fr;
    }
    .login-illustration {
      order: 1; background: var(--bg); display: flex; align-items: center; justify-content: center; padding: 40px;
    }
    .login-illustration img { width: 100%; max-width: 420px; height: auto; }
    .login-form {
      order: 2; display: flex; flex-direction: column; gap: 14px; padding: 56px 48px; justify-content: center;
    }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.1rem; color: var(--primary-ink); margin-bottom: 8px; }
    .brand img { border-radius: 50%; }
    .login-form h1 { font-size: 1.7rem; }
    .login-form .muted { margin-bottom: 8px; }
    @media (max-width: 820px) {
      .login-card { grid-template-columns: 1fr; max-width: 420px; }
      .login-illustration { order: 1; padding: 28px 28px 0; }
      .login-illustration img { max-width: 220px; }
      .login-form { order: 2; padding: 32px 28px 40px; }
    }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = this.fb.nonNullable.group({
    login: ['', Validators.required],
    senha: ['', Validators.required],
  });
  carregando = signal(false);
  erro = signal('');

  entrar() {
    if (this.form.invalid) return;
    this.carregando.set(true);
    this.erro.set('');
    const { login, senha } = this.form.getRawValue();
    this.auth.login(login, senha).subscribe({
      next: r => {
        const voltar = this.route.snapshot.queryParamMap.get('voltar');
        this.router.navigateByUrl(voltar && voltar !== '/login' ? voltar : (r.usuario.perfil === 'ADMIN' ? '/dashboard' : '/pdv'));
      },
      error: err => { this.erro.set(mensagemErro(err)); this.carregando.set(false); },
    });
  }
}
