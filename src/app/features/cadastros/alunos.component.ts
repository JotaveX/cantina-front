import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CadastrosApi } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Aluno, Page, Turma } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-alunos',
  imports: [FormsModule, RouterLink, DinheiroPipe],
  template: `
    <div class="page">
      <div class="page-head">
        <a routerLink="/alunos/novo" class="btn btn-primary">Novo aluno</a>
      </div>
      <div class="filters">
        <div class="field"><label>Nome</label><input class="input" [ngModel]="nome()" (ngModelChange)="nome.set($event); buscar()" placeholder="Buscar por nome" /></div>
        <div class="field"><label>Turma</label>
          <select class="input" [ngModel]="turmaId()" (ngModelChange)="turmaId.set($event); buscar()">
            <option [ngValue]="null">Todas</option>
            @for (t of turmas(); track t.id) { <option [ngValue]="t.id">{{ t.nome }}</option> }
          </select>
        </div>
        <label class="check"><input type="checkbox" [ngModel]="apenasAtivos()" (ngModelChange)="apenasAtivos.set($event); buscar()" /> Só ativos</label>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Nome</th><th>Turma</th><th>Carteirinha</th><th class="num">Saldo</th><th>Responsável</th><th></th></tr></thead>
          <tbody>
            @for (a of pagina()?.content; track a.id) {
              <tr [class.muted]="!a.ativo">
                <td><a [routerLink]="['/alunos', a.id]">{{ a.nome }}</a>{{ a.ativo ? '' : ' (desativado)' }}</td>
                <td>{{ a.turmaNome || '—' }}</td>
                <td class="kbd">{{ a.codigoBarras }}</td>
                <td class="num" [class.neg]="a.saldo < 0" [class.pos]="a.saldo > 0">{{ a.saldo | dinheiro }}</td>
                <td>{{ a.responsavelNome || '—' }}<span class="muted small">{{ a.responsavelContato ? ' · ' + a.responsavelContato : '' }}</span></td>
                <td class="actions">
                  @if (auth.admin()) { <a [routerLink]="['/conta', a.id]" class="btn btn-sm">Conta</a> }
                  <a [routerLink]="['/alunos', a.id]" class="btn btn-sm">Editar</a>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">{{ carregando() ? 'Carregando…' : 'Nenhum aluno encontrado.' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (pagina(); as p) {
        <div class="row mt">
          <span class="muted small">{{ p.totalElements }} aluno(s)</span><span class="spacer"></span>
          <button class="btn btn-sm" [disabled]="p.number === 0" (click)="carregar(p.number - 1)">Anterior</button>
          <span class="small">Página {{ p.number + 1 }} de {{ p.totalPages || 1 }}</span>
          <button class="btn btn-sm" [disabled]="p.number + 1 >= p.totalPages" (click)="carregar(p.number + 1)">Próxima</button>
        </div>
      }
    </div>
  `,
})
export class AlunosComponent {
  private api = inject(CadastrosApi);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  pagina = signal<Page<Aluno> | null>(null);
  turmas = signal<Turma[]>([]);
  nome = signal('');
  turmaId = signal<number | null>(null);
  apenasAtivos = signal(true);
  carregando = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.api.turmas().subscribe(t => this.turmas.set(t));
    this.buscar();
  }

  /** Filtro mudou: volta para a primeira página (com debounce para a digitação do nome). */
  buscar() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.carregar(0), 250);
  }

  carregar(page: number) {
    this.carregando.set(true);
    this.api.alunos({ nome: this.nome(), turmaId: this.turmaId(), apenasAtivos: this.apenasAtivos(), page, size: 50 })
      .subscribe({ next: p => { this.pagina.set(p); this.carregando.set(false); }, error: () => this.carregando.set(false) });
  }
}
