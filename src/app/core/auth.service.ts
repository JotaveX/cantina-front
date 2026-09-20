import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponse, Usuario } from './models';
import { SILENCIAR_ERRO } from './http-context';

const CHAVE = 'cantina.sessao';

interface Sessao { token: string; expiraEm: string; usuario: Usuario; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private sessao = signal<Sessao | null>(this.carregar());

  readonly usuario = computed(() => this.sessao()?.usuario ?? null);
  readonly token = computed(() => this.sessao()?.token ?? null);
  readonly autenticado = computed(() => {
    const s = this.sessao();
    return !!s && new Date(s.expiraEm).getTime() > Date.now();
  });
  readonly admin = computed(() => this.usuario()?.perfil === 'ADMIN');

  login(login: string, senha: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { login, senha }, { context: new HttpContext().set(SILENCIAR_ERRO, true) })
      .pipe(tap(r => this.guardar({ token: r.token, expiraEm: r.expiraEm, usuario: r.usuario })));
  }

  logout(redirecionar = true) {
    this.sessao.set(null);
    try { localStorage.removeItem(CHAVE); } catch { /* storage indisponível */ }
    if (redirecionar) this.router.navigate(['/login']);
  }

  private guardar(s: Sessao) {
    this.sessao.set(s);
    try { localStorage.setItem(CHAVE, JSON.stringify(s)); } catch { /* storage indisponível */ }
  }

  private carregar(): Sessao | null {
    try {
      const raw = localStorage.getItem(CHAVE);
      if (!raw) return null;
      const s = JSON.parse(raw) as Sessao;
      return new Date(s.expiraEm).getTime() > Date.now() ? s : null;
    } catch {
      return null;
    }
  }
}
