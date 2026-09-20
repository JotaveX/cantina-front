import { Component, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CadastrosApi } from '../../core/api.service';
import { Categoria, Produto } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { MascaraDataDirective } from '../../shared/mascara-data.directive';

@Component({
  selector: 'app-produto-form',
  imports: [ReactiveFormsModule, RouterLink, MascaraDataDirective],
  template: `
    <div class="page" style="max-width: 820px">
      <div class="page-head">
        <div><h1>{{ id() ? 'Editar produto' : 'Novo produto' }}</h1>
          <p>{{ id() ? 'A quantidade em estoque é ajustada por compras, baixas e sobras.' : 'Informe o estoque inicial, se já houver.' }}</p></div>
        <a routerLink="/produtos" class="btn">Voltar</a>
      </div>
      <form class="card" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="form-grid">
          <div class="field full"><label>Nome</label><input class="input" formControlName="nome" />
            @if (form.controls.nome.touched && form.controls.nome.invalid) { <span class="error">Informe o nome.</span> }</div>
          <div class="field"><label>Categoria</label>
            <select class="input" formControlName="categoriaId">
              <option [ngValue]="null">Sem categoria</option>
              @for (c of categorias(); track c.id) { <option [ngValue]="c.id">{{ c.nome }}</option> }
            </select></div>
          <div class="field"><label>Preço de venda (R$)</label><input class="input" type="number" step="0.01" min="0" formControlName="preco" />
            @if (form.controls.preco.touched && form.controls.preco.invalid) { <span class="error">Informe um preço válido.</span> }</div>
          <div class="field"><label>Código de barras (opcional)</label><input class="input" formControlName="codigoBarras" placeholder="Leia a etiqueta com o leitor" />
            <span class="hint">Permite adicionar o produto no PDV pelo leitor.</span></div>
          <div class="field"><label>Estoque mínimo</label><input class="input" type="number" min="0" formControlName="estoqueMinimo" />
            <span class="hint">Abaixo disso o produto aparece nos alertas.</span></div>
          <div class="field">
          <label>Validade (opcional)</label>
          <input 
          type="text" 
          class="input" 
          formControlName="validade" 
          placeholder="dd/mm/aaaa" 
          mascaraData
          maxlength="10"
          inputmode="numeric"
          />
          @if ((form.get('validade')?.hasError('dataInvalida') || form.get('validade')?.hasError('dataMuitoFutura')) && (form.get('validade')?.touched || form.get('validade')?.value?.length === 10)) {
          <span class="error">Data inválida.</span>
          }
          @if (form.get('validade')?.hasError('dataVencida') && (form.get('validade')?.touched || form.get('validade')?.value?.length === 10) && (form.get('validade')?.value?.length ?? 0) > 9 && !form.get('validade')?.hasError('dataInvalida')) {
          <span class="error">Produto vencido.</span>
          }
          </div>
          @if (!id()) { <div class="field"><label>Estoque inicial</label><input class="input" type="number" min="0" formControlName="quantidadeEstoque" /></div> }
          @else { <div class="field"><label>Estoque atual</label><input class="input" [value]="produto()?.quantidadeEstoque ?? ''" disabled /></div> }
          @if (id()) { <label class="check full"><input type="checkbox" formControlName="ativo" /> Produto ativo (aparece no PDV)</label> }
        </div>
        <div class="row mt">
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || salvando()">{{ salvando() ? 'Salvando…' : 'Salvar' }}</button>
        </div>
      </form>
    </div>
  `,
})
export class ProdutoFormComponent {
  id = input<string>();
  private fb = inject(FormBuilder);
  private api = inject(CadastrosApi);
  private router = inject(Router);
  private toast = inject(ToastService);
  private limiteAnosFuturoValidade = 100;
  categorias = signal<Categoria[]>([]);
  produto = signal<Produto | null>(null);
  salvando = signal(false);
  form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    categoriaId: [null as number | null],
    codigoBarras: [''],
    preco: [null as number | null, [Validators.required, Validators.min(0)]],
    quantidadeEstoque: [0, Validators.min(0)],
    estoqueMinimo: [0, Validators.min(0)],
    validade: ['', this.dataBrValidator()],
    ativo: [true],
  });

  constructor() {
    this.api.categorias().subscribe(c => this.categorias.set(c));
    setTimeout(() => { if (this.id()) this.carregar(Number(this.id())); });
  }

  private carregar(id: number) {
    this.api.produto(id).subscribe(p => {
      this.produto.set(p);
      this.form.patchValue({ nome: p.nome, categoriaId: p.categoriaId ?? null, codigoBarras: p.codigoBarras ?? '', preco: p.preco,
        quantidadeEstoque: p.quantidadeEstoque, estoqueMinimo: p.estoqueMinimo, ativo: p.ativo, validade: this.converterParaBr(p.validade) });
    });
  }

  salvar() {
    if (this.form.invalid) return;
    this.salvando.set(true);
    const v = this.form.getRawValue();
    console.log('salvar', v);
    this.api.salvarProduto({ id: this.id() ? Number(this.id()) : undefined, nome: v.nome!, categoriaId: v.categoriaId ?? undefined,
      codigoBarras: v.codigoBarras || undefined, preco: Number(v.preco), quantidadeEstoque: v.quantidadeEstoque ?? 0,
      estoqueMinimo: v.estoqueMinimo ?? 0, ativo: v.ativo ?? true, validade: this.converterParaISO(v.validade) ?? ''
       })
      .subscribe({ next: () => { this.toast.sucesso('Produto salvo'); this.router.navigate(['/produtos']); }, error: () => this.salvando.set(false) });
  }

  dataBrValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (!valor) return null; // campo opcional
  
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
      if (!match) return { dataInvalida: true };
  
      const [, dia, mes, ano] = match;
      const data = new Date(+ano, +mes - 1, +dia);
  
      const dataValida =
        data.getFullYear() === +ano &&
        data.getMonth() === +mes - 1 &&
        data.getDate() === +dia;
  
      if (!dataValida) return { dataInvalida: true };
  
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      data.setHours(0, 0, 0, 0);
  
      const limiteFuturo = new Date(hoje);
      limiteFuturo.setFullYear(limiteFuturo.getFullYear() + this.limiteAnosFuturoValidade);

      if (data > limiteFuturo) return { dataMuitoFutura: true };
      if (data < hoje) return { dataVencida: true };
  
      return null;
    };
  }

  converterParaISO(dataBr: string | null): string {
    console.log('converterParaISO', dataBr);
    if(!dataBr) return '';
    const [dia, mes, ano] = dataBr.split('/');
    return `${ano}-${mes}-${dia}`; // "2026-09-20"
  }

  converterParaBr(dataIso: string | null): string {
    if(!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`; // "20/09/2026"
  }
}
