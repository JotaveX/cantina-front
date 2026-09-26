import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RelatoriosApi } from '../../core/api.service';
import { Aluno, ConsumoAluno } from '../../core/models';
import { BuscaAlunoComponent } from '../../shared/busca-aluno.component';
import { dataBr, mesAno } from '../../shared/datas';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';
import { IDENTIFICACAO_ESCOLA } from '../../shared/escola';
import { SeletorFechamentoComponent } from '../../shared/seletor-fechamento.component';

/**
 * O que o aluno comprou no ciclo de fechamento, item a item. Na tela mostra o resumo;
 * na impressão sai um documento próprio para entregar aos responsáveis.
 */
@Component({
  selector: 'app-rel-consumo',
  imports: [DatePipe, DinheiroPipe, BuscaAlunoComponent, SeletorFechamentoComponent],
  template: `
    <div class="filters">
      <div class="field" style="min-width: 280px"><label>Aluno</label>
        <app-busca-aluno (selecionado)="aluno.set($event); carregar()" /></div>
      <div class="field"><label>Fechamento de</label>
        <app-seletor-fechamento (mudou)="fechamento.set($event); carregar()" /></div>
    </div>

    @if (c(); as c) {
      <div class="tela no-print">
      <div class="cabecalho">
        <div class="titulo">
          <h2>{{ c.nome }} <span class="muted">· {{ c.turma || 'sem turma' }}</span></h2>
          <p class="muted">Consumo na cantina — fechamento de {{ mesAno(c.ano, c.mes) }} ({{ dataBr(c.inicio) }} a {{ dataBr(c.fim) }})
            @if (c.responsavelNome) { · Responsável: {{ c.responsavelNome }} }</p>
        </div>
        <button class="btn btn-primary" onclick="window.print()">Imprimir documento</button>
      </div>

      <div class="grid grid-4 mb">
        <div class="card stat"><span class="label">Total gasto</span><span class="value">{{ c.totalGasto | dinheiro }}</span>
          <span class="sub">{{ c.quantidadeCompras }} compras · {{ c.quantidadeItens }} itens</span></div>
        <div class="card stat"><span class="label">Marcado na comanda (fiado)</span><span class="value">{{ c.totalFiado | dinheiro }}</span></div>
        <div class="card stat"><span class="label">Pago na hora</span><span class="value">{{ c.totalPagoNaHora | dinheiro }}</span></div>
        <div class="card stat"><span class="label">Saldo no fechamento</span>
          <span class="value" [class.neg]="c.saldoFinal < 0" [class.pos]="c.saldoFinal > 0">{{ c.saldoFinal | dinheiro }}</span>
          <span class="sub">anterior {{ c.saldoAnterior | dinheiro }} · créditos/pagamentos {{ c.creditosEPagamentos | dinheiro }}</span></div>
      </div>

      @if (c.compras.length > 0) {
        <div class="grid consumo">
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Data</th><th>Itens</th><th>Forma</th><th class="num">Valor</th></tr></thead>
            <tbody>@for (v of c.compras; track v.vendaId) {
              <tr><td class="data">{{ v.dataHora | date:'dd/MM (EEE) HH:mm' }}</td>
                <td>@for (i of v.itens; track $index) { <div>{{ i.quantidade }}× {{ i.nomeProduto }} <span class="muted small">{{ i.subtotal | dinheiro }}</span></div> }</td>
                <td>{{ v.formaPagamento === 'FIADO' ? 'Comanda' : 'Pago na hora' }}</td>
                <td class="num">{{ v.valorTotal | dinheiro }}</td></tr>
            }</tbody>
            <tfoot><tr><td colspan="3">Total</td><td class="num">{{ c.totalGasto | dinheiro }}</td></tr></tfoot>
          </table></div>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Produto</th><th class="num">Qtd.</th><th class="num">Total</th></tr></thead>
            <tbody>@for (p of c.porProduto; track p.nomeProduto) {
              <tr><td>{{ p.nomeProduto }}</td><td class="num">{{ p.quantidade }}</td><td class="num">{{ p.total | dinheiro }}</td></tr>
            }</tbody>
          </table></div>
        </div>
      } @else {
        <div class="card empty">Nenhuma compra neste período.</div>
      }
      </div>

      <article class="documento so-impressao">
        <header class="doc-topo">
          <img src="logo-anglo.png" width="56" height="56" alt="" />
          <div>
            <strong>Cantina escolar</strong>
            <span>{{ escola }}</span>
          </div>
        </header>

        <h1>Extrato de consumo na cantina</h1>
        <p class="doc-periodo">Fechamento de {{ mesAno(c.ano, c.mes) }} · período de {{ dataBr(c.inicio) }} a {{ dataBr(c.fim) }}</p>

        <dl class="doc-aluno">
          <div><dt>Aluno(a)</dt><dd><strong>{{ c.nome }}</strong></dd></div>
          <div><dt>Turma</dt><dd>{{ c.turma || 'Sem turma' }}</dd></div>
          @if (c.responsavelNome) { <div><dt>Responsável</dt><dd>{{ c.responsavelNome }}</dd></div> }
        </dl>

        <h2>Compras no período</h2>
        @if (c.compras.length > 0) {
          <table class="doc-tabela">
            <thead><tr><th>Data</th><th>Produto</th><th class="num">Qtd.</th><th class="num">Valor unit.</th><th class="num">Total</th><th>Pagamento</th></tr></thead>
            <tbody>
              @for (v of c.compras; track v.vendaId) {
                @for (i of v.itens; track $index; let primeiro = $first) {
                  <tr [class.nova-compra]="primeiro">
                    @if (primeiro) { <td class="data" [attr.rowspan]="v.itens.length">{{ v.dataHora | date:'dd/MM/yyyy HH:mm' }}</td> }
                    <td>{{ i.nomeProduto }}</td>
                    <td class="num">{{ i.quantidade }}</td>
                    <td class="num">{{ i.precoUnitario | dinheiro }}</td>
                    <td class="num">{{ i.subtotal | dinheiro }}</td>
                    @if (primeiro) { <td [attr.rowspan]="v.itens.length">{{ v.formaPagamento === 'FIADO' ? 'Comanda' : 'Pago na hora' }}</td> }
                  </tr>
                }
              }
            </tbody>
            <tfoot><tr><td colspan="2">Total ({{ c.quantidadeCompras }} compras)</td><td class="num">{{ c.quantidadeItens }}</td><td></td>
              <td class="num">{{ c.totalGasto | dinheiro }}</td><td></td></tr></tfoot>
          </table>

          <div class="doc-resumos">
            <section>
              <h2>Resumo por produto</h2>
              <table class="doc-tabela">
                <thead><tr><th>Produto</th><th class="num">Qtd.</th><th class="num">Total</th></tr></thead>
                <tbody>@for (p of c.porProduto; track p.nomeProduto) {
                  <tr><td>{{ p.nomeProduto }}</td><td class="num">{{ p.quantidade }}</td><td class="num">{{ p.total | dinheiro }}</td></tr>
                }</tbody>
              </table>
            </section>
            <section>
              <h2>Resumo da conta</h2>
              <table class="doc-tabela">
                <tbody>
                  <tr><td>Marcado na comanda (fiado)</td><td class="num">{{ c.totalFiado | dinheiro }}</td></tr>
                  <tr><td>Pago na hora</td><td class="num">{{ c.totalPagoNaHora | dinheiro }}</td></tr>
                  <tr><td>Saldo anterior</td><td class="num">{{ c.saldoAnterior | dinheiro }}</td></tr>
                  <tr><td>Créditos e pagamentos</td><td class="num">{{ c.creditosEPagamentos | dinheiro }}</td></tr>
                  <tr class="saldo"><td>Saldo no fechamento</td><td class="num">{{ c.saldoFinal | dinheiro }}</td></tr>
                </tbody>
              </table>
              <p class="doc-nota">Saldo negativo é valor a pagar; positivo é crédito disponível.</p>
            </section>
          </div>
        } @else {
          <p>Nenhuma compra neste período.</p>
        }

        <footer class="doc-rodape">Emitido em {{ hoje | date:'dd/MM/yyyy' }}</footer>
      </article>
    } @else {
      <div class="card empty">Busque o aluno pelo nome ou leia a carteirinha.</div>
    }
  `,
  styles: [`
    .cabecalho { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .cabecalho .titulo { flex: 1; min-width: 0; }
    .consumo { grid-template-columns: 2fr 1fr; align-items: start; }
    .data { white-space: nowrap; }
    @media (max-width: 900px) { .consumo { grid-template-columns: 1fr; } }
    /* documento impresso */
    .documento { color: #000; font-size: 10pt; }
    .doc-topo { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; border-bottom: 1.5px solid #000; }
    .doc-topo img { border-radius: 50%; }
    .doc-topo div { display: flex; flex-direction: column; line-height: 1.3; }
    .doc-topo strong { font-size: 13pt; }
    .documento h1 { font-size: 15pt; margin: 14px 0 2px; }
    .doc-periodo { margin: 0 0 10px; }
    .documento h2 { font-size: 11pt; margin: 14px 0 6px; }
    .doc-aluno { display: flex; flex-wrap: wrap; gap: 4px 28px; margin: 0; padding: 8px 10px; border: 1px solid #999; }
    .doc-aluno dt { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em; color: #444; }
    .doc-aluno dd { margin: 0; }
    .doc-tabela { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .doc-tabela th, .doc-tabela td { border: 1px solid #999; padding: 3px 6px; text-align: left; vertical-align: top; }
    .doc-tabela th { background: #eee; font-weight: 700; }
    .doc-tabela .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .doc-tabela tfoot td { font-weight: 700; }
    .doc-tabela tr { break-inside: avoid; }
    .doc-tabela .saldo td { font-weight: 700; }
    .doc-resumos { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; break-inside: avoid; }
    .doc-nota { font-size: 8pt; color: #444; margin: 4px 0 0; }
    .doc-rodape { margin-top: 18px; font-size: 8pt; color: #444; text-align: right; }
  `],
})
export class RelConsumoComponent {
  private api = inject(RelatoriosApi);
  protected dataBr = dataBr;
  protected mesAno = mesAno;
  protected readonly escola = IDENTIFICACAO_ESCOLA;
  protected readonly hoje = new Date();

  c = signal<ConsumoAluno | null>(null);
  aluno = signal<Aluno | null>(null);
  fechamento = signal<{ ano: number; mes: number } | null>(null);

  carregar() {
    const f = this.fechamento();
    const aluno = this.aluno();
    if (!f || !aluno) return;
    this.api.consumoAluno(aluno.id, f.ano, f.mes).subscribe(c => this.c.set(c));
  }
}
