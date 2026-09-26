import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CadastrosApi, RelatoriosApi } from '../../core/api.service';
import { Aluno, Carteirinha, Turma } from '../../core/models';
import { BuscaAlunoComponent } from '../../shared/busca-aluno.component';
import { CodigoBarrasComponent } from '../../shared/codigo-barras.component';
import { IDENTIFICACAO_ESCOLA } from '../../shared/escola';

type Escopo = 'todos' | 'turma' | 'alunos';

/** Carteirinhas por folha A4 (4 pares frente + verso de 20 × 7 cm). */
const POR_FOLHA = 4;

/**
 * Carteirinhas para imprimir em papel azul: frente (logo) e verso (dados) lado a lado, 20 × 7 cm.
 * Recorta o par, dobra no meio (10 × 7 cm) e coloca no plástico.
 */
@Component({
  selector: 'app-rel-carteirinhas',
  imports: [FormsModule, BuscaAlunoComponent, CodigoBarrasComponent],
  template: `
    <div class="filters">
      <div class="field"><label>Gerar para</label>
        <div class="segmentos">
          <button type="button" class="btn" [class.ativo]="escopo() === 'todos'" (click)="mudarEscopo('todos')">Todos os alunos</button>
          <button type="button" class="btn" [class.ativo]="escopo() === 'turma'" (click)="mudarEscopo('turma')">Uma turma</button>
          <button type="button" class="btn" [class.ativo]="escopo() === 'alunos'" (click)="mudarEscopo('alunos')">Escolher alunos</button>
        </div></div>
      @if (escopo() === 'turma') {
        <div class="field"><label>Turma</label>
          <select class="input" [ngModel]="turmaId()" (ngModelChange)="turmaId.set($event); carregar()">
            <option [ngValue]="null" disabled>Selecione</option>
            @for (t of turmas(); track t.id) { <option [ngValue]="t.id">{{ t.nome }}</option> }
          </select></div>
      }
      @if (escopo() === 'alunos') {
        <div class="field" style="min-width: 280px"><label>Adicionar aluno</label>
          <app-busca-aluno [limparAoEscolher]="true" (selecionado)="adicionar($event)" /></div>
      }
      @if (lista().length > 0) {
        <button class="btn btn-primary imprimir" onclick="window.print()">Imprimir carteirinhas</button>
      }
    </div>

    @if (escopo() === 'alunos' && escolhidos().length > 0) {
      <div class="escolhidos no-print">
        @for (a of escolhidos(); track a.alunoId) {
          <span class="escolhido">{{ a.nome }} <button type="button" (click)="remover(a.alunoId)" [attr.aria-label]="'Remover ' + a.nome">×</button></span>
        }
        <button type="button" class="btn btn-sm btn-ghost" (click)="escolhidos.set([])">Limpar</button>
      </div>
    }
    
    @if (lista().length > 0) {
      <div class="previa">
        @for (folha of folhas(); track $index) {
          <div class="folha">
            @for (c of folha; track c.alunoId) {
              <div class="par">
                <section class="face frente">
                  <img src="logo-anglo.png" alt="Anglo" />
                </section>
                <section class="face verso">
                  <div class="nome">{{ c.nome }}</div>
                  <div class="turma"><span>Turma:</span> {{ c.turma || 'Sem turma' }} {{ ano }}</div>
                  <div class="codigo">
                    <app-codigo-barras [codigo]="c.codigoBarras" />
                    <div class="codigo-texto">{{ c.codigoBarras }}</div>
                  </div>
                  <div class="escola">{{ escola }}</div>
                </section>
              </div>
            }
          </div>
        }
      </div>
    } @else {
      <div class="card empty">{{ vazio() }}</div>
    }
  `,
  styles: [`
    .resumo { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .imprimir { margin-left: auto; }
    .escolhidos { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 16px; }
    .escolhido { display: inline-flex; align-items: center; gap: 4px; padding: 3px 4px 3px 10px; border-radius: 999px;
      background: var(--primary-soft); color: var(--primary-ink); font-size: 0.875rem; font-weight: 600; }
    .escolhido button { border: 0; background: transparent; cursor: pointer; font-size: 1rem; line-height: 1; padding: 2px 6px;
      border-radius: 999px; color: inherit; }
    .escolhido button:hover { background: rgba(0, 0, 0, .08); }

    .previa { overflow-x: auto; padding-bottom: 8px; }
    .folha { display: flex; flex-direction: column; gap: 1.5mm; margin-bottom: 1.5mm; }
    .par { display: flex; width: 200mm; height: 70mm; flex: none; break-inside: avoid; color: #000;
      font-family: Arial, Helvetica, sans-serif; }
    /* na tela, simula o papel azul; na impressão sai só o preto */
    .face { position: relative; width: 100mm; height: 70mm; box-sizing: border-box; border: 0.3mm solid #000; background: #bfe3f2; }
    .face + .face { border-left: 0; }

    .frente { display: flex; align-items: center; justify-content: center; }
    .frente img { width: 48mm; height: 48mm; object-fit: contain; }

    .verso { padding: 5mm 6mm; }
    .nome { font-weight: 700; font-size: 11pt; text-transform: uppercase; line-height: 1.2;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .turma { font-size: 10pt; margin-top: 1.5mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .turma span { margin-right: 1.5mm; }
    .codigo { position: absolute; left: 6mm; top: 22mm; width: 48mm; }
    .codigo app-codigo-barras { width: 48mm; height: 14mm; }
    .codigo-texto { text-align: center; font-size: 14pt; letter-spacing: 0.5mm; margin-top: 1mm; }
    .carimbo { position: absolute; right: 6mm; top: 21mm; width: 30mm; height: 27mm; box-sizing: border-box;
      border: 0.3mm dashed #000; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 1.5mm;
      font-size: 6.5pt; color: #333; }
    .escola { position: absolute; left: 6mm; right: 6mm; bottom: 4.5mm; font-size: 9.5pt; white-space: nowrap; }

    @page carteirinhas { size: A4 portrait; margin: 5mm 4mm; }
    @media print {
      .previa { overflow: visible; padding: 0; }
      .folha { page: carteirinhas; margin: 0; break-after: page; }
      .folha:last-child { break-after: auto; }
      .face { background: none; }
      .carimbo { color: #000; }
    }
  `],
})
export class RelCarteirinhasComponent {
  private api = inject(RelatoriosApi);
  private cadastros = inject(CadastrosApi);
  protected readonly escola = IDENTIFICACAO_ESCOLA;
  protected readonly ano = new Date().getFullYear();

  escopo = signal<Escopo>('todos');
  turmas = signal<Turma[]>([]);
  turmaId = signal<number | null>(null);
  /** Resultado de "todos" / "uma turma". */
  carregadas = signal<Carteirinha[]>([]);
  /** Alunos escolhidos um a um. */
  escolhidos = signal<Carteirinha[]>([]);

  lista = computed(() => this.escopo() === 'alunos' ? this.escolhidos() : this.carregadas());
  folhas = computed(() => {
    const l = this.lista();
    const folhas: Carteirinha[][] = [];
    for (let i = 0; i < l.length; i += POR_FOLHA) folhas.push(l.slice(i, i + POR_FOLHA));
    return folhas;
  });

  constructor() {
    this.cadastros.turmas().subscribe(t => this.turmas.set(t.filter(x => x.ativo)));
    this.carregar();
  }

  mudarEscopo(e: Escopo) {
    this.escopo.set(e);
    this.carregar();
  }

  carregar() {
    this.carregadas.set([]);
    const escopo = this.escopo();
    if (escopo === 'alunos') return;
    if (escopo === 'turma' && !this.turmaId()) return;
    this.api.carteirinhas(escopo === 'turma' ? this.turmaId() : null)
      .subscribe(l => this.carregadas.set(l));
  }

  adicionar(a: Aluno) {
    if (this.escolhidos().some(c => c.alunoId === a.id)) return;
    this.escolhidos.update(l => [...l, { alunoId: a.id, nome: a.nome, turma: a.turmaNome, codigoBarras: a.codigoBarras, ativo: a.ativo }]);
  }

  remover(alunoId: number) {
    this.escolhidos.update(l => l.filter(c => c.alunoId !== alunoId));
  }

  vazio() {
    switch (this.escopo()) {
      case 'alunos': return 'Busque os alunos pelo nome ou leia a carteirinha atual para adicionar.';
      case 'turma': return this.turmaId() ? 'Nenhum aluno nesta turma.' : 'Selecione a turma.';
      default: return 'Nenhum aluno.';
    }
  }
}
