import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CadastrosApi, OperacoesApi } from '../../core/api.service';
import { Produto } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-sobras-form',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page" style="max-width: 900px">
      <div class="page-head">
        <div><h1>Nova contagem de sobras</h1><p>Preencha só os produtos que você contou. Os demais ficam de fora desta contagem.</p></div>
        <a routerLink="/sobras" class="btn">Voltar</a>
      </div>
      <div class="card">
        <div class="row mb">
          <input class="input" style="max-width:280px" placeholder="Filtrar produto" [ngModel]="filtro()" (ngModelChange)="filtro.set($event)" />
          <span class="spacer"></span>
          <span class="muted small">{{ preenchidos() }} produto(s) contado(s)</span>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Produto</th><th class="num">No sistema</th><th class="num" style="width:150px">Contado</th><th class="num">Diferença</th></tr></thead>
            <tbody>
              @for (p of filtrados(); track p.id) {
                <tr>
                  <td>{{ p.nome }}</td><td class="num">{{ p.quantidadeEstoque }}</td>
                  <td><input class="input num" type="number" min="0" [ngModel]="contagem()[p.id] ?? ''" (ngModelChange)="definir(p.id, $event)" /></td>
                  <td class="num" [class.neg]="dif(p) !== null && dif(p)! < 0" [class.pos]="dif(p) !== null && dif(p)! > 0">
                    @if (dif(p) !== null) { {{ dif(p)! > 0 ? '+' : '' }}{{ dif(p) }} } @else { — }</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="form-grid mt">
          <div class="field"><label>Observação</label><input class="input" [ngModel]="observacao()" (ngModelChange)="observacao.set($event)" placeholder="Ex.: pós-recreio da manhã" /></div>
          <label class="check" style="align-self:end"><input type="checkbox" [ngModel]="ajustar()" (ngModelChange)="ajustar.set($event)" /> Ajustar o estoque do sistema para a quantidade contada</label>
        </div>
        <div class="row mt">
          <button class="btn btn-primary" (click)="salvar()" [disabled]="preenchidos() === 0 || salvando()">{{ salvando() ? 'Salvando…' : 'Salvar contagem' }}</button>
        </div>
      </div>
    </div>
  `,
})
export class SobrasFormComponent {
  private cadastros = inject(CadastrosApi);
  private api = inject(OperacoesApi);
  private router = inject(Router);
  private toast = inject(ToastService);
  produtos = signal<Produto[]>([]);
  contagem = signal<Record<number, number>>({});
  filtro = signal('');
  observacao = signal('');
  ajustar = signal(false);
  salvando = signal(false);

  filtrados = computed(() => { const t = this.filtro().trim().toLowerCase(); return this.produtos().filter(p => !t || p.nome.toLowerCase().includes(t)); });
  preenchidos = computed(() => Object.keys(this.contagem()).length);

  constructor() { this.cadastros.produtos({ apenasAtivos: true }).subscribe(p => this.produtos.set(p)); }

  definir(id: number, valor: string | number) {
    this.contagem.update(c => {
      const n = { ...c };
      if (valor === '' || valor === null || valor === undefined) delete n[id]; else n[id] = Number(valor);
      return n;
    });
  }
  dif(p: Produto): number | null { const v = this.contagem()[p.id]; return v === undefined ? null : v - p.quantidadeEstoque; }

  salvar() {
    const itens = Object.entries(this.contagem()).map(([id, q]) => ({ produtoId: Number(id), quantidadeContada: q }));
    if (itens.length === 0) return;
    if (this.ajustar() && !confirm('Ajustar o estoque do sistema para as quantidades contadas?')) return;
    this.salvando.set(true);
    this.api.criarSobras({ observacao: this.observacao() || undefined, ajustarEstoque: this.ajustar(), itens }).subscribe({
      next: c => { this.toast.sucesso(`Contagem salva com ${c.totalDivergencias} divergência(s)`); this.router.navigate(['/sobras']); },
      error: () => this.salvando.set(false),
    });
  }
}
