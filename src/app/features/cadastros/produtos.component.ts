import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CadastrosApi } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Categoria, Produto } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-produtos',
  imports: [FormsModule, RouterLink, DinheiroPipe],
  template: `
    <div class="page">
      <div class="page-head">
        <div><h1>Produtos</h1><p>O estoque muda por vendas, compras, baixas e contagem de sobras, não por aqui.</p></div>
        <div class="row">
          <button class="btn" (click)="mostrarCategorias.set(!mostrarCategorias())">Categorias</button>
          <a routerLink="/produtos/novo" class="btn btn-primary">Novo produto</a>
        </div>
      </div>

      @if (mostrarCategorias()) {
        <div class="card card-tight mb">
          <div class="row" style="align-items:flex-end">
            <div class="field" style="flex:1"><label>{{ categoriaEditando() ? 'Renomear categoria' : 'Nova categoria' }}</label>
              <input class="input" [ngModel]="nomeCategoria()" (ngModelChange)="nomeCategoria.set($event)" (keydown.enter)="salvarCategoria()" /></div>
            <button class="btn btn-primary" (click)="salvarCategoria()" [disabled]="!nomeCategoria().trim()">{{ categoriaEditando() ? 'Salvar' : 'Adicionar' }}</button>
            @if (categoriaEditando()) { <button class="btn" (click)="categoriaEditando.set(null); nomeCategoria.set('')">Cancelar</button> }
          </div>
          <div class="row mt">
            @for (c of categorias(); track c.id) {
              <span class="badge" style="padding:6px 10px">{{ c.nome }}
                <button class="btn btn-sm btn-ghost" (click)="categoriaEditando.set(c); nomeCategoria.set(c.nome)">editar</button>
                @if (auth.admin()) { <button class="btn btn-sm btn-ghost" (click)="excluirCategoria(c)">excluir</button> }
              </span>
            } @empty { <span class="muted small">Nenhuma categoria.</span> }
          </div>
        </div>
      }

      <div class="filters">
        <div class="field"><label>Nome</label><input class="input" [ngModel]="nome()" (ngModelChange)="nome.set($event); buscar()" placeholder="Buscar" /></div>
        <div class="field"><label>Categoria</label>
          <select class="input" [ngModel]="categoriaId()" (ngModelChange)="categoriaId.set($event); buscar()">
            <option [ngValue]="null">Todas</option>
            @for (c of categorias(); track c.id) { <option [ngValue]="c.id">{{ c.nome }}</option> }
          </select>
        </div>
        <label class="check"><input type="checkbox" [ngModel]="apenasAtivos()" (ngModelChange)="apenasAtivos.set($event); buscar()" /> Só ativos</label>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Produto</th><th>Categoria</th><th>Código</th><th class="num">Preço</th><th class="num">Estoque</th><th class="num">Mínimo</th><th>Validade</th><th></th></tr></thead>
          <tbody>
            @for (p of produtos(); track p.id) {
              <tr [class.muted]="!p.ativo">
                <td><a [routerLink]="['/produtos', p.id]">{{ p.nome }}</a>{{ p.ativo ? '' : ' (desativado)' }}</td>
                <td>{{ p.categoriaNome || '—' }}</td>
                <td>{{ p.codigoBarras || '—' }}</td>
                <td class="num">{{ p.preco | dinheiro }}</td>
                <td class="num" [class.neg]="p.estoqueBaixo">{{ p.quantidadeEstoque }} @if (p.estoqueBaixo) { <span class="badge badge-amber">baixo</span> }</td>
                <td class="num">{{ p.estoqueMinimo }}</td>
                <td>{{ p.validade }}</td>
                <td class="actions"><a [routerLink]="['/produtos', p.id]" class="btn btn-sm">Editar</a></td>
              </tr>
            } @empty { <tr><td colspan="7" class="empty">{{ carregando() ? 'Carregando…' : 'Nenhum produto encontrado.' }}</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ProdutosComponent {
  private api = inject(CadastrosApi);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  produtos = signal<Produto[]>([]);
  categorias = signal<Categoria[]>([]);
  nome = signal('');
  categoriaId = signal<number | null>(null);
  apenasAtivos = signal(true);
  carregando = signal(false);
  mostrarCategorias = signal(false);
  nomeCategoria = signal('');
  categoriaEditando = signal<Categoria | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() { this.carregarCategorias(); this.buscar(); }

  carregarCategorias() { this.api.categorias().subscribe(c => this.categorias.set(c)); }

  converterParaBr(dataIso: string | null): string {
    if(!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`; // "20/09/2026"
  }

  buscar() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.carregando.set(true);
      this.api.produtos({ nome: this.nome(), categoriaId: this.categoriaId(), apenasAtivos: this.apenasAtivos() })
        .subscribe({ next: l => { this.produtos.set(l.map(produto => ({ ...produto, validade: this.converterParaBr(produto.validade) }))); this.carregando.set(false); }, error: () => this.carregando.set(false) });
    }, 250);
  }

  salvarCategoria() {
    const nome = this.nomeCategoria().trim();
    if (!nome) return;
    this.api.salvarCategoria({ id: this.categoriaEditando()?.id, nome }).subscribe(() => {
      this.toast.sucesso('Categoria salva');
      this.nomeCategoria.set(''); this.categoriaEditando.set(null);
      this.carregarCategorias(); this.buscar();
    });
  }

  excluirCategoria(c: Categoria) {
    if (!confirm(`Excluir a categoria ${c.nome}? Produtos que a usam impedem a exclusão.`)) return;
    this.api.excluirCategoria(c.id).subscribe(() => { this.toast.sucesso('Categoria excluída'); this.carregarCategorias(); });
  }
}
