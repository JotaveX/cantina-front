import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CadastrosApi, OperacoesApi } from '../../core/api.service';
import { Fornecedor, Produto } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { hojeIso } from '../../shared/datas';
import { DinheiroPipe } from '../../shared/dinheiro.pipe';

@Component({
  selector: 'app-compra-form',
  imports: [ReactiveFormsModule, RouterLink, DinheiroPipe],
  template: `
    <div class="page" style="max-width: 960px">
      <div class="page-head">
        <div><h1>Registrar compra</h1><p>Os produtos entram no estoque assim que a compra é salva.</p></div>
        <a routerLink="/compras" class="btn">Voltar</a>
      </div>
      <form class="card" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="form-grid" style="grid-template-columns: 2fr 1fr 2fr">
          <div class="field"><label>Fornecedor</label>
            <select class="input" formControlName="fornecedorId">
              <option [ngValue]="null">Selecione</option>
              @for (f of fornecedores(); track f.id) { <option [ngValue]="f.id">{{ f.nome }}</option> }
            </select></div>
          <div class="field"><label>Data</label><input class="input" type="date" formControlName="data" /></div>
          <div class="field"><label>Observação</label><input class="input" formControlName="observacao" placeholder="Nº da nota, etc." /></div>
        </div>
        <h3 class="mt mb">Itens</h3>
        <table class="table" formArrayName="itens">
          <thead><tr><th>Produto</th><th class="num" style="width:110px">Quantidade</th><th class="num" style="width:140px">Custo unit. (R$)</th><th class="num" style="width:120px">Subtotal</th><th style="width:60px"></th></tr></thead>
          <tbody>
            @for (g of itens.controls; track g; let i = $index) {
              <tr [formGroupName]="i">
                <td><select class="input" formControlName="produtoId"><option [ngValue]="null">Selecione</option>
                  @for (p of produtos(); track p.id) { <option [ngValue]="p.id">{{ p.nome }} (estoque {{ p.quantidadeEstoque }})</option> }</select></td>
                <td><input class="input num" type="number" min="1" formControlName="quantidade" /></td>
                <td><input class="input num" type="number" min="0" step="0.01" formControlName="custoUnitario" /></td>
                <td class="num">{{ (g.value.quantidade || 0) * (g.value.custoUnitario || 0) | dinheiro }}</td>
                <td class="actions"><button type="button" class="btn btn-sm btn-ghost" (click)="remover(i)" [disabled]="itens.length === 1">✕</button></td>
              </tr>
            }
          </tbody>
          <tfoot><tr><td colspan="3">Total</td><td class="num">{{ total() | dinheiro }}</td><td></td></tr></tfoot>
        </table>
        <div class="row mt">
          <button type="button" class="btn" (click)="adicionar()">Adicionar item</button>
          <span class="spacer"></span>
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || salvando()">{{ salvando() ? 'Salvando…' : 'Salvar compra' }}</button>
        </div>
      </form>
    </div>
  `,
})
export class CompraFormComponent {
  private fb = inject(FormBuilder);
  private cadastros = inject(CadastrosApi);
  private api = inject(OperacoesApi);
  private router = inject(Router);
  private toast = inject(ToastService);
  fornecedores = signal<Fornecedor[]>([]);
  produtos = signal<Produto[]>([]);
  salvando = signal(false);
  private versao = signal(0);

  form = this.fb.group({
    fornecedorId: [null as number | null, Validators.required],
    data: [hojeIso(), Validators.required],
    observacao: [''],
    itens: this.fb.array([this.novoItem()]),
  });
  get itens() { return this.form.controls.itens as FormArray; }
  total = computed(() => { this.versao(); return this.itens.controls.reduce((s, g) => s + (g.value.quantidade || 0) * (g.value.custoUnitario || 0), 0); });

  constructor() {
    this.cadastros.fornecedores().subscribe(f => this.fornecedores.set(f.filter(x => x.ativo)));
    this.cadastros.produtos({ apenasAtivos: true }).subscribe(p => this.produtos.set(p));
    this.form.valueChanges.subscribe(() => this.versao.update(v => v + 1));
  }

  private novoItem() {
    return this.fb.group({ produtoId: [null as number | null, Validators.required], quantidade: [1, [Validators.required, Validators.min(1)]], custoUnitario: [0, [Validators.required, Validators.min(0)]] });
  }
  adicionar() { this.itens.push(this.novoItem()); }
  remover(i: number) { this.itens.removeAt(i); }

  salvar() {
    if (this.form.invalid) return;
    this.salvando.set(true);
    const v = this.form.getRawValue();
    this.api.criarCompra({ fornecedorId: v.fornecedorId!, data: v.data!, observacao: v.observacao || undefined,
      itens: v.itens.map(i => ({ produtoId: i.produtoId!, quantidade: Number(i.quantidade), custoUnitario: Number(i.custoUnitario) })) })
      .subscribe({ next: c => { this.toast.sucesso(`Compra #${c.id} registrada, estoque atualizado`); this.router.navigate(['/compras']); }, error: () => this.salvando.set(false) });
  }
}
