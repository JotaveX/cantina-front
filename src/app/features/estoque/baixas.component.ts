import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CadastrosApi, OperacoesApi } from '../../core/api.service';
import { Baixa, MotivoBaixa, Produto } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { diasAtrasIso, hojeIso } from '../../shared/datas';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-baixas',
  imports: [ReactiveFormsModule, FormsModule, DatePipe, StatusBadgeComponent],
  template: `
    <div class="page">
      <div class="page-head"><div><h1>Baixa manual de estoque</h1><p>Perdas, quebras e vencimentos. Separado da baixa automática das vendas.</p></div></div>
      <form class="card card-tight mb" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="form-grid" style="grid-template-columns: 2fr 1fr 1fr 2fr">
          <div class="field"><label>Produto</label>
            <select class="input" formControlName="produtoId"><option [ngValue]="null">Selecione</option>
              @for (p of produtos(); track p.id) { <option [ngValue]="p.id">{{ p.nome }} (estoque {{ p.quantidadeEstoque }})</option> }</select></div>
          <div class="field"><label>Quantidade</label><input class="input" type="number" min="1" formControlName="quantidade" /></div>
          <div class="field"><label>Motivo</label>
            <select class="input" formControlName="motivo"><option value="PERDA">Perda</option><option value="QUEBRA">Quebra</option><option value="VENCIMENTO">Vencimento</option><option value="OUTRO">Outro</option></select></div>
          <div class="field"><label>Observação</label><input class="input" formControlName="observacao" /></div>
        </div>
        <div class="row mt"><button class="btn btn-primary" type="submit" [disabled]="form.invalid || salvando()">Registrar baixa</button></div>
      </form>
      <div class="filters">
        <div class="field"><label>De</label><input class="input" type="date" [ngModel]="inicio()" (ngModelChange)="inicio.set($event); carregar()" /></div>
        <div class="field"><label>Até</label><input class="input" type="date" [ngModel]="fim()" (ngModelChange)="fim.set($event); carregar()" /></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Data</th><th>Produto</th><th class="num">Qtd</th><th>Motivo</th><th>Observação</th><th>Por</th></tr></thead>
          <tbody>
            @for (b of lista(); track b.id) {
              <tr><td>{{ b.dataHora | date:'dd/MM HH:mm' }}</td><td>{{ b.produtoNome }}</td><td class="num">{{ b.quantidade }}</td>
                <td><app-badge [valor]="b.motivo" /></td><td>{{ b.observacao || '—' }}</td><td>{{ b.usuarioNome || '—' }}</td></tr>
            } @empty { <tr><td colspan="6" class="empty">Nenhuma baixa no período.</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class BaixasComponent {
  private fb = inject(FormBuilder);
  private cadastros = inject(CadastrosApi);
  private api = inject(OperacoesApi);
  private toast = inject(ToastService);
  produtos = signal<Produto[]>([]);
  lista = signal<Baixa[]>([]);
  salvando = signal(false);
  inicio = signal(diasAtrasIso(30));
  fim = signal(hojeIso());
  form = this.fb.group({
    produtoId: [null as number | null, Validators.required], quantidade: [1, [Validators.required, Validators.min(1)]],
    motivo: ['PERDA' as MotivoBaixa, Validators.required], observacao: [''],
  });

  constructor() { this.carregarProdutos(); this.carregar(); }
  carregarProdutos() { this.cadastros.produtos({ apenasAtivos: true }).subscribe(p => this.produtos.set(p)); }
  carregar() { this.api.baixas(this.inicio(), this.fim()).subscribe(l => this.lista.set(l)); }

  salvar() {
    if (this.form.invalid) return;
    this.salvando.set(true);
    const v = this.form.getRawValue();
    this.api.criarBaixa({ produtoId: v.produtoId!, quantidade: Number(v.quantidade), motivo: v.motivo!, observacao: v.observacao || undefined })
      .subscribe({
        next: () => { this.toast.sucesso('Baixa registrada'); this.form.reset({ quantidade: 1, motivo: 'PERDA' }); this.carregar(); this.carregarProdutos(); this.salvando.set(false); },
        error: () => this.salvando.set(false),
      });
  }
}
