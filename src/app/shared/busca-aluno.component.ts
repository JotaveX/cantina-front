import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CadastrosApi } from '../core/api.service';
import { Aluno } from '../core/models';

/** Campo de busca de aluno por nome (ou código da carteirinha + Enter) com lista de sugestões. */
@Component({
  selector: 'app-busca-aluno',
  imports: [FormsModule],
  template: `
    <div class="busca">
      <input class="input" [placeholder]="placeholder()" [ngModel]="termo()" (ngModelChange)="buscar($event)" (keydown.enter)="porCodigo($event)" />
      @if (encontrados().length > 0) {
        <div class="sugestoes">
          @for (a of encontrados(); track a.id) {
            <button type="button" (click)="escolher(a)">{{ a.nome }} <span class="muted small">{{ a.turmaNome || '' }}</span></button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .busca { position: relative; }
    .sugestoes { position: absolute; top: 100%; left: 0; right: 0; z-index: 10; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); display: flex; flex-direction: column; }
    .sugestoes button { text-align: left; padding: 8px 12px; border: 0; background: transparent; cursor: pointer; }
    .sugestoes button:hover { background: var(--surface-2); }
  `],
})
export class BuscaAlunoComponent {
  private api = inject(CadastrosApi);
  placeholder = input('Nome do aluno ou código da carteirinha');
  /** Limpa o campo depois de escolher (para adicionar vários alunos em sequência). */
  limparAoEscolher = input(false);
  selecionado = output<Aluno>();
  termo = signal('');
  encontrados = signal<Aluno[]>([]);

  buscar(termo: string) {
    this.termo.set(termo);
    if (termo.trim().length < 2) { this.encontrados.set([]); return; }
    this.api.alunos({ nome: termo.trim(), apenasAtivos: false, size: 8 }).subscribe(p => this.encontrados.set(p.content));
  }

  porCodigo(ev: Event) {
    ev.preventDefault();
    const codigo = this.termo().trim();
    if (!codigo) return;
    if (this.encontrados().length === 1) { this.escolher(this.encontrados()[0]); return; }
    this.api.alunoPorCodigo(codigo, true).subscribe({ next: a => this.escolher(a), error: () => {} });
  }

  escolher(a: Aluno) {
    this.encontrados.set([]);
    this.termo.set(this.limparAoEscolher() ? '' : a.nome);
    this.selecionado.emit(a);
  }
}
