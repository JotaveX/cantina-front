import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-relatorios',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="page">
      <div class="page-head"><div><h1>Relatórios</h1></div><button class="btn" onclick="window.print()">Imprimir</button></div>
      <nav class="tabs">
        @for (t of abas(); track t.rota) { <a [routerLink]="t.rota" routerLinkActive="active">{{ t.texto }}</a> }
      </nav>
      <router-outlet />
    </div>
  `,
})
export class RelatoriosComponent {
  private auth = inject(AuthService);
  private todas = [
    { rota: 'estoque', texto: 'Estoque' },
    { rota: 'fichas', texto: 'Fichas por produto' },
    { rota: 'carteirinhas', texto: 'Carteirinhas' },
    { rota: 'reconciliacao', texto: 'Reconciliação', admin: true },
    { rota: 'vendas-periodo', texto: 'Vendas por período', admin: true },
    { rota: 'em-atraso', texto: 'Em atraso', admin: true },
    { rota: 'fechamento', texto: 'Fechamento mensal', admin: true },
  ];
  abas = computed(() => this.todas.filter(t => !t.admin || this.auth.admin()));
}
