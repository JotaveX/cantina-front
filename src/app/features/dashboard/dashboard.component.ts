import { DatePipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RelatoriosApi } from '../../core/api.service';
import { DashboardSocketService } from '../../core/dashboard-socket.service';
import { Dashboard } from '../../core/models';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, DinheiroPipe, RouterLink],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Painel do dia</h1>
          <p>
            {{ (d()?.data ?? hoje) | date:'EEEE, d \\'de\\' MMMM' }}
            @if (socket.conectado()) {
              <span class="ao-vivo" title="Atualizando em tempo real">● ao vivo</span>
            }
          </p>
        </div>
        <button class="btn" (click)="carregar()">Atualizar</button>
      </div>
      @if (carregando()) { <div class="loading">Carregando…</div> }
      @if (d(); as d) {
        <div class="grid grid-4">
          <div class="card stat">
            <span class="label">Vendido hoje</span>
            <span class="value">{{ d.hoje.totalGeral | dinheiro }}</span>
            <span class="sub">{{ d.hoje.quantidadeVendas }} fichas · {{ d.hoje.totalPago | dinheiro }} em dinheiro · {{ d.hoje.totalFiado | dinheiro }} fiado</span>
          </div>
          <div class="card stat">
            <span class="label">Fichas aguardando retirada</span>
            <span class="value" [class.neg]="d.pedidosPendentesRetirada > 0">{{ d.pedidosPendentesRetirada }}</span>
            <span class="sub"><a routerLink="/retirada">Ir para o balcão</a></span>
          </div>
          <div class="card stat">
            <span class="label">Alunos com saldo negativo</span>
            <span class="value">{{ d.alunosEmAtraso }}</span>
            <span class="sub">{{ d.totalEmAberto | dinheiro }} em aberto · <a routerLink="/relatorios/em-atraso">ver lista</a></span>
          </div>
          <div class="card stat">
            <span class="label">Vendido no mês</span>
            <span class="value">{{ d.mes.totalGeral | dinheiro }}</span>
            <span class="sub">{{ d.mes.quantidadeVendas }} fichas · {{ d.mes.totalFiado | dinheiro }} fiado</span>
          </div>
        </div>

        <div class="grid grid-2 mt">
          <div class="card">
            <div class="row-between mb">
              <h2>Estoque baixo <span class="muted small">({{ d.produtosEstoqueBaixo }})</span></h2>
              <a routerLink="/relatorios/estoque" class="btn btn-sm">Relatório de estoque</a>
            </div>
            @if (d.estoqueBaixo.length === 0) { <div class="empty">Nenhum produto abaixo do mínimo.</div> }
            @else {
              <table class="table">
                <thead><tr><th>Produto</th><th class="num">Estoque</th><th class="num">Mínimo</th></tr></thead>
                <tbody>
                  @for (p of d.estoqueBaixo; track p.id) {
                    <tr><td>{{ p.nome }}</td><td class="num neg">{{ p.quantidadeEstoque }}</td><td class="num">{{ p.estoqueMinimo }}</td></tr>
                  }
                </tbody>
              </table>
            }
          </div>
          <div class="card">
            <h2>Atalhos</h2>
            <div class="stack">
              <a routerLink="/pdv" class="btn btn-primary">Abrir ponto de venda</a>
              <a routerLink="/retirada" class="btn">Retirada no balcão</a>
              <a routerLink="/relatorios/reconciliacao" class="btn">Reconciliação pós-recreio</a>
              <a routerLink="/relatorios/fechamento" class="btn">Fechamento mensal</a>
              <a routerLink="/conta" class="btn">Adicionar crédito a um aluno</a>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .ao-vivo { margin-left: 8px; color: var(--primary); font-size: 0.85em; }
  `],
})
export class DashboardComponent {
  private api = inject(RelatoriosApi);
  protected socket = inject(DashboardSocketService);
  d = signal<Dashboard | null>(null);
  carregando = signal(false);
  hoje = new Date();

  constructor() {
    this.carregar();
    effect(() => {
      const atualizado = this.socket.dashboard();
      if (atualizado) this.d.set(atualizado);
    });
    this.socket.conectar();
    inject(DestroyRef).onDestroy(() => this.socket.desconectar());
  }

  carregar() {
    this.carregando.set(true);
    this.api.dashboard().subscribe({ next: d => { this.d.set(d); this.carregando.set(false); }, error: () => this.carregando.set(false) });
  }
}
