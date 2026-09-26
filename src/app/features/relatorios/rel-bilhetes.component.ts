import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CadastrosApi, RelatoriosApi } from '../../core/api.service';
import { Aluno, BilhetesCobranca, Turma } from '../../core/models';
import { BuscaAlunoComponent } from '../../shared/busca-aluno.component';
import { dataBr, mesAno, mesIso } from '../../shared/datas';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

type Escopo = 'escola' | 'turma' | 'aluno';

/** Bilhetes do fechamento mensal: um por aluno que ficou devendo, só com o total a pagar. */
@Component({
  selector: 'app-rel-bilhetes',
  imports: [FormsModule, DinheiroPipe, BuscaAlunoComponent],
  template: `
    <div class="filters">
      <div class="field"><label>Fechamento de</label>
        <input class="input" type="month" [ngModel]="mes()" (ngModelChange)="mes.set($event); carregar()" /></div>
      <div class="field"><label>Gerar para</label>
        <div class="segmentos">
          <button type="button" class="btn" [class.ativo]="escopo() === 'escola'" (click)="mudarEscopo('escola')">Escola toda</button>
          <button type="button" class="btn" [class.ativo]="escopo() === 'turma'" (click)="mudarEscopo('turma')">Uma turma</button>
          <button type="button" class="btn" [class.ativo]="escopo() === 'aluno'" (click)="mudarEscopo('aluno')">Um aluno</button>
        </div></div>
        @if (r(); as r) {
        <button button class="btn btn-primary btn-imprimir" [disabled]="r.quantidade === 0" onclick="window.print()">Imprimir bilhetes</button>
        }
        @if (escopo() === 'turma') {
          <div class="field"><label>Turma</label>
          <select class="input" [ngModel]="turmaId()" (ngModelChange)="turmaId.set($event); carregar()">
            <option [ngValue]="null" disabled>Selecione</option>
            @for (t of turmas(); track t.id) { <option [ngValue]="t.id">{{ t.nome }}</option> }
          </select></div>
      }
      @if (escopo() === 'aluno') {
        <div class="field" style="min-width: 280px"><label>Aluno</label>
          <app-busca-aluno (selecionado)="aluno.set($event); carregar()" /></div>
      }
    </div>

    @if (r(); as r) {
      <div class="resumo no-print">
      </div>
      <div class="bilhetes">
        @for (b of r.bilhetes; track b.alunoId) {
          <article class="bilhete">
            <header>
              <img src="logo-anglo.png" width="34" height="34" alt="" />
              <div><strong>Cantina escolar</strong><span>Fechamento de {{ mesAno(r.ano, r.mes) }}</span></div>
            </header>
            <div class="aluno">
              <span class="rotulo">Aluno(a)</span>
              <strong>{{ b.nome }}</strong>
              <span>{{ b.turma || 'Sem turma' }}</span>
            </div>
            <div class="valor">
              <span class="rotulo">Total a pagar</span>
              <strong>{{ b.valorDevido | dinheiro }}</strong>
              <span class="rotulo">até {{ dataBr(r.fim) }}</span>
            </div>
            @if (r.instrucoesPagamento) { <p class="instrucoes">{{ r.instrucoesPagamento }}</p> }
          </article>
        } @empty {
          <div class="card empty">{{ vazio() }}</div>
        }
      </div>
    } @else if (escopo() !== 'escola') {
      <div class="card empty">{{ escopo() === 'turma' ? 'Selecione a turma.' : 'Busque o aluno pelo nome ou leia a carteirinha.' }}</div>
    }
  `,
  styles: [`
    .resumo { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .btn-imprimir { margin-left: auto; }
    .bilhetes { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
    .bilhete { background: var(--surface); border: 1.5px dashed var(--line-strong); border-radius: var(--radius); padding: 12px 16px;
      display: flex; flex-direction: column; gap: 8px; break-inside: avoid; }
    .bilhete header { display: flex; align-items: center; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
    .bilhete header img { border-radius: 50%; }
    .bilhete header div { display: flex; flex-direction: column; line-height: 1.2; }
    .bilhete header span { font-size: 0.85rem; color: var(--muted); }
    .rotulo { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .aluno { display: flex; flex-direction: column; }
    .aluno strong { font-size: 1.05rem; }
    .valor { display: flex; flex-direction: column; align-items: flex-start; }
    .valor strong { font-size: 1.6rem; font-variant-numeric: tabular-nums; }
    .instrucoes { font-size: 0.85rem; color: var(--muted); }
    @media print {
      .bilhetes { grid-template-columns: 1fr 1fr; gap: 0; }
      .bilhete { height: 68mm; border-radius: 0; margin: -0.75px; border-color: #999; overflow: hidden; }
      .rotulo, .bilhete header span, .instrucoes { color: #444; }
    }
  `],
})
export class RelBilhetesComponent {
  private api = inject(RelatoriosApi);
  private cadastros = inject(CadastrosApi);
  protected dataBr = dataBr;
  protected mesAno = mesAno;

  r = signal<BilhetesCobranca | null>(null);
  mes = signal('');
  diaFechamento = signal(25);
  escopo = signal<Escopo>('escola');
  turmas = signal<Turma[]>([]);
  turmaId = signal<number | null>(null);
  aluno = signal<Aluno | null>(null);

  constructor() {
    this.cadastros.turmas().subscribe(t => this.turmas.set(t.filter(x => x.ativo)));
    this.cadastros.configuracao().subscribe(c => {
      this.diaFechamento.set(c.diaFechamento);
      this.mes.set(mesIso(c.cicloAtual.ano, c.cicloAtual.mes));
      this.carregar();
    });
  }

  mudarEscopo(e: Escopo) {
    this.escopo.set(e);
    this.carregar();
  }

  vazio() {
    switch (this.escopo()) {
      case 'aluno': return `${this.aluno()?.nome ?? 'O aluno'} não tem débito neste fechamento.`;
      case 'turma': return 'Nenhum aluno da turma ficou devendo neste fechamento.';
      default: return 'Nenhum aluno ficou devendo neste fechamento.';
    }
  }

  carregar() {
    const [ano, mes] = this.mes().split('-').map(Number);
    const escopo = this.escopo();
    this.r.set(null);
    if (!ano || !mes) return;
    if (escopo === 'turma' && !this.turmaId()) return;
    if (escopo === 'aluno' && !this.aluno()) return;
    this.api.bilhetesCobranca(ano, mes, {
      turmaId: escopo === 'turma' ? this.turmaId() : null,
      alunoId: escopo === 'aluno' ? this.aluno()!.id : null,
    }).subscribe(r => this.r.set(r));
  }
}
