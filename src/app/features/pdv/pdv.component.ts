import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CadastrosApi, OperacoesApi } from '../../core/api.service';
import { Aluno, FormaPagamento, Produto, Venda } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';
import { ScannerInputComponent } from '../../shared/scanner-input.component';

interface ItemCarrinho { produto: Produto; quantidade: number; }

@Component({
  selector: 'app-pdv',
  imports: [FormsModule, DinheiroPipe, ScannerInputComponent],
  template: `
    <div class="page pdv">
      <div class="page-head">
        <div>
          <h1>Ponto de venda</h1>
          <p>Leia a carteirinha do aluno, depois os produtos. O leitor também identifica o aluno a qualquer momento.</p>
        </div>
        <button class="btn" (click)="limparTudo()" [disabled]="!aluno() && carrinho().length === 0">Limpar</button>
      </div>

      <app-scanner-input [grande]="true" (lido)="ler($event)"
        [placeholder]="aluno() ? 'Leia um produto ou outra carteirinha' : 'Leia a carteirinha do aluno'" />

      <div class="pdv-grid mt">
        <!-- Produtos -->
        <section class="card produtos">
          <div class="row-between mb">
            <h2>Produtos</h2>
            <input class="input busca" placeholder="Buscar produto pelo nome" [ngModel]="busca()" (ngModelChange)="busca.set($event)" />
          </div>
          @if (carregandoProdutos()) { <div class="loading">Carregando produtos…</div> }
          @else if (produtosFiltrados().length === 0) {
            <div class="empty"><strong>Nenhum produto encontrado</strong>Cadastre produtos em Cadastros → Produtos.</div>
          } @else {
            <div class="produtos-grid">
              @for (p of produtosFiltrados(); track p.id) {
                <button type="button" class="produto" [class.sem-estoque]="p.quantidadeEstoque <= 0" (click)="adicionar(p)">
                  <span class="nome">{{ p.nome }}</span>
                  <span class="preco">{{ p.preco | dinheiro }}</span>
                  <span class="estoque" [class.neg]="p.estoqueBaixo">{{ p.quantidadeEstoque }} em estoque</span>
                </button>
              }
            </div>
          }
        </section>

        <!-- Ficha em construção -->
        <section class="ficha ticket">
          <div class="ficha-head">
            @if (aluno(); as a) {
              <div>
                <div class="ficha-num">{{ a.nome }}</div>
                <div class="small muted">{{ a.turmaNome || 'Sem turma' }} · carteirinha {{ a.codigoBarras }}</div>
              </div>
              <div class="saldo">
                <div class="small muted">Saldo</div>
                <div class="num strong" [class.neg]="a.saldo < 0" [class.pos]="a.saldo > 0">{{ a.saldo | dinheiro }}</div>
              </div>
            } @else {
              <div class="muted">Nenhum aluno identificado. Leia a carteirinha ou <button class="link" (click)="buscarAlunoManual()">busque pelo nome</button>.</div>
            }
          </div>
          @if (buscandoAluno()) {
            <div class="ficha-body">
              <input class="input" placeholder="Nome do aluno" [ngModel]="buscaAluno()" (ngModelChange)="buscarAlunos($event)" autofocus />
              @for (a of alunosEncontrados(); track a.id) {
                <button type="button" class="linha-aluno" (click)="selecionarAluno(a)">
                  <span>{{ a.nome }} <span class="muted small">{{ a.turmaNome || '' }}</span></span>
                  <span class="num" [class.neg]="a.saldo < 0">{{ a.saldo | dinheiro }}</span>
                </button>
              }
            </div>
          }
          <div class="ficha-body itens">
            @if (carrinho().length === 0) {
              <div class="empty">Nenhum item ainda. Clique nos produtos ou leia o código de barras deles.</div>
            }
            @for (i of carrinho(); track i.produto.id) {
              <div class="ficha-item">
                <div class="qtd">
                  <button type="button" class="btn btn-sm" (click)="alterar(i, -1)">−</button>
                  <span class="num">{{ i.quantidade }}</span>
                  <button type="button" class="btn btn-sm" (click)="alterar(i, 1)">+</button>
                </div>
                <div class="desc">
                  <div>{{ i.produto.nome }}</div>
                  <div class="small muted">{{ i.produto.preco | dinheiro }} cada</div>
                </div>
                <div class="num strong">{{ i.produto.preco * i.quantidade | dinheiro }}</div>
                <button type="button" class="btn btn-sm btn-ghost" (click)="remover(i)" aria-label="Remover">✕</button>
              </div>
            }
          </div>
          <div class="ficha-foot">
            <div>
              <div class="small muted">Total</div>
              <div class="total num">{{ total() | dinheiro }}</div>
            </div>
            <div class="stack" style="gap:8px; min-width: 220px">
              <button class="btn btn-primary btn-lg" (click)="confirmar('FIADO')" [disabled]="!podeFiado()">Fiado (debita do saldo)</button>
              <button class="btn btn-lg" (click)="confirmar('PAGO_NA_HORA')" [disabled]="!podeConfirmar()">Pago na hora</button>
            </div>
          </div>
          @if (aluno() && total() > 0 && aluno()!.saldo - total() < 0) {
            @if (aluno()!.permiteSaldoNegativo) {
              <div class="aviso">Se for fiado, o saldo ficará em <strong class="neg">{{ aluno()!.saldo - total() | dinheiro }}</strong>.</div>
            } @else {
              <div class="aviso neg">{{ aluno()!.nome }} não tem saldo suficiente e não está autorizado a ficar com saldo negativo. Use "Pago na hora" ou libere o saldo negativo na ficha do aluno.</div>
            }
          }
        </section>
      </div>

      @if (ultimaVenda(); as v) {
        <div class="alert alert-info mt row-between">
          <span>Ficha <strong>#{{ v.id }}</strong> registrada para <strong>{{ v.alunoNome }}</strong>: {{ v.valorTotal | dinheiro }} ({{ v.formaPagamento === 'FIADO' ? 'fiado' : 'pago na hora' }}). Retire no balcão lendo a carteirinha.</span>
          <button class="btn btn-sm" (click)="ultimaVenda.set(null)">Ok</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .pdv-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(360px, 1fr); gap: 20px; align-items: start; }
    @media (max-width: 1000px) { .pdv-grid { grid-template-columns: 1fr; } }
    .busca { max-width: 280px; }
    .produtos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .produto { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; text-align: left; padding: 12px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); cursor: pointer; }
    .produto:hover { border-color: var(--primary); background: var(--primary-soft); }
    .produto:focus-visible { outline: 3px solid rgba(47,143,108,.35); }
    .produto .nome { font-weight: 600; line-height: 1.2; }
    .produto .preco { font-weight: 700; font-variant-numeric: tabular-nums; }
    .produto .estoque { font-size: 0.78rem; color: var(--muted); }
    .produto.sem-estoque { opacity: .55; }
    .ticket { position: sticky; top: 20px; }
    .saldo { text-align: right; }
    .saldo .num { font-size: 1.25rem; }
    .itens { min-height: 140px; }
    .qtd { display: flex; align-items: center; gap: 6px; }
    .qtd .num { min-width: 22px; text-align: center; font-weight: 700; }
    .desc { flex: 1; min-width: 0; }
    .total { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.02em; }
    .aviso { padding: 8px 16px 12px; font-size: 0.875rem; color: var(--muted); }
    .link { background: none; border: 0; color: var(--primary); text-decoration: underline; cursor: pointer; padding: 0; }
    .linha-aluno { width: 100%; display: flex; justify-content: space-between; gap: 10px; padding: 8px 4px; border: 0; border-bottom: 1px dotted var(--paper-line); background: transparent; text-align: left; cursor: pointer; }
    .linha-aluno:hover { background: rgba(255,255,255,.6); }
  `],
})
export class PdvComponent {
  private cadastros = inject(CadastrosApi);
  private operacoes = inject(OperacoesApi);
  private toast = inject(ToastService);

  produtos = signal<Produto[]>([]);
  carregandoProdutos = signal(true);
  busca = signal('');
  aluno = signal<Aluno | null>(null);
  carrinho = signal<ItemCarrinho[]>([]);
  enviando = signal(false);
  ultimaVenda = signal<Venda | null>(null);
  buscandoAluno = signal(false);
  buscaAluno = signal('');
  alunosEncontrados = signal<Aluno[]>([]);

  produtosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.produtos().filter(p => !termo || p.nome.toLowerCase().includes(termo));
  });
  total = computed(() => this.carrinho().reduce((s, i) => s + i.produto.preco * i.quantidade, 0));
  podeConfirmar = computed(() => !!this.aluno() && this.carrinho().length > 0 && !this.enviando());
  podeFiado = computed(() => {
    const a = this.aluno();
    if (!this.podeConfirmar() || !a) return false;
    return a.permiteSaldoNegativo || a.saldo - this.total() >= 0;
  });

  constructor() {
    this.carregarProdutos();
  }

  carregarProdutos() {
    this.cadastros.produtos({ apenasAtivos: true }).subscribe({
      next: p => { this.produtos.set(p); this.carregandoProdutos.set(false); },
      error: () => this.carregandoProdutos.set(false),
    });
  }

  /** Um único campo de leitura: decide se o código é de aluno ou de produto. */
  ler(codigo: string) {
    if (!this.aluno()) {
      this.cadastros.alunoPorCodigo(codigo, true).subscribe({
        next: a => this.selecionarAluno(a),
        error: () => this.cadastros.produtoPorCodigo(codigo, true).subscribe({
          next: p => { this.adicionar(p); this.toast.info('Produto adicionado. Falta ler a carteirinha do aluno.'); },
          error: () => this.toast.erro(`Código ${codigo} não encontrado como aluno nem como produto.`),
        }),
      });
      return;
    }
    this.cadastros.produtoPorCodigo(codigo, true).subscribe({
      next: p => this.adicionar(p),
      error: () => this.cadastros.alunoPorCodigo(codigo, true).subscribe({
        next: a => { this.selecionarAluno(a); this.toast.info(`Aluno trocado para ${a.nome}.`); },
        error: () => this.toast.erro(`Código ${codigo} não encontrado como produto nem como aluno.`),
      }),
    });
  }

  selecionarAluno(a: Aluno) {
    if (!a.ativo) { this.toast.erro(`${a.nome} está desativado.`); return; }
    this.aluno.set(a);
    this.buscandoAluno.set(false);
    this.alunosEncontrados.set([]);
    this.buscaAluno.set('');
  }

  buscarAlunoManual() { this.buscandoAluno.set(true); }

  buscarAlunos(termo: string) {
    this.buscaAluno.set(termo);
    if (termo.trim().length < 2) { this.alunosEncontrados.set([]); return; }
    this.cadastros.alunos({ nome: termo.trim(), apenasAtivos: true }).subscribe(l => this.alunosEncontrados.set(l.slice(0, 8)));
  }

  adicionar(p: Produto) {
    if (!p.ativo) { this.toast.erro(`${p.nome} está desativado.`); return; }
    this.carrinho.update(c => {
      const existente = c.find(i => i.produto.id === p.id);
      return existente ? c.map(i => i === existente ? { ...i, quantidade: i.quantidade + 1 } : i) : [...c, { produto: p, quantidade: 1 }];
    });
  }

  alterar(item: ItemCarrinho, delta: number) {
    this.carrinho.update(c => c
      .map(i => i === item ? { ...i, quantidade: i.quantidade + delta } : i)
      .filter(i => i.quantidade > 0));
  }

  remover(item: ItemCarrinho) { this.carrinho.update(c => c.filter(i => i !== item)); }

  confirmar(forma: FormaPagamento) {
    const aluno = this.aluno();
    if (!aluno || this.carrinho().length === 0) return;
    this.enviando.set(true);
    this.operacoes.criarVenda({
      alunoId: aluno.id,
      formaPagamento: forma,
      itens: this.carrinho().map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
    }).subscribe({
      next: v => {
        this.ultimaVenda.set(v);
        this.toast.sucesso(`Ficha #${v.id} registrada`);
        this.limparTudo();
        this.carregarProdutos();
        this.enviando.set(false);
      },
      error: () => this.enviando.set(false),
    });
  }

  limparTudo() {
    this.aluno.set(null);
    this.carrinho.set([]);
    this.buscandoAluno.set(false);
  }
}
