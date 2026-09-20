import { Component, computed, input } from '@angular/core';
import { StatusVenda, FormaPagamento, TipoLancamento } from '../core/models';

const ROTULOS: Record<string, { texto: string; classe: string }> = {
  PENDENTE: { texto: 'Pendente', classe: 'badge-amber' },
  RETIRADO_PARCIAL: { texto: 'Parcial', classe: 'badge-amber' },
  RETIRADO: { texto: 'Retirado', classe: 'badge-green' },
  CANCELADO: { texto: 'Cancelado', classe: 'badge-red' },
  FIADO: { texto: 'Fiado', classe: 'badge-amber' },
  PAGO_NA_HORA: { texto: 'Pago', classe: 'badge-green' },
  CREDITO: { texto: 'Crédito', classe: 'badge-green' },
  PAGAMENTO: { texto: 'Pagamento', classe: 'badge-green' },
  DEBITO_FIADO: { texto: 'Compra fiado', classe: 'badge-amber' },
  ESTORNO: { texto: 'Estorno', classe: 'badge' },
  AJUSTE: { texto: 'Ajuste', classe: 'badge' },
  ADMIN: { texto: 'Admin', classe: 'badge-green' },
  OPERADOR: { texto: 'Operador', classe: 'badge' },
  PERDA: { texto: 'Perda', classe: 'badge-red' },
  QUEBRA: { texto: 'Quebra', classe: 'badge-red' },
  VENCIMENTO: { texto: 'Vencimento', classe: 'badge-amber' },
  OUTRO: { texto: 'Outro', classe: 'badge' },
};

@Component({
  selector: 'app-badge',
  template: `<span class="badge {{ info().classe }}">{{ info().texto }}</span>`,
})
export class StatusBadgeComponent {
  valor = input.required<StatusVenda | FormaPagamento | TipoLancamento | string>();
  info = computed(() => ROTULOS[this.valor()] ?? { texto: this.valor(), classe: '' });
}
