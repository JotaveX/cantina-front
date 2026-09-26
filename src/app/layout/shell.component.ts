import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastsComponent } from '../shared/toasts.component';

interface Item { rota: string; texto: string; admin?: boolean; }
interface Grupo { titulo: string; itens: Item[]; }

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastsComponent],
  template: `
    <div class="shell" [class.aberto]="menuAberto()">
      <aside class="sidebar">
        <a class="brand" routerLink="/">
          <img src="logo-anglo.png" width="32" height="32" alt="Anglo Pirapozinho" />
          <span>Cantina</span>
        </a>
        <nav>
          @for (g of grupos(); track g.titulo) {
            <div class="grupo">
              <div class="grupo-titulo">{{ g.titulo }}</div>
              @for (i of g.itens; track i.rota) {
                <a [routerLink]="i.rota" routerLinkActive="ativo" (click)="menuAberto.set(false)">{{ i.texto }}</a>
              }
            </div>
          }
        </nav>
        <div class="usuario">
          <div class="info">
            <div class="nome">{{ auth.usuario()?.nome }}</div>
            <div class="perfil">{{ auth.admin() ? 'Administrador' : 'Operador' }}</div>
          </div>
          @if (auth.admin()) {
            <a class="btn btn-sm btn-ghost engrenagem" routerLink="/configuracoes" routerLinkActive="ativo" (click)="menuAberto.set(false)"
               title="Configurações" aria-label="Configurações">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </a>
          }
          <button class="btn btn-sm btn-ghost" (click)="auth.logout()">Sair</button>
        </div>
      </aside>
      <div class="conteudo">
        <header class="topo">
          <button class="btn btn-ghost hamburger" (click)="menuAberto.set(!menuAberto())" aria-label="Menu">☰</button>
          <span class="topo-titulo">Cantina</span>
        </header>
        <main><router-outlet /></main>
      </div>
      <app-toasts />
    </div>
  `,
  styles: [`
    .shell { display: grid; grid-template-columns: 232px 1fr; min-height: 100vh; }
    .sidebar { background: var(--primary-deep); color: #d7ecf5; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
    .brand { display: flex; align-items: center; gap: 10px; padding: 20px 20px 14px; color: #fff; text-decoration: none; font-weight: 800; font-size: 1.25rem; letter-spacing: -0.01em; }
    .brand img { border-radius: 50%; }
    nav { flex: 1; padding: 6px 12px 12px; }
    .grupo { margin-bottom: 8px; }
    .grupo-titulo { font-size: 0.75rem; color: #7fb3cc; padding: 8px 10px 4px; font-weight: 600; }
    nav a { display: block; padding: 7px 10px; border-radius: 6px; color: #cbe4f0; text-decoration: none; font-weight: 500; font-size: 0.9375rem; }
    nav a:hover { background: rgba(255,255,255,.08); color: #fff; }
    nav a.ativo { background: var(--fresh-sky); color: #fff; font-weight: 700; }
    .usuario { display: flex; align-items: center; gap: 6px; padding: 12px 14px 14px 20px; border-top: 1px solid rgba(255,255,255,.12); font-size: 0.9rem; }
    .usuario .info { flex: 1; min-width: 0; }
    .usuario .nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .usuario .engrenagem { padding-left: 6px; padding-right: 6px; display: inline-flex; align-items: center; }
    .usuario .engrenagem.ativo { background: var(--fresh-sky); border-color: var(--fresh-sky); color: #fff; }
    .usuario .nome { font-weight: 600; color: #fff; }
    .usuario .perfil { color: #7fb3cc; font-size: 0.8125rem; }
    .usuario .btn-ghost { color: #cbe4f0; border-color: rgba(255,255,255,.2); text-decoration: none; }
    .usuario .btn-ghost:hover { background: rgba(255,255,255,.1); }
    .topo { display: none; align-items: center; gap: 8px; padding: 10px 12px; background: var(--surface); border-bottom: 1px solid var(--line); }
    .topo-titulo { font-weight: 700; }
    .hamburger { font-size: 1.2rem; }
    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      .sidebar { position: fixed; inset: 0 auto 0 0; width: 260px; transform: translateX(-100%); transition: transform .18s; z-index: 50; }
      .shell.aberto .sidebar { transform: none; }
      .topo { display: flex; }
    }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  menuAberto = signal(false);

  private todos: Grupo[] = [
    { titulo: 'Operação', itens: [
      { rota: '/pdv', texto: 'Ponto de venda' },
      { rota: '/conferencia', texto: 'Conferência de fichas' },
      { rota: '/dashboard', texto: 'Painel', admin: true },
    ] },
    { titulo: 'Cadastros', itens: [
      { rota: '/alunos', texto: 'Alunos' },
      { rota: '/turmas', texto: 'Turmas' },
      { rota: '/produtos', texto: 'Produtos' },
      { rota: '/fornecedores', texto: 'Fornecedores' },
      { rota: '/usuarios', texto: 'Usuários', admin: true },
    ] },
    { titulo: 'Estoque', itens: [
      { rota: '/compras', texto: 'Compras (entrada)', admin: true },
      { rota: '/baixas', texto: 'Baixa manual' },
      { rota: '/sobras', texto: 'Contagem de sobras' },
    ] },
    { titulo: 'Financeiro', itens: [
      { rota: '/conta', texto: 'Conta do aluno', admin: true },
      { rota: '/vendas', texto: 'Vendas', admin: true },
      { rota: '/relatorios', texto: 'Relatórios' },
    ] },
    { titulo: 'Documentos', itens: [
      { rota: '/documentos/consumo', texto: 'Consumo do aluno', admin: true },
      { rota: '/documentos/bilhetes', texto: 'Bilhetes de cobrança', admin: true },
      { rota: '/documentos/carteirinhas', texto: 'Carteirinhas' },
    ] },
  ];

  grupos = computed(() => {
    const admin = this.auth.admin();
    return this.todos
      .map(g => ({ ...g, itens: g.itens.filter(i => !i.admin || admin) }))
      .filter(g => g.itens.length > 0);
  });
}
