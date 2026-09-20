import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { OperacoesApi } from '../../core/api.service';
import { Venda } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';
import { ScannerInputComponent } from '../../shared/scanner-input.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-retirada',
  imports: [DatePipe, DinheiroPipe, ScannerInputComponent, StatusBadgeComponent],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Retirada no balcão</h1>
          <p>Leia a carteirinha do aluno para ver as fichas pendentes dele e marcar o que foi entregue.</p>
        </div>
        <button class="btn" (click)="verTodasDeHoje()">Ver todas as pendentes de hoje</button>
      </div>

      <app-scanner-input [grande]="true" placeholder="Leia a carteirinha do aluno" (lido)="ler($event)" />

      @if (carregando()) { <div class="loading">Buscando fichas…</div> }
      @else if (fichas() !== null) {
        <div class="row-between mt mb">
          <h2>
            @if (alunoNome(); as n) { Fichas de {{ n }} } @else { Fichas pendentes de hoje }
            <span class="muted small">({{ fichas()!.length }})</span>
          </h2>
          @if (fichas()!.length > 0 && alunoNome()) {
            <button class="btn btn-primary" (click)="entregarTodas()" [disabled]="processando()">Entregar todas</button>
          }
        </div>
        @if (fichas()!.length === 0) {
          <div class="card empty"><strong>Nada pendente</strong>{{ alunoNome() ? 'Este aluno não tem fichas para retirar.' : 'Nenhuma ficha pendente hoje.' }}</div>
        }
        <div class="fichas">
          @for (f of fichas(); track f.id) {
            <article class="ficha">
              <div class="ficha-head">
                <div>
                  <div class="ficha-num">Ficha #{{ f.id }}</div>
                  <div class="small muted">{{ f.alunoNome }}{{ f.alunoTurma ? ' · ' + f.alunoTurma : '' }} · {{ f.dataHora | date:'HH:mm' }}</div>
                </div>
                <div class="row" style="gap:6px"><app-badge [valor]="f.formaPagamento" /><app-badge [valor]="f.status" /></div>
              </div>
              <div class="ficha-body">
                @for (i of f.itens; track i.id) {
                  <div class="ficha-item" [class.done]="i.retirado">
                    <div><strong>{{ i.quantidade }}×</strong> {{ i.nomeProduto }}</div>
                    @if (i.retirado) { <span class="small">entregue</span> }
                    @else { <button class="btn btn-sm" (click)="entregarItem(f, i.id)" [disabled]="processando()">Entregar</button> }
                  </div>
                }
              </div>
              <div class="ficha-foot">
                <span class="num strong">{{ f.valorTotal | dinheiro }}</span>
                <button class="btn btn-primary btn-sm" (click)="entregarFicha(f)" [disabled]="processando()">Entregar ficha inteira</button>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="card empty mt"><strong>Aguardando leitura</strong>Aponte o leitor para a carteirinha do aluno.</div>
      }
    </div>
  `,
  styles: [`
    .fichas { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  `],
})
export class RetiradaComponent {
  private api = inject(OperacoesApi);
  private toast = inject(ToastService);

  fichas = signal<Venda[] | null>(null);
  codigoAtual = signal<string | null>(null);
  carregando = signal(false);
  processando = signal(false);
  alunoNome = computed(() => this.codigoAtual() ? (this.fichas()?.[0]?.alunoNome ?? this.nomeUltimoAluno()) : null);
  private nomeUltimoAluno = signal<string | null>(null);

  ler(codigo: string) {
    this.codigoAtual.set(codigo);
    this.carregar();
  }

  verTodasDeHoje() {
    this.codigoAtual.set(null);
    this.carregar();
  }

  private carregar() {
    this.carregando.set(true);
    const codigo = this.codigoAtual();
    this.api.pendentes(codigo ? { codigoBarras: codigo } : {}).subscribe({
      next: l => {
        this.fichas.set(l);
        if (codigo && l.length === 0) this.nomeUltimoAluno.set('aluno lido');
        this.carregando.set(false);
      },
      error: () => { this.fichas.set(null); this.carregando.set(false); },
    });
  }

  entregarItem(f: Venda, itemId: number) {
    this.processando.set(true);
    this.api.retirarItem(f.id, itemId).subscribe({
      next: v => { this.substituir(v); this.processando.set(false); },
      error: () => this.processando.set(false),
    });
  }

  entregarFicha(f: Venda) {
    this.processando.set(true);
    this.api.retirarPedido(f.id).subscribe({
      next: v => { this.substituir(v); this.toast.sucesso(`Ficha #${v.id} entregue`); this.processando.set(false); },
      error: () => this.processando.set(false),
    });
  }

  entregarTodas() {
    const pendentes = this.fichas() ?? [];
    if (pendentes.length === 0) return;
    this.processando.set(true);
    let restantes = pendentes.length;
    for (const f of pendentes) {
      this.api.retirarPedido(f.id).subscribe({
        next: v => { this.substituir(v); if (--restantes === 0) { this.processando.set(false); this.toast.sucesso('Todas as fichas entregues'); } },
        error: () => { if (--restantes === 0) this.processando.set(false); },
      });
    }
  }

  /** Atualiza a ficha na lista; remove quando estiver totalmente retirada. */
  private substituir(v: Venda) {
    this.fichas.update(l => (l ?? [])
      .map(f => f.id === v.id ? v : f)
      .filter(f => f.status === 'PENDENTE' || f.status === 'RETIRADO_PARCIAL'));
  }
}
