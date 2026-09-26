import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/** Documentos para imprimir e entregar (consumo do aluno, bilhetes de cobrança, carteirinhas). */
@Component({
  selector: 'app-documentos',
  imports: [RouterOutlet],
  template: `
    <div class="page">
      <div class="page-head no-print"><div><h1>Documentos</h1></div></div>
      <router-outlet />
    </div>
  `,
})
export class DocumentosComponent {
  private auth = inject(AuthService);
  private todas = [
    { rota: 'consumo', texto: 'Consumo do aluno', admin: true },
    { rota: 'bilhetes', texto: 'Bilhetes de cobrança', admin: true },
    { rota: 'carteirinhas', texto: 'Carteirinhas' },
  ];
  abas = computed(() => this.todas.filter(t => !t.admin || this.auth.admin()));
}
