import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RelatoriosApi } from '../../core/api.service';
import { DashboardSocketService } from '../../core/dashboard-socket.service';
import { Dashboard, MotivoBaixa, PontoFaturamento, ProdutoAlerta, Tendencias } from '../../core/models';
import { dataBr, mesAno } from '../../shared/datas';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';
import { GraficoLinhaComponent, PontoGrafico } from '../../shared/grafico-linha.component';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const LIMITE_LISTA = 8;
const MOTIVOS: Record<MotivoBaixa, string> = { VENCIMENTO: 'Vencimento', PERDA: 'Perda', QUEBRA: 'Quebra', OUTRO: 'Outros' };

type Nivel = 'critico' | 'atencao' | 'ok';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, DinheiroPipe, RouterLink, GraficoLinhaComponent],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Painel</h1>
          <p>
            {{ (d()?.data ?? hoje) | date:'EEEE, d \\'de\\' MMMM' }}
          </p>
        </div>
        <button class="btn" (click)="carregar()">Atualizar</button>
      </div>
      @if (carregando() && !d()) { <div class="loading">Carregando…</div> }

      @if (d(); as d) {
        <!-- ================= Alertas (prioridade máxima) ================= -->
        <div class="grid grid-4">
          <a class="card alerta" [attr.data-nivel]="nivelEstoque()" routerLink="/relatorios/estoque">
            <span class="rotulo">Estoque</span>
            <span class="numeros">
              <span><span class="grande">{{ d.estoqueZerado.length }}</span> zerado{{ d.estoqueZerado.length === 1 ? '' : 's' }}</span>
              <span class="menor"><span class="medio">{{ d.estoqueBaixo.length }}</span> abaixo do mínimo</span>
            </span>
          </a>
          <div class="card alerta" [attr.data-nivel]="nivelValidade()">
            <span class="rotulo">Validade</span>
            <span class="numeros">
              <span><span class="grande">{{ d.vencidos.length }}</span> vencido{{ d.vencidos.length === 1 ? '' : 's' }} com estoque</span>
              <span class="menor"><span class="medio">{{ d.vencendo.length }}</span> vence{{ d.vencendo.length === 1 ? '' : 'm' }} em até {{ d.diasAlertaValidade }} dias</span>
            </span>
          </div>
          <a class="card alerta" [attr.data-nivel]="d.divergenciasCaixa.length ? 'critico' : 'ok'" routerLink="/conferencia">
            <span class="rotulo">Caixa e fichas</span>
            <span class="numeros">
              <span><span class="grande">{{ d.divergenciasCaixa.length }}</span> dia{{ d.divergenciasCaixa.length === 1 ? '' : 's' }} com divergência</span>
              <span class="menor">nas conferências dos últimos {{ d.diasDivergenciaCaixa }} dias</span>
            </span>
          </a>
          <a class="card alerta" [attr.data-nivel]="d.alunosEmAtraso ? 'atencao' : 'ok'" routerLink="/relatorios/em-atraso">
            <span class="rotulo">Saldo negativo</span>
            <span class="numeros">
              <span><span class="grande">{{ d.alunosEmAtraso }}</span> aluno{{ d.alunosEmAtraso === 1 ? '' : 's' }}</span>
              <span class="menor"><span class="medio">{{ d.totalEmAberto | dinheiro }}</span> em aberto</span>
            </span>
          </a>
        </div>

        <!-- ================= Hoje ================= -->
        <div class="grid grid-4 mt">
          <div class="card stat">
            <span class="label">Faturamento de hoje</span>
            <span class="value">{{ d.hoje.totalGeral | dinheiro }}</span>
            @if (d.hoje.mediaDiaSemana != null) {
              <span class="sub">
                <span [class.pos]="variacaoHoje()! >= 0" [class.neg]="variacaoHoje()! < 0" class="strong">{{ percentual(variacaoHoje()) }}</span>
                até agora vs média de {{ diaSemana() }} ({{ d.hoje.mediaDiaSemana | dinheiro }})
              </span>
              <span class="sub">média de {{ d.hoje.diasNaMedia }} {{ d.hoje.diasNaMedia === 1 ? 'dia' : 'dias' }} com venda nas últimas {{ d.hoje.semanasNaMedia }} semanas</span>
            } @else {
              <span class="sub">Sem vendas em {{ diaSemana() }} nas últimas {{ d.hoje.semanasNaMedia }} semanas para comparar.</span>
            }
          </div>
          <div class="card stat">
            <span class="label">Vendas de hoje</span>
            <span class="value">{{ d.hoje.quantidadeVendas }}</span>
            <span class="sub">{{ d.hoje.totalPago | dinheiro }} na hora · {{ d.hoje.totalFiado | dinheiro }} fiado</span>
          </div>
          <div class="card stat">
            <span class="label">Ticket médio de hoje</span>
            <span class="value">{{ d.hoje.ticketMedio != null ? (d.hoje.ticketMedio | dinheiro) : '—' }}</span>
            <span class="sub">valor médio por venda</span>
          </div>
          <div class="card stat">
            <span class="label">Dinheiro esperado no caixa</span>
            <span class="value">{{ d.hoje.totalPago | dinheiro }}</span>
            <span class="sub"><a routerLink="/conferencia">Conferir fichas e caixa</a></span>
          </div>
        </div>

        <!-- ================= Detalhe dos alertas (só o que tem pendência) ================= -->
        @if (d.estoqueZerado.length || d.estoqueBaixo.length || d.vencidos.length || d.vencendo.length || d.divergenciasCaixa.length) {
          <div class="grid grid-3 mt">
            @if (d.estoqueZerado.length || d.estoqueBaixo.length) {
              <div class="card">
                <div class="row-between mb"><h3>Repor estoque</h3><a routerLink="/relatorios/estoque" class="small">Relatório</a></div>
                <table class="table compacta">
                  <thead><tr><th>Produto</th><th class="num">Estoque</th><th class="num">Mín.</th></tr></thead>
                  <tbody>
                    @for (p of listaEstoque(); track p.id) {
                      <tr><td><a [routerLink]="['/produtos', p.id]">{{ p.nome }}</a></td>
                        <td class="num strong" [class.neg]="p.quantidadeEstoque <= 0" [class.aviso]="p.quantidadeEstoque > 0">{{ p.quantidadeEstoque }}</td>
                        <td class="num">{{ p.estoqueMinimo }}</td></tr>
                    }
                  </tbody>
                </table>
                @if (restanteEstoque() > 0) { <p class="small muted mt">e mais {{ restanteEstoque() }} no relatório.</p> }
              </div>
            }
            @if (d.vencidos.length || d.vencendo.length) {
              <div class="card">
                <div class="row-between mb"><h3>Validade</h3><a routerLink="/baixas" class="small">Baixa manual</a></div>
                <table class="table compacta">
                  <thead><tr><th>Produto</th><th class="num">Estoque</th><th>Validade</th></tr></thead>
                  <tbody>
                    @for (p of listaValidade(); track p.id) {
                      <tr><td><a [routerLink]="['/produtos', p.id]">{{ p.nome }}</a></td>
                        <td class="num">{{ p.quantidadeEstoque }}</td>
                        <td><span class="badge" [class.badge-red]="p.diasParaVencer! < 0" [class.badge-amber]="p.diasParaVencer! >= 0">{{ prazo(p) }}</span></td></tr>
                    }
                  </tbody>
                </table>
                @if (restanteValidade() > 0) { <p class="small muted mt">e mais {{ restanteValidade() }}.</p> }
              </div>
            }
            @if (d.divergenciasCaixa.length) {
              <div class="card">
                <div class="row-between mb"><h3>Divergências de caixa</h3><a routerLink="/conferencia" class="small">Conferência</a></div>
                <table class="table compacta">
                  <thead><tr><th>Dia</th><th class="num">Dinheiro</th><th class="num">Fichas</th></tr></thead>
                  <tbody>
                    @for (c of d.divergenciasCaixa; track c.conferenciaId) {
                      <tr><td>{{ dataCurta(c.data) }}</td>
                        <td class="num strong" [class.neg]="(c.diferencaDinheiro ?? 0) !== 0">
                          @if (c.diferencaDinheiro == null) { <span class="muted">não contado</span> }
                          @else { {{ sinal(c.diferencaDinheiro) }}{{ abs(c.diferencaDinheiro) | dinheiro }} }
                        </td>
                        <td class="num strong" [class.neg]="c.diferencaFichas !== 0">{{ c.diferencaFichas > 0 ? '+' : '' }}{{ c.diferencaFichas }}</td></tr>
                    }
                  </tbody>
                </table>
                <p class="small muted mt">Positivo = sobrou; negativo = faltou. Vale a última conferência de cada dia.</p>
              </div>
            }
          </div>
        }
      }

      <!-- ================= Tendências do ciclo (consulta menos frequente, visual discreto) ================= -->
      @if (t(); as t) {
        <div class="secao-historico">
          <div class="row-between">
            <div>
              <h2>Ciclo de {{ mesAno(t.comparativo.cicloAtual.ano, t.comparativo.cicloAtual.mes) }}</h2>
              <p class="small muted">{{ dataCurta(t.comparativo.cicloAtual.inicio) }} a {{ dataCurta(t.comparativo.cicloAtual.fim) }} · mesmo período do fechamento mensal · atualiza ao abrir o painel ou em "Atualizar"</p>
            </div>
          </div>

          <div class="grid grid-3 mt">
            <div class="card discreto">
              <h3>Ciclo atual × anterior</h3>
              <p class="small muted mb">Até {{ dataCurta(t.data) }} × até {{ dataCurta(t.comparativo.anteriorMesmoPontoAte) }} (mesmo nº de dias)</p>
              <table class="table compacta">
                <thead><tr><th></th><th class="num">Atual</th><th class="num">Anterior</th><th class="num">Var.</th></tr></thead>
                <tbody>
                  <tr><td>Faturamento</td><td class="num">{{ t.comparativo.atual.faturamento | dinheiro }}</td>
                    <td class="num">{{ t.comparativo.anteriorMesmoPonto.faturamento | dinheiro }}</td>
                    <td class="num" [class.pos]="(varFat() ?? 0) >= 0" [class.neg]="(varFat() ?? 0) < 0">{{ percentual(varFat()) }}</td></tr>
                  <tr><td>Vendas</td><td class="num">{{ t.comparativo.atual.quantidadeVendas }}</td>
                    <td class="num">{{ t.comparativo.anteriorMesmoPonto.quantidadeVendas }}</td>
                    <td class="num" [class.pos]="(varQtd() ?? 0) >= 0" [class.neg]="(varQtd() ?? 0) < 0">{{ percentual(varQtd()) }}</td></tr>
                  <tr><td>Ticket médio</td><td class="num">{{ t.comparativo.atual.ticketMedio | dinheiro }}</td>
                    <td class="num">{{ t.comparativo.anteriorMesmoPonto.ticketMedio | dinheiro }}</td>
                    <td class="num" [class.pos]="(varTicket() ?? 0) >= 0" [class.neg]="(varTicket() ?? 0) < 0">{{ percentual(varTicket()) }}</td></tr>
                </tbody>
              </table>
              <p class="small muted mt">Ciclo de {{ mesAno(t.comparativo.cicloAnterior.ano, t.comparativo.cicloAnterior.mes) }} inteiro:
                {{ t.comparativo.anteriorCompleto.faturamento | dinheiro }} em {{ t.comparativo.anteriorCompleto.quantidadeVendas }} vendas.</p>
            </div>

            <div class="card discreto">
              <h3>Margem do ciclo</h3>
              @if (t.margem.margemPercentual != null) {
                <div class="stat">
                  <span class="value">{{ t.margem.lucro | dinheiro }}</span>
                  <span class="sub">lucro bruto · margem de <strong>{{ t.margem.margemPercentual }}%</strong></span>
                </div>
                <table class="table compacta mt">
                  <tbody>
                    <tr><td>Receita (itens com custo)</td><td class="num">{{ t.margem.receitaComCusto | dinheiro }}</td></tr>
                    <tr><td>Custo dos itens vendidos</td><td class="num">{{ t.margem.custo | dinheiro }}</td></tr>
                  </tbody>
                </table>
              } @else {
                <p class="muted">Nenhuma venda do ciclo tem custo registrado ainda.</p>
              }
              @if (t.margem.receitaSemCusto > 0) {
                <p class="small aviso mt">{{ t.margem.receitaSemCusto | dinheiro }} vendidos sem custo conhecido ficaram fora do cálculo.</p>
              }
              @if (t.margem.produtosAtivosSemCusto > 0) {
                <p class="small muted mt">{{ t.margem.produtosAtivosSemCusto }} produto{{ t.margem.produtosAtivosSemCusto === 1 ? '' : 's' }} ativo{{ t.margem.produtosAtivosSemCusto === 1 ? '' : 's' }} sem custo no cadastro. <a routerLink="/produtos">Produtos</a></p>
              }
            </div>

            <div class="card discreto">
              <h3>Formas de pagamento</h3>
              <div class="barras">
                @for (f of t.formasPagamento; track f.forma) {
                  <div class="barra-linha">
                    <div class="row-between small"><span>{{ f.forma === 'FIADO' ? 'Fiado (conta do aluno)' : 'Pago na hora' }}</span>
                      <span class="num">{{ f.total | dinheiro }} · {{ f.quantidade }} vendas</span></div>
                    <div class="trilho"><div class="barra" [style.width.%]="proporcao(f.total, totalFormas())"></div></div>
                  </div>
                }
              </div>
              <p class="small muted mt">O sistema registra só essas duas formas.</p>
            </div>
          </div>

          <div class="card discreto mt">
            <div class="row-between mb">
              <h3>Faturamento {{ granularidade() === 'semanal' ? 'por semana' : 'por ciclo de fechamento' }}</h3>
              <div class="segmentos">
                <button class="btn btn-sm" [class.ativo]="granularidade() === 'semanal'" (click)="granularidade.set('semanal')">Semanal</button>
                <button class="btn btn-sm" [class.ativo]="granularidade() === 'mensal'" (click)="granularidade.set('mensal')">Mensal</button>
              </div>
            </div>
            <app-grafico-linha [pontos]="pontosGrafico()" [formatar]="formatarEixo" [titulo]="'Faturamento ' + granularidade()" />
          </div>

          <div class="grid grid-2 mt">
            <div class="card discreto">
              <h3>Mais vendidos no ciclo</h3>
              @if (t.maisVendidos.length === 0) { <div class="empty">Nenhuma venda no ciclo.</div> }
              @else {
                <table class="table compacta">
                  <thead><tr><th>#</th><th>Produto</th><th class="num">Unid.</th><th class="num">Receita</th><th class="num">Lucro</th></tr></thead>
                  <tbody>
                    @for (p of t.maisVendidos; track p.produtoId; let i = $index) {
                      <tr><td class="muted">{{ i + 1 }}</td><td>{{ p.nome }}</td><td class="num">{{ p.quantidade }}</td>
                        <td class="num">{{ p.receita | dinheiro }}</td>
                        <td class="num">{{ p.lucro != null ? (p.lucro | dinheiro) : '—' }}</td></tr>
                    }
                  </tbody>
                </table>
              }
            </div>
            <div class="stack">
              <div class="card discreto">
                <h3>Menos vendidos no ciclo</h3>
                <p class="small muted mb">Produtos ativos com menos saída — candidatos a sair do cardápio.</p>
                <table class="table compacta">
                  <thead><tr><th>Produto</th><th class="num">Unid.</th><th class="num">Receita</th></tr></thead>
                  <tbody>
                    @for (p of t.menosVendidos; track p.produtoId) {
                      <tr><td><a [routerLink]="['/produtos', p.produtoId]">{{ p.nome }}</a></td>
                        <td class="num" [class.neg]="p.quantidade === 0">{{ p.quantidade }}</td><td class="num">{{ p.receita | dinheiro }}</td></tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="card discreto">
                <h3>Perdas do ciclo</h3>
                <p class="small muted mb">Baixas manuais, a preço de custo.</p>
                <table class="table compacta">
                  <tbody>
                    @for (p of t.perdas; track p.motivo) {
                      <tr [class.muted]="p.motivo === 'OUTRO'"><td>{{ motivo(p.motivo) }}</td><td class="num">{{ p.quantidade }} unid.</td>
                        <td class="num">{{ p.valorCusto | dinheiro }}</td></tr>
                    }
                  </tbody>
                  <tfoot><tr><td>Total (sem "Outros")</td><td class="num">{{ perdasTotais().quantidade }} unid.</td><td class="num">{{ perdasTotais().valor | dinheiro }}</td></tr></tfoot>
                </table>
                @if (perdasTotais().semCusto > 0) { <p class="small aviso mt">{{ perdasTotais().semCusto }} unidade(s) sem custo conhecido não entraram no valor.</p> }
              </div>
            </div>
          </div>

          <div class="card discreto mt">
            <div class="row-between mb">
              <h3>Consumo por {{ agrupamentoTurma() === 'turma' ? 'turma' : 'série' }} no ciclo</h3>
              <div class="segmentos">
                <button class="btn btn-sm" [class.ativo]="agrupamentoTurma() === 'turma'" (click)="agrupamentoTurma.set('turma')">Turma</button>
                <button class="btn btn-sm" [class.ativo]="agrupamentoTurma() === 'serie'" (click)="agrupamentoTurma.set('serie')">Série</button>
              </div>
            </div>
            @if (consumo().length === 0) { <div class="empty">Nenhuma venda no ciclo.</div> }
            @else {
              <div class="barras">
                @for (c of consumo(); track c.nome) {
                  <div class="barra-linha">
                    <div class="row-between small"><span>{{ c.nome }}</span>
                      <span class="num">{{ c.total | dinheiro }} · {{ c.vendas }} vendas · {{ c.alunos }} aluno{{ c.alunos === 1 ? '' : 's' }}</span></div>
                    <div class="trilho"><div class="barra" [style.width.%]="proporcao(c.total, maiorConsumo())"></div></div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      } @else if (carregandoTendencias()) {
        <div class="loading mt">Carregando histórico…</div>
      }
    </div>
  `,
  styles: [`
    .ao-vivo { margin-left: 8px; color: var(--primary); font-size: 0.85em; }

    /* Alertas: números grandes e cor pela gravidade */
    .alerta { display: flex; flex-direction: column; gap: 8px; text-decoration: none; color: var(--ink);
      border-left: 5px solid var(--line-strong); }
    a.alerta:hover { background: var(--surface-2); }
    .alerta .rotulo { font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
    .alerta .numeros { display: flex; flex-direction: column; gap: 2px; }
    .alerta .grande { font-size: 2.4rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; margin-right: 4px; }
    .alerta .medio { font-weight: 700; font-variant-numeric: tabular-nums; }
    .alerta .menor { color: var(--muted); font-size: 0.875rem; }
    .alerta[data-nivel='critico'] { border-left-color: var(--red); background: var(--red-soft); }
    .alerta[data-nivel='critico'] .grande, .alerta[data-nivel='critico'] .rotulo { color: var(--red); }
    .alerta[data-nivel='atencao'] { border-left-color: var(--amber); background: var(--amber-soft); }
    .alerta[data-nivel='atencao'] .grande, .alerta[data-nivel='atencao'] .rotulo { color: var(--amber); }
    .alerta[data-nivel='ok'] { border-left-color: var(--primary); }
    .alerta[data-nivel='ok'] .grande { color: var(--primary); }

    .aviso { color: var(--amber); }
    .badge { white-space: nowrap; }
    .table.compacta th, .table.compacta td { padding: 6px 8px; }

    /* Histórico: tipografia menor e sem sombra, para não competir com os alertas */
    .secao-historico { margin-top: 36px; padding-top: 20px; border-top: 1px solid var(--line); }
    .discreto { box-shadow: none; }
    .discreto h3 { margin-bottom: 4px; font-size: 0.95rem; }
    .discreto .stat .value { font-size: 1.4rem; }
    .barras { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
    .trilho { height: 8px; background: var(--surface-2); border-radius: 4px; margin-top: 4px; }
    .barra { height: 100%; background: var(--primary); border-radius: 4px; min-width: 2px; }
  `],
})
export class DashboardComponent {
  private api = inject(RelatoriosApi);
  protected socket = inject(DashboardSocketService);
  d = signal<Dashboard | null>(null);
  t = signal<Tendencias | null>(null);
  carregando = signal(false);
  carregandoTendencias = signal(false);
  granularidade = signal<'semanal' | 'mensal'>('semanal');
  agrupamentoTurma = signal<'turma' | 'serie'>('turma');
  hoje = new Date();
  mesAno = mesAno;
  formatarEixo = (v: number) => moeda.format(v);

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
    this.carregandoTendencias.set(true);
    this.api.tendencias().subscribe({
      next: t => { this.t.set(t); this.carregandoTendencias.set(false); },
      error: () => this.carregandoTendencias.set(false),
    });
  }

  // ---------- alertas ----------
  nivelEstoque = computed<Nivel>(() => {
    const d = this.d();
    return !d ? 'ok' : d.estoqueZerado.length ? 'critico' : d.estoqueBaixo.length ? 'atencao' : 'ok';
  });
  nivelValidade = computed<Nivel>(() => {
    const d = this.d();
    return !d ? 'ok' : d.vencidos.length ? 'critico' : d.vencendo.length ? 'atencao' : 'ok';
  });
  private todosEstoque = computed(() => { const d = this.d(); return d ? [...d.estoqueZerado, ...d.estoqueBaixo] : []; });
  listaEstoque = computed(() => this.todosEstoque().slice(0, LIMITE_LISTA));
  restanteEstoque = computed(() => Math.max(0, this.todosEstoque().length - LIMITE_LISTA));
  private todosValidade = computed(() => { const d = this.d(); return d ? [...d.vencidos, ...d.vencendo] : []; });
  listaValidade = computed(() => this.todosValidade().slice(0, LIMITE_LISTA));
  restanteValidade = computed(() => Math.max(0, this.todosValidade().length - LIMITE_LISTA));

  // ---------- hoje ----------
  variacaoHoje = computed(() => {
    const h = this.d()?.hoje;
    return h?.mediaDiaSemana ? variacao(h.totalGeral, h.mediaDiaSemana) : null;
  });
  diaSemana = computed(() => {
    const iso = this.d()?.data;
    if (!iso) return '';
    const [a, m, dia] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date(a, m - 1, dia));
  });

  // ---------- tendências ----------
  varFat = computed(() => { const c = this.t()?.comparativo; return c ? variacao(c.atual.faturamento, c.anteriorMesmoPonto.faturamento) : null; });
  varQtd = computed(() => { const c = this.t()?.comparativo; return c ? variacao(c.atual.quantidadeVendas, c.anteriorMesmoPonto.quantidadeVendas) : null; });
  varTicket = computed(() => {
    const c = this.t()?.comparativo;
    return c && c.atual.ticketMedio != null && c.anteriorMesmoPonto.ticketMedio != null
      ? variacao(c.atual.ticketMedio, c.anteriorMesmoPonto.ticketMedio) : null;
  });
  totalFormas = computed(() => (this.t()?.formasPagamento ?? []).reduce((s, f) => s + f.total, 0));

  pontosGrafico = computed<PontoGrafico[]>(() => {
    const t = this.t();
    if (!t) return [];
    const semanal = this.granularidade() === 'semanal';
    const pontos: PontoFaturamento[] = semanal ? t.faturamentoSemanal : t.faturamentoMensal;
    return pontos.map(p => {
      const [a, m] = p.fim.split('-').map(Number);
      return {
        rotulo: semanal ? this.dataCurta(p.inicio) : `${String(m).padStart(2, '0')}/${String(a).slice(2)}`,
        detalhe: semanal ? `Semana de ${this.dataCurta(p.inicio)} a ${this.dataCurta(p.fim)} (${p.quantidadeVendas} vendas)`
          : `Ciclo de ${mesAno(a, m)} (${this.dataCurta(p.inicio)} a ${this.dataCurta(p.fim)}, ${p.quantidadeVendas} vendas)`,
        valor: p.faturamento,
        parcial: p.parcial,
      };
    });
  });

  consumo = computed(() => {
    const lista = this.t()?.consumoTurmas ?? [];
    if (this.agrupamentoTurma() === 'turma') {
      return lista.map(c => ({ nome: c.turma ?? 'Sem turma', total: c.total, vendas: c.quantidadeVendas, alunos: c.alunosCompradores }));
    }
    const porSerie = new Map<string, { nome: string; total: number; vendas: number; alunos: number }>();
    for (const c of lista) {
      const nome = c.turmaId == null ? 'Sem turma' : (c.serie?.trim() || 'Sem série');
      const g = porSerie.get(nome) ?? { nome, total: 0, vendas: 0, alunos: 0 };
      g.total += c.total; g.vendas += c.quantidadeVendas; g.alunos += c.alunosCompradores;
      porSerie.set(nome, g);
    }
    return [...porSerie.values()].sort((a, b) => b.total - a.total);
  });
  maiorConsumo = computed(() => Math.max(0, ...this.consumo().map(c => c.total)));

  perdasTotais = computed(() => {
    const perdas = (this.t()?.perdas ?? []).filter(p => p.motivo !== 'OUTRO');
    return {
      quantidade: perdas.reduce((s, p) => s + p.quantidade, 0),
      valor: perdas.reduce((s, p) => s + p.valorCusto, 0),
      semCusto: perdas.reduce((s, p) => s + p.quantidadeSemCusto, 0),
    };
  });

  // ---------- formatação ----------
  percentual(v: number | null | undefined) {
    if (v == null) return '—';
    const r = Math.round(v);
    return `${r > 0 ? '+' : ''}${r === 0 ? 0 : r}%`;
  }
  proporcao(valor: number, total: number) { return total > 0 ? (valor / total) * 100 : 0; }
  dataCurta(iso: string) { return dataBr(iso).slice(0, 5); }
  prazo(p: ProdutoAlerta) {
    const dias = p.diasParaVencer ?? 0;
    if (dias < 0) return `vencido há ${-dias} dia${dias === -1 ? '' : 's'}`;
    if (dias === 0) return 'vence hoje';
    return `em ${dias} dia${dias === 1 ? '' : 's'} (${dataBr(p.validade).slice(0, 5)})`;
  }
  motivo(m: MotivoBaixa) { return MOTIVOS[m]; }
  sinal(v: number) { return v > 0 ? '+' : v < 0 ? '−' : ''; }
  abs(v: number) { return Math.abs(v); }
}

/** Variação percentual de atual sobre base; nula quando a base é zero. */
function variacao(atual: number, base: number): number | null {
  return base ? ((atual - base) / base) * 100 : null;
}
