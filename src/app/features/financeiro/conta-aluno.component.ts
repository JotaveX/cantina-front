import { DatePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CadastrosApi, OperacoesApi, RelatoriosApi } from '../../core/api.service';
import { Aluno, Extrato, TipoLancamento } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';
import { ScannerInputComponent } from '../../shared/scanner-input.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-conta-aluno',
  imports: [FormsModule, ReactiveFormsModule, RouterLink, DatePipe, DinheiroPipe, ScannerInputComponent, StatusBadgeComponent],
  template: `
    <div class="page">
      <div class="page-head">
        <div><h1>Conta do aluno</h1><p>Extrato de compras fiado, créditos e pagamentos. Aqui você adiciona crédito ou registra pagamentos dos responsáveis.</p></div>
      </div>
      <div class="grid" style="grid-template-columns: 1fr 2fr; gap: 12px; align-items: start">
        <app-scanner-input placeholder="Leia a carteirinha" [manterFoco]="false" (lido)="lerCodigo($event)" />
        <div class="row" style="position: relative">
          <input class="input" placeholder="Ou busque pelo nome" [ngModel]="busca()" (ngModelChange)="buscar($event)" />
          @if (encontrados().length > 0) {
            <div class="sugestoes">
              @for (a of encontrados(); track a.id) { <button type="button" (click)="selecionar(a)">{{ a.nome }} <span class="muted small">{{ a.turmaNome || '' }}</span></button> }
            </div>
          }
        </div>
      </div>

      @if (extrato(); as e) {
        <div class="grid grid-3 mt">
          <div class="card stat">
            <span class="label">{{ e.nome }} <span class="muted">· {{ e.turma || 'sem turma' }}</span></span>
            <span class="value" [class.neg]="e.saldoAtual < 0" [class.pos]="e.saldoAtual > 0">{{ e.saldoAtual | dinheiro }}</span>
            <span class="sub">{{ e.saldoAtual < 0 ? 'em aberto (fiado)' : e.saldoAtual > 0 ? 'de crédito' : 'saldo zerado' }} · <a [routerLink]="['/alunos', e.alunoId]">cadastro</a></span>
          </div>
          <div class="card stat"><span class="label">Entradas no período</span><span class="value pos">{{ e.totalCreditos | dinheiro }}</span><span class="sub">créditos, pagamentos e estornos</span></div>
          <div class="card stat"><span class="label">Compras fiado no período</span><span class="value">{{ e.totalDebitos | dinheiro }}</span><span class="sub">{{ e.lancamentos.length }} lançamentos</span></div>
        </div>

        <div class="grid mt" style="grid-template-columns: 2fr 1fr; align-items: start">
          <div>
            <div class="filters">
              <div class="field"><label>De</label><input class="input" type="date" [ngModel]="inicio()" (ngModelChange)="inicio.set($event); carregar()" /></div>
              <div class="field"><label>Até</label><input class="input" type="date" [ngModel]="fim()" (ngModelChange)="fim.set($event); carregar()" /></div>
              <button class="btn" (click)="inicio.set(''); fim.set(''); carregar()">Tudo</button>
            </div>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th class="num">Valor</th><th class="num">Saldo após</th><th>Por</th></tr></thead>
                <tbody>
                  @for (l of e.lancamentos; track l.id) {
                    <tr>
                      <td>{{ l.dataHora | date:'dd/MM/yy HH:mm' }}</td><td><app-badge [valor]="l.tipo" /></td>
                      <td>{{ l.descricao || '—' }}</td>
                      <td class="num" [class.neg]="l.valor < 0" [class.pos]="l.valor > 0">{{ l.valor | dinheiro }}</td>
                      <td class="num" [class.neg]="l.saldoApos < 0">{{ l.saldoApos | dinheiro }}</td><td>{{ l.usuarioNome || '—' }}</td>
                    </tr>
                  } @empty { <tr><td colspan="6" class="empty">Nenhum lançamento no período.</td></tr> }
                </tbody>
              </table>
            </div>
          </div>
          <form class="card" [formGroup]="form" (ngSubmit)="lancar()">
            <h2>Novo lançamento</h2>
            <div class="stack">
              <div class="field"><label>Tipo</label>
                <select class="input" formControlName="tipo">
                  <option value="CREDITO">Crédito (pré-pago pelos responsáveis)</option>
                  <option value="PAGAMENTO">Pagamento recebido (quita fiado)</option>
                  <option value="AJUSTE">Ajuste manual</option>
                </select></div>
              @if (form.value.tipo === 'AJUSTE') { <label class="check"><input type="checkbox" formControlName="negativo" /> Ajuste negativo (diminui o saldo)</label> }
              <div class="field"><label>Valor (R$)</label><input class="input" type="number" min="0.01" step="0.01" formControlName="valor" /></div>
              <div class="field"><label>Descrição</label><input class="input" formControlName="descricao" placeholder="Ex.: pago pela mãe em dinheiro" /></div>
              <button class="btn btn-primary" type="submit" [disabled]="form.invalid || salvando()">Registrar</button>
            </div>
          </form>
        </div>
      } @else {
        <div class="card empty mt"><strong>Nenhum aluno selecionado</strong>Leia a carteirinha ou busque pelo nome.</div>
      }
    </div>
  `,
  styles: [`
    .sugestoes { position: absolute; top: 100%; left: 0; right: 0; z-index: 10; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); display: flex; flex-direction: column; }
    .sugestoes button { text-align: left; padding: 8px 12px; border: 0; background: transparent; cursor: pointer; }
    .sugestoes button:hover { background: var(--surface-2); }
  `],
})
export class ContaAlunoComponent {
  alunoId = input<string>();
  private fb = inject(FormBuilder);
  private cadastros = inject(CadastrosApi);
  private operacoes = inject(OperacoesApi);
  private relatorios = inject(RelatoriosApi);
  private router = inject(Router);
  private toast = inject(ToastService);

  busca = signal('');
  encontrados = signal<Aluno[]>([]);
  extrato = signal<Extrato | null>(null);
  inicio = signal('');
  fim = signal('');
  salvando = signal(false);
  form = this.fb.nonNullable.group({
    tipo: ['CREDITO' as TipoLancamento, Validators.required], negativo: [false],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]], descricao: [''],
  });

  constructor() { setTimeout(() => { if (this.alunoId()) this.carregar(); }); }

  lerCodigo(codigo: string) {
    this.cadastros.alunoPorCodigo(codigo).subscribe(a => this.selecionar(a));
  }

  buscar(termo: string) {
    this.busca.set(termo);
    if (termo.trim().length < 2) { this.encontrados.set([]); return; }
    this.cadastros.alunos({ nome: termo.trim(), apenasAtivos: false }).subscribe(l => this.encontrados.set(l.slice(0, 8)));
  }

  selecionar(a: Aluno) {
    this.encontrados.set([]);
    this.busca.set('');
    this.router.navigate(['/conta', a.id]);
    setTimeout(() => this.carregar(a.id));
  }

  carregar(id = Number(this.alunoId())) {
    if (!id) return;
    this.relatorios.extrato(id, this.inicio() || undefined, this.fim() || undefined).subscribe(e => this.extrato.set(e));
  }

  lancar() {
    const e = this.extrato();
    if (!e || this.form.invalid) return;
    const v = this.form.getRawValue();
    this.salvando.set(true);
    this.operacoes.lancar({ alunoId: e.alunoId, tipo: v.tipo, valor: Number(v.valor), descricao: v.descricao || undefined }, v.tipo === 'AJUSTE' && v.negativo)
      .subscribe({
        next: l => { this.toast.sucesso(`Lançamento registrado. Saldo: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.saldoApos)}`);
          this.form.reset({ tipo: v.tipo, negativo: false, valor: null, descricao: '' }); this.carregar(e.alunoId); this.salvando.set(false); },
        error: () => this.salvando.set(false),
      });
  }
}
