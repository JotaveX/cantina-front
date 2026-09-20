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
          <div class="nome">{{ auth.usuario()?.nome }}</div>
          <div class="perfil">{{ auth.admin() ? 'Administrador' : 'Operador' }}</div>
          <div class="row" style="margin-top:8px">
            <button class="btn btn-sm btn-ghost" (click)="auth.logout()">Sair</button>
          </div>
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
    .usuario { padding: 12px 20px 14px; border-top: 1px solid rgba(255,255,255,.12); font-size: 0.9rem; }
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
      { rota: '/retirada', texto: 'Retirada no balcão' },
      { rota: '/dashboard', texto: 'Painel do dia', admin: true },
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
  ];

  grupos = computed(() => {
    const admin = this.auth.admin();
    return this.todos
      .map(g => ({ ...g, itens: g.itens.filter(i => !i.admin || admin) }))
      .filter(g => g.itens.length > 0);
  });
}
