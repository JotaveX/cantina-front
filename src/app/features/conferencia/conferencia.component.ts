import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperacoesApi } from '../../core/api.service';
import { ResumoConferencia } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { hojeIso } from '../../shared/datas';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

/**
 * Conferência da secretaria: o aluno recebe uma ficha física por produto no PDV e entrega no balcão.
 * Aqui se conta as fichas recolhidas e o dinheiro do caixa e compara com o que o sistema vendeu no dia.
 */
@Component({
  selector: 'app-conferencia',
  imports: [FormsModule, DatePipe, DinheiroPipe],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Conferência de fichas</h1>
          <p>Conte as fichas recolhidas no balcão e o dinheiro do caixa, e confira com o que foi vendido no dia.</p>
        </div>
      </div>

      <div class="filters">
        <div class="field"><label>Dia</label><input class="input" type="date" [max]="hoje" [ngModel]="data()" (ngModelChange)="trocarDia($event)" /></div>
        <button class="btn" (click)="carregar()">Atualizar</button>
      </div>

      @if (carregando() && !r()) { <div class="loading">Carregando…</div> }
      @if (r(); as r) {
        <div class="grid grid-4 mb">
          <div class="card stat destaque">
            <span class="label">Dinheiro que deve ter no caixa</span>
            <span class="value">{{ r.dinheiroEsperado | dinheiro }}</span>
            <span class="sub">{{ r.quantidadeVendasDinheiro }} venda(s) paga(s) em dinheiro</span>
          </div>
          <div class="card stat">
            <span class="label">Fichas vendidas</span>
            <span class="value">{{ r.totalFichas }}</span>
            <span class="sub">{{ r.quantidadeVendas }} venda(s){{ r.quantidadeCanceladas ? ' · ' + r.quantidadeCanceladas + ' cancelada(s), não contam' : '' }}</span>
          </div>
          <div class="card stat">
            <span class="label">Vendido no dia</span>
            <span class="value">{{ r.totalVendido | dinheiro }}</span>
            <span class="sub">{{ r.dinheiroEsperado | dinheiro }} dinheiro · {{ r.totalFiado | dinheiro }} fiado</span>
          </div>
          <div class="card stat">
            <span class="label">Última conferência</span>
            @if (ultima(); as u) {
              <span class="value" [class.pos]="u.confere" [class.neg]="!u.confere">{{ u.confere ? 'Confere' : 'Divergente' }}</span>
              <span class="sub">às {{ u.dataHora | date:'HH:mm' }}{{ u.usuarioNome ? ' por ' + u.usuarioNome : '' }}</span>
            } @else {
              <span class="value muted">—</span>
              <span class="sub">nenhuma conferência neste dia</span>
            }
          </div>
        </div>

        @if (desatualizada()) {
          <div class="alert alert-warn mb">Houve vendas ou cancelamentos depois da última conferência. Os números acima já estão atualizados; confira de novo.</div>
        }

        <div class="grid conferencia-grid">
          <section class="card">
            <div class="row-between mb">
              <h2>Fichas por produto</h2>
              @if (faltamContar() > 0) { <span class="muted small">{{ faltamContar() }} produto(s) sem contagem</span> }
            </div>
            <div class="table-wrap"><table class="table">
              <thead><tr><th>Produto</th><th class="num">Vendidas</th><th class="num" style="width:140px">Recolhidas</th><th class="num">Diferença</th></tr></thead>
              <tbody>
                @for (p of r.produtos; track p.produtoId) {
                  <tr>
                    <td>{{ p.nome }}</td>
                    <td class="num">{{ p.quantidadeVendida }}</td>
                    <td><input class="input num" type="number" min="0" inputmode="numeric" [ngModel]="contagem()[p.produtoId] ?? ''" (ngModelChange)="definir(p.produtoId, $event)" /></td>
                    <td class="num" [class.neg]="(dif(p.produtoId, p.quantidadeVendida) ?? 0) < 0" [class.pos]="(dif(p.produtoId, p.quantidadeVendida) ?? 0) > 0">
                      @if (dif(p.produtoId, p.quantidadeVendida); as d) { {{ d > 0 ? '+' : '' }}{{ d }} }
                      @else if (dif(p.produtoId, p.quantidadeVendida) === 0) { ok } @else { — }
                    </td>
                  </tr>
                } @empty { <tr><td colspan="4" class="empty">Nenhuma venda neste dia.</td></tr> }
              </tbody>
              @if (r.produtos.length > 0) {
                <tfoot><tr><td>Total</td><td class="num">{{ r.totalFichas }}</td><td class="num">{{ totalRecolhidas() }}</td>
                  @if (faltamContar() > 0) { <td class="num">—</td> }
                  @else {
                    <td class="num" [class.neg]="totalRecolhidas() - r.totalFichas < 0" [class.pos]="totalRecolhidas() - r.totalFichas > 0">
                      {{ totalRecolhidas() - r.totalFichas > 0 ? '+' : '' }}{{ totalRecolhidas() - r.totalFichas }}</td>
                  }</tr></tfoot>
              }
            </table></div>
          </section>

          <section class="card stack">
            <h2>Caixa</h2>
            <div class="row-between"><span class="muted">Esperado (vendas em dinheiro)</span><strong class="num">{{ r.dinheiroEsperado | dinheiro }}</strong></div>
            <div class="field">
              <label>Dinheiro contado no caixa</label>
              <input class="input num" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" [ngModel]="dinheiroContado() ?? ''" (ngModelChange)="definirDinheiro($event)" />
            </div>
            @if (difDinheiro(); as d) {
              <div class="row-between"><span class="muted">{{ d > 0 ? 'Sobrando' : 'Faltando' }}</span><strong class="num" [class.neg]="d < 0" [class.pos]="d > 0">{{ (d < 0 ? -d : d) | dinheiro }}</strong></div>
            } @else if (difDinheiro() === 0) {
              <div class="row-between"><span class="muted">Diferença</span><strong class="pos">Confere</strong></div>
            }
            <div class="field">
              <label>Observação</label>
              <input class="input" placeholder="Ex.: conferência do recreio da manhã" [ngModel]="observacao()" (ngModelChange)="observacao.set($event)" />
            </div>
            <button class="btn btn-primary" (click)="salvar()" [disabled]="!podeSalvar()">{{ salvando() ? 'Salvando…' : 'Salvar conferência' }}</button>
            @if (r.produtos.length > 0 && faltamContar() > 0) { <span class="small muted">Preencha as fichas recolhidas de todos os produtos (use 0 se não voltou nenhuma).</span> }
          </section>
        </div>

        @if (r.conferencias.length > 0) {
          <h2 class="mt mb">Conferências deste dia</h2>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Hora</th><th>Por</th><th class="num">Fichas (recolhidas / vendidas)</th><th class="num">Dinheiro (contado / esperado)</th><th>Situação</th><th>Observação</th></tr></thead>
            <tbody>@for (c of r.conferencias; track c.id) {
              <tr>
                <td>{{ c.dataHora | date:'HH:mm' }}</td>
                <td>{{ c.usuarioNome ?? '—' }}</td>
                <td class="num">{{ c.totalFichasRecolhidas }} / {{ c.totalFichasVendidas }}</td>
                <td class="num">@if (c.dinheiroContado !== undefined && c.dinheiroContado !== null) { {{ c.dinheiroContado | dinheiro }} } @else { — } / {{ c.dinheiroEsperado | dinheiro }}</td>
                <td>
                  @if (c.confere) { <span class="badge badge-green">Confere</span> }
                  @else {
                    <span class="badge badge-red">Divergente</span>
                    <div class="small muted">{{ descreverDivergencias(c) }}</div>
                  }
                </td>
                <td class="small">{{ c.observacao ?? '' }}</td>
              </tr>
            }</tbody>
          </table></div>
        }
      }
    </div>
  `,
  styles: [`
    .conferencia-grid { grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr); align-items: start; }
    @media (max-width: 1000px) { .conferencia-grid { grid-template-columns: 1fr; } }
    .destaque { border-color: var(--primary); background: var(--primary-soft); }
    .destaque .value { color: var(--primary-ink); }
  `],
})
export class ConferenciaComponent {
  private api = inject(OperacoesApi);
  private toast = inject(ToastService);

  readonly hoje = hojeIso();
  data = signal(this.hoje);
  r = signal<ResumoConferencia | null>(null);
  carregando = signal(false);
  salvando = signal(false);
  contagem = signal<Record<number, number>>({});
  dinheiroContado = signal<number | null>(null);
  observacao = signal('');

  ultima = computed(() => this.r()?.conferencias[0] ?? null);
  /** A última conferência foi feita com números diferentes dos atuais (vendas/cancelamentos depois dela). */
  desatualizada = computed(() => {
    const r = this.r(), u = this.ultima();
    return !!r && !!u && (u.totalFichasVendidas !== r.totalFichas || Number(u.dinheiroEsperado) !== Number(r.dinheiroEsperado));
  });
  totalRecolhidas = computed(() => Object.values(this.contagem()).reduce((s, n) => s + n, 0));
  faltamContar = computed(() => (this.r()?.produtos ?? []).filter(p => this.contagem()[p.produtoId] === undefined).length);
  difDinheiro = computed(() => {
    const contado = this.dinheiroContado(), r = this.r();
    return contado === null || !r ? null : Math.round((contado - r.dinheiroEsperado) * 100) / 100;
  });
  podeSalvar = computed(() => {
    const r = this.r();
    if (!r || this.salvando() || this.faltamContar() > 0) return false;
    return r.produtos.length > 0 || this.dinheiroContado() !== null;
  });

  constructor() { this.carregar(); }

  trocarDia(data: string) {
    if (!data) return;
    this.data.set(data);
    this.limpar();
    this.carregar();
  }

  carregar() {
    this.carregando.set(true);
    this.api.resumoConferencia(this.data()).subscribe({
      next: r => { this.r.set(r); this.carregando.set(false); },
      error: () => this.carregando.set(false),
    });
  }

  definir(produtoId: number, valor: string | number | null) {
    this.contagem.update(c => {
      const n = { ...c };
      if (valor === '' || valor === null || valor === undefined || Number(valor) < 0) delete n[produtoId];
      else n[produtoId] = Math.floor(Number(valor));
      return n;
    });
  }

  definirDinheiro(valor: string | number | null) {
    this.dinheiroContado.set(valor === '' || valor === null || valor === undefined || Number(valor) < 0 ? null : Number(valor));
  }

  dif(produtoId: number, vendida: number): number | null {
    const v = this.contagem()[produtoId];
    return v === undefined ? null : v - vendida;
  }

  descreverDivergencias(c: { itens: { nomeProduto: string; diferenca: number }[]; diferencaDinheiro?: number }): string {
    const partes = c.itens.filter(i => i.diferenca !== 0)
      .map(i => `${i.nomeProduto} ${i.diferenca > 0 ? '+' : ''}${i.diferenca}`);
    const d = c.diferencaDinheiro;
    if (d !== undefined && d !== null && Number(d) !== 0) {
      const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(Number(d)));
      partes.push(`caixa ${Number(d) > 0 ? 'sobrando' : 'faltando'} ${valor}`);
    }
    return partes.join(' · ');
  }

  salvar() {
    const r = this.r();
    if (!r || !this.podeSalvar()) return;
    this.salvando.set(true);
    this.api.registrarConferencia({
      data: this.data(),
      dinheiroContado: this.dinheiroContado(),
      observacao: this.observacao().trim() || undefined,
      itens: r.produtos.map(p => ({ produtoId: p.produtoId, quantidadeRecolhida: this.contagem()[p.produtoId] ?? 0 })),
    }).subscribe({
      next: c => {
        if (c.confere) this.toast.sucesso('Conferência salva: tudo confere');
        else this.toast.info(`Conferência salva com divergência: ${this.descreverDivergencias(c)}`);
        this.salvando.set(false);
        this.limpar();
        this.carregar();
      },
      error: () => this.salvando.set(false),
    });
  }

  private limpar() {
    this.contagem.set({});
    this.dinheiroContado.set(null);
    this.observacao.set('');
  }
}
