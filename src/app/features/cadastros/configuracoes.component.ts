import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CadastrosApi } from '../../core/api.service';
import { PeriodoFechamento } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { dataBr, mesAno } from '../../shared/datas';

@Component({
  selector: 'app-configuracoes',
  imports: [ReactiveFormsModule],
  template: `
    <div class="page" style="max-width: 720px">
      <div class="page-head"><div><h1>Configurações</h1><p>Fechamento mensal da cantina e texto dos bilhetes de cobrança.</p></div></div>
      <form class="card stack" [formGroup]="form" (ngSubmit)="salvar()">
        <div class="field"><label>Dia do fechamento</label>
          <input class="input" type="number" min="1" max="31" formControlName="diaFechamento" style="max-width: 120px" />
          <span class="hint">O fechamento de um mês vai do dia seguinte ao fechamento anterior até este dia.
            Em meses mais curtos, usa o último dia do mês.</span></div>
        <div class="field"><label>Instruções no bilhete de cobrança</label>
          <textarea class="input" rows="3" maxlength="500" formControlName="instrucoesPagamento"
            placeholder="Ex.: Efetuar o pagamento na secretaria até o dia 5."></textarea></div>
        @if (ciclo(); as c) {
          <p class="muted small">Ciclo atual: fechamento de {{ mesAno(c.ano, c.mes) }} ({{ dataBr(c.inicio) }} a {{ dataBr(c.fim) }}).</p>
        }
        <div><button class="btn btn-primary" type="submit" [disabled]="form.invalid || salvando()">Salvar</button></div>
      </form>
    </div>
  `,
})
export class ConfiguracoesComponent {
  private fb = inject(FormBuilder);
  private api = inject(CadastrosApi);
  private toast = inject(ToastService);
  protected dataBr = dataBr;
  protected mesAno = mesAno;
  ciclo = signal<PeriodoFechamento | null>(null);
  salvando = signal(false);
  form = this.fb.nonNullable.group({
    diaFechamento: [25, [Validators.required, Validators.min(1), Validators.max(31)]],
    instrucoesPagamento: [''],
  });

  constructor() {
    this.api.configuracao().subscribe(c => {
      this.form.setValue({ diaFechamento: c.diaFechamento, instrucoesPagamento: c.instrucoesPagamento ?? '' });
      this.ciclo.set(c.cicloAtual);
    });
  }

  salvar() {
    const v = this.form.getRawValue();
    this.salvando.set(true);
    this.api.salvarConfiguracao({ diaFechamento: Number(v.diaFechamento), instrucoesPagamento: v.instrucoesPagamento || undefined })
      .subscribe({
        next: c => { this.ciclo.set(c.cicloAtual); this.toast.sucesso('Configurações salvas'); this.salvando.set(false); },
        error: () => this.salvando.set(false),
      });
  }
}
