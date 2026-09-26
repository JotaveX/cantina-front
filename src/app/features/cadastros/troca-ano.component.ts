import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CadastrosApi } from '../../core/api.service';
import { AcaoTrocaAno, AlunoTrocaAno, TrocaAnoResultado, Turma } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

/** Destino de uma turma inteira (do cadastro): id da turma seguinte, todos saem, todos ficam, ou não definido (null). */
type DestinoTurma = number | 'SAIR' | 'FICAR' | null;
/** Decisão final de um aluno; AVANCAR sem turma = pendente. */
interface Decisao { acao: AcaoTrocaAno | null; turmaId: number | null; }
type Filtro = 'TODOS' | AcaoTrocaAno | 'PENDENTE' | 'ALTERADOS';

/** Chave usada para os alunos sem turma. */
const SEM_TURMA = 0;

@Component({
  selector: 'app-troca-ano',
  imports: [FormsModule, RouterLink, DinheiroPipe],
  template: `
    <div class="page" style="max-width: 1100px">
      <div class="page-head">
        <div>
          <h1>Troca de ano</h1>
          <p>Cada turma segue o destino definido no cadastro de turmas; ajuste só as exceções: quem repetiu fica na mesma turma, quem saiu da escola é desativado (o histórico e o saldo são mantidos).</p>
        </div>
        <a routerLink="/turmas" class="btn">Turmas</a>
      </div>

      @if (resultado(); as r) {
        <div class="card mb resultado">
          <h2>Troca de ano concluída</h2>
          <div class="grid grid-3 mt">
            <div class="stat"><div class="muted small">Avançaram</div><div class="strong grande">{{ r.avancaram }}</div></div>
            <div class="stat"><div class="muted small">Repetiram</div><div class="strong grande">{{ r.repetiram }}</div></div>
            <div class="stat"><div class="muted small">Saíram (desativados)</div><div class="strong grande">{{ r.sairam }}</div></div>
          </div>
          <div class="row mt">
            <a routerLink="/alunos" class="btn btn-primary">Ver alunos</a>
            <a routerLink="/documentos/carteirinhas" class="btn">Imprimir carteirinhas</a>
          </div>
        </div>
      } @else if (carregando()) {
        <div class="card empty">Carregando alunos…</div>
      } @else {
        <!-- exceções aluno a aluno -->
        <div class="card mb">
          <div class="row-between mb">
            <h2>Ajuste as exceções</h2>
            <div class="row">
              <input class="input" style="max-width: 240px" placeholder="Buscar aluno" [ngModel]="busca()" (ngModelChange)="busca.set($event)" />
              <div class="segmentos">
                @for (f of filtros; track f.valor) {
                  <button type="button" class="btn btn-sm" [class.ativo]="filtro() === f.valor" (click)="filtro.set(f.valor)">
                    {{ f.texto }} <span class="contagem">{{ contagemFiltro(f.valor) }}</span>
                  </button>
                }
              </div>
            </div>
          </div>

          @for (g of gruposVisiveis(); track g.chave) {
            <details class="turma" [open]="abertos().has(g.chave) || !!busca() || filtro() !== 'TODOS'" (toggle)="alternar(g.chave, $event)">
              <summary>
                <span class="strong">{{ g.nome }}</span>
                @if (g.destino === null) {
                  <span class="aviso small">→ próxima turma não definida — <a routerLink="/turmas">defina em Turmas</a> ou decida aluno a aluno</span>
                } @else {
                  <span class="muted small">→ {{ textoDestino(g.destino) }}</span>
                }
                <span class="spacer"></span>
                <span class="resumo small">
                  @if (g.cont.AVANCAR) { <span class="badge badge-green">{{ g.cont.AVANCAR }} avançam</span> }
                  @if (g.cont.REPETIR) { <span class="badge badge-amber">{{ g.cont.REPETIR }} repetem</span> }
                  @if (g.cont.SAIR) { <span class="badge badge-red">{{ g.cont.SAIR }} saem</span> }
                  @if (g.cont.PENDENTE) { <span class="badge">{{ g.cont.PENDENTE }} pendentes</span> }
                </span>
              </summary>
              <div class="acoes-turma">
                <span class="muted small">Toda a turma:</span>
                <button type="button" class="btn btn-sm btn-ghost" (click)="todos(g.chave, 'AVANCAR')" [disabled]="!turmaDestino(g.destino)">Avançam</button>
                <button type="button" class="btn btn-sm btn-ghost" (click)="todos(g.chave, 'REPETIR')">Repetem</button>
                <button type="button" class="btn btn-sm btn-ghost" (click)="todos(g.chave, 'SAIR')">Saem</button>
                <button type="button" class="btn btn-sm btn-ghost" (click)="restaurar(g.chave)" [disabled]="!g.alterados">Desfazer exceções</button>
              </div>
              <table class="table">
                <tbody>
                  @for (a of g.visiveis; track a.aluno.id) {
                    <tr [class.alterado]="a.alterado" [class.saindo]="a.decisao.acao === 'SAIR'">
                      <td>
                        {{ a.aluno.nome }}
                        @if (a.alterado) { <span class="badge small" title="Diferente do destino da turma">exceção</span> }
                      </td>
                      <td class="num saldo">
                        @if (a.aluno.saldo !== 0) {
                          <span [class.neg]="a.aluno.saldo < 0" [class.pos]="a.aluno.saldo > 0"
                                [title]="a.decisao.acao === 'SAIR' ? 'Aluno saindo com saldo — acerte a conta antes' : 'Saldo atual'">
                            @if (a.decisao.acao === 'SAIR') { ⚠ } {{ a.aluno.saldo | dinheiro }}
                          </span>
                        }
                      </td>
                      <td class="decisao"><div class="decisao-linha">
                        <div class="segmentos">
                          <button type="button" class="btn btn-sm" [class.ativo]="a.decisao.acao === 'AVANCAR'" (click)="decidir(a.aluno, 'AVANCAR')">Avança</button>
                          <button type="button" class="btn btn-sm repete" [class.ativo]="a.decisao.acao === 'REPETIR'" (click)="decidir(a.aluno, 'REPETIR')">Repete</button>
                          <button type="button" class="btn btn-sm sai" [class.ativo]="a.decisao.acao === 'SAIR'" (click)="decidir(a.aluno, 'SAIR')">Saiu</button>
                        </div>
                        @if (a.decisao.acao === 'AVANCAR') {
                          <select class="input input-sm" [class.pendente]="a.decisao.turmaId === null" [ngModel]="a.decisao.turmaId"
                                  (ngModelChange)="decidir(a.aluno, 'AVANCAR', $event)" [attr.aria-label]="'Turma de destino de ' + a.aluno.nome">
                            <option [ngValue]="null" disabled>Para qual turma?</option>
                            @for (t of turmas(); track t.id) { @if (t.id !== (a.aluno.turmaId ?? SEM_TURMA)) { <option [ngValue]="t.id">{{ t.nome }}</option> } }
                          </select>
                        } @else if (a.decisao.acao === null) {
                          <span class="muted small">escolha uma opção</span>
                        }
                      </div></td>
                    </tr>
                  }
                </tbody>
              </table>
            </details>
          } @empty {
            <div class="empty">Nenhum aluno encontrado com esse filtro.</div>
          }
        </div>

        <!-- barra de confirmação -->
        <div class="barra">
          <div class="barra-resumo">
            <span><strong>{{ totais().AVANCAR }}</strong> avançam</span>
            <span><strong>{{ totais().REPETIR }}</strong> repetem</span>
            <span><strong>{{ totais().SAIR }}</strong> saem</span>
            @if (totais().PENDENTE) { <span class="aviso"><strong>{{ totais().PENDENTE }}</strong> sem decisão</span> }
            @if (saindoComSaldo().length) {
              <span class="aviso" [title]="nomesSaindoComSaldo()">⚠ {{ saindoComSaldo().length }} saindo com saldo</span>
            }
          </div>
          <button class="btn btn-primary" (click)="aplicar()" [disabled]="totais().PENDENTE > 0 || aplicando() || !alunos().length">
            {{ aplicando() ? 'Aplicando…' : 'Aplicar troca de ano' }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .grande { font-size: 1.8rem; }
    .segmentos .contagem { opacity: .7; font-size: .8em; margin-left: 2px; }
    .turma { border: 1px solid var(--line); border-radius: var(--radius); margin-bottom: 10px; overflow: hidden; }
    .turma summary { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; background: var(--surface-2); list-style: none; flex-wrap: wrap; }
    .turma summary::before { content: '▸'; color: var(--muted); transition: transform .15s; }
    .turma[open] summary::before { transform: rotate(90deg); }
    .resumo { display: flex; gap: 6px; flex-wrap: wrap; }
    .acoes-turma { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
    .table td { vertical-align: middle; }
    .saldo { width: 120px; white-space: nowrap; }
    .decisao { width: 1%; }
    .decisao-linha { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
    .input-sm { padding: 4px 8px; font-size: 0.875rem; width: 150px; }
    select.pendente { border-color: var(--amber); background: var(--amber-soft); }
    tr.alterado td:first-child { box-shadow: inset 3px 0 0 var(--accent); }
    tr.saindo td:first-child { color: var(--muted); text-decoration: line-through; }
    .segmentos .btn.repete.ativo { background: var(--amber); border-color: var(--amber); }
    .segmentos .btn.sai.ativo { background: var(--red); border-color: var(--red); }
    .barra { position: sticky; bottom: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
             padding: 12px 16px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); box-shadow: 0 -4px 16px rgba(0, 23, 31, .08); }
    .barra-resumo { display: flex; gap: 18px; flex-wrap: wrap; }
    .aviso { color: var(--amber); font-weight: 600; }
    @media (max-width: 700px) {
      .decisao-linha { flex-wrap: wrap; }
      .saldo { width: auto; }
    }
  `],
})
export class TrocaAnoComponent {
  private api = inject(CadastrosApi);
  private toast = inject(ToastService);
  readonly SEM_TURMA = SEM_TURMA;
  readonly filtros: { valor: Filtro; texto: string }[] = [
    { valor: 'TODOS', texto: 'Todos' }, { valor: 'AVANCAR', texto: 'Avançam' }, { valor: 'REPETIR', texto: 'Repetem' },
    { valor: 'SAIR', texto: 'Saem' }, { valor: 'PENDENTE', texto: 'Pendentes' }, { valor: 'ALTERADOS', texto: 'Exceções' },
  ];

  carregando = signal(true);
  aplicando = signal(false);
  resultado = signal<TrocaAnoResultado | null>(null);
  turmas = signal<Turma[]>([]);
  alunos = signal<AlunoTrocaAno[]>([]);
  /** Destino de cada turma conforme o cadastro (chave = id da turma; SEM_TURMA para os alunos sem turma). */
  destinos = signal<Record<number, DestinoTurma>>({});
  /** Exceções: decisões individuais que sobrescrevem o destino da turma. */
  excecoes = signal<Record<number, Decisao>>({});
  busca = signal('');
  filtro = signal<Filtro>('TODOS');
  abertos = signal(new Set<number>());

  private turmasPorId = computed(() => new Map(this.turmas().map(t => [t.id, t])));

  /** Turmas com alunos ativos, na ordem natural (1º, 2º, … 10º), com "Sem turma" no fim. */
  grupos = computed(() => {
    const porTurma = new Map<number, AlunoTrocaAno[]>();
    for (const a of this.alunos()) {
      const k = a.turmaId ?? SEM_TURMA;
      porTurma.set(k, [...(porTurma.get(k) ?? []), a]);
    }
    const destinos = this.destinos();
    return [...porTurma.entries()]
      .map(([chave, alunos]) => ({
        chave, alunos,
        nome: chave === SEM_TURMA ? 'Sem turma' : (this.turmasPorId().get(chave)?.nome ?? `Turma ${chave}`),
        destino: destinos[chave] ?? null,
      }))
      .sort((a, b) => a.chave === SEM_TURMA ? 1 : b.chave === SEM_TURMA ? -1 : a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
  });

  /** Decisão efetiva de cada aluno (exceção ou, na falta dela, o destino da turma). */
  decisoes = computed(() => {
    const exc = this.excecoes();
    const destinos = this.destinos();
    const m = new Map<number, { decisao: Decisao; alterado: boolean }>();
    for (const a of this.alunos()) {
      const padrao = this.decisaoDaTurma(destinos[a.turmaId ?? SEM_TURMA] ?? null);
      const e = exc[a.id];
      m.set(a.id, e ? { decisao: e, alterado: e.acao !== padrao.acao || e.turmaId !== padrao.turmaId } : { decisao: padrao, alterado: false });
    }
    return m;
  });

  gruposVisiveis = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const filtro = this.filtro();
    const decisoes = this.decisoes();
    return this.grupos().map(g => {
      const linhas = g.alunos.map(aluno => ({ aluno, ...decisoes.get(aluno.id)! }));
      const cont = { AVANCAR: 0, REPETIR: 0, SAIR: 0, PENDENTE: 0 };
      for (const l of linhas) cont[this.situacao(l.decisao)]++;
      const visiveis = linhas.filter(l =>
        (!termo || l.aluno.nome.toLowerCase().includes(termo)) &&
        (filtro === 'TODOS' || (filtro === 'ALTERADOS' ? l.alterado : this.situacao(l.decisao) === filtro)));
      return { ...g, cont, visiveis, alterados: linhas.some(l => l.alterado) };
    }).filter(g => g.visiveis.length > 0);
  });

  totais = computed(() => {
    const t = { AVANCAR: 0, REPETIR: 0, SAIR: 0, PENDENTE: 0 };
    for (const { decisao } of this.decisoes().values()) t[this.situacao(decisao)]++;
    return t;
  });

  saindoComSaldo = computed(() => this.alunos().filter(a => a.saldo !== 0 && this.decisoes().get(a.id)?.decisao.acao === 'SAIR'));

  constructor() {
    forkJoin([this.api.turmas(), this.api.alunosTrocaAno()]).subscribe({
      next: ([turmas, alunos]) => {
        const ativas = turmas.filter(t => t.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
        this.turmas.set(ativas);
        this.alunos.set(alunos);
        // Destino padrão vem do cadastro da turma; alunos sem turma continuam sem turma.
        const destinos: Record<number, DestinoTurma> = { [SEM_TURMA]: 'FICAR' };
        for (const t of turmas) {
          destinos[t.id] = t.turmaFinal ? 'SAIR' : t.proximaTurmaId && ativas.some(a => a.id === t.proximaTurmaId) ? t.proximaTurmaId : null;
        }
        this.destinos.set(destinos);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  contagemFiltro(f: Filtro): number {
    if (f === 'TODOS') return this.alunos().length;
    if (f === 'ALTERADOS') return [...this.decisoes().values()].filter(d => d.alterado).length;
    return this.totais()[f];
  }

  decidir(aluno: AlunoTrocaAno, acao: AcaoTrocaAno, turmaId?: number | null) {
    const atual = this.decisoes().get(aluno.id)!.decisao;
    const destino = this.turmaDestino(this.destinos()[aluno.turmaId ?? SEM_TURMA] ?? null);
    const nova: Decisao = acao === 'AVANCAR'
      ? { acao, turmaId: turmaId !== undefined ? turmaId : (atual.acao === 'AVANCAR' ? atual.turmaId : destino) }
      : { acao, turmaId: null };
    this.excecoes.update(e => ({ ...e, [aluno.id]: nova }));
  }

  todos(chave: number, acao: AcaoTrocaAno) {
    const destino = this.turmaDestino(this.destinos()[chave] ?? null);
    this.excecoes.update(e => {
      const n = { ...e };
      for (const a of this.alunos()) {
        if ((a.turmaId ?? SEM_TURMA) === chave) n[a.id] = { acao, turmaId: acao === 'AVANCAR' ? destino : null };
      }
      return n;
    });
  }

  restaurar(chave: number) {
    this.excecoes.update(e => {
      const n = { ...e };
      for (const a of this.alunos()) if ((a.turmaId ?? SEM_TURMA) === chave) delete n[a.id];
      return n;
    });
  }

  alternar(chave: number, ev: Event) {
    const aberto = (ev.target as HTMLDetailsElement).open;
    this.abertos.update(s => { const n = new Set(s); if (aberto) n.add(chave); else n.delete(chave); return n; });
  }

  textoDestino(d: DestinoTurma): string {
    if (d === null) return 'não definido';
    if (d === 'FICAR') return 'ficam na mesma turma';
    if (d === 'SAIR') return 'saem da escola';
    return this.turmasPorId().get(d)?.nome ?? '—';
  }

  turmaDestino(d: DestinoTurma): number | null { return typeof d === 'number' ? d : null; }

  nomesSaindoComSaldo(): string { return this.saindoComSaldo().map(a => a.nome).join(', '); }

  aplicar() {
    const t = this.totais();
    let msg = `Confirmar a troca de ano?\n\n• ${t.AVANCAR} aluno(s) mudam de turma\n• ${t.REPETIR} continuam na mesma turma\n• ${t.SAIR} saem da escola (serão desativados)`;
    if (this.saindoComSaldo().length) msg += `\n\nAtenção: ${this.saindoComSaldo().length} aluno(s) saindo com saldo diferente de zero.`;
    if (!confirm(msg)) return;

    const decisoes = this.decisoes();
    const alunos = this.alunos().map(a => {
      const d = decisoes.get(a.id)!.decisao;
      return { alunoId: a.id, acao: d.acao!, turmaDestinoId: d.acao === 'AVANCAR' ? d.turmaId : null };
    });
    this.aplicando.set(true);
    this.api.aplicarTrocaAno({ alunos }).subscribe({
      next: r => { this.resultado.set(r); this.aplicando.set(false); this.toast.sucesso('Troca de ano aplicada'); },
      error: () => this.aplicando.set(false),
    });
  }

  private decisaoDaTurma(d: DestinoTurma): Decisao {
    if (d === null) return { acao: null, turmaId: null };
    if (d === 'FICAR') return { acao: 'REPETIR', turmaId: null };
    if (d === 'SAIR') return { acao: 'SAIR', turmaId: null };
    return { acao: 'AVANCAR', turmaId: d };
  }

  private situacao(d: Decisao): AcaoTrocaAno | 'PENDENTE' {
    return d.acao === null || (d.acao === 'AVANCAR' && d.turmaId === null) ? 'PENDENTE' : d.acao;
  }
}
