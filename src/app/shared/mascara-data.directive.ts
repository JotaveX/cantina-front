import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[mascaraData]',
  standalone: true,
})
export class MascaraDataDirective {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, ''); // remove tudo que não é dígito

    if (valor.length > 8) valor = valor.slice(0, 8);

    if (valor.length > 4) {
      valor = `${valor.slice(0, 2)}/${valor.slice(2, 4)}/${valor.slice(4)}`;
    } else if (valor.length > 2) {
      valor = `${valor.slice(0, 2)}/${valor.slice(2)}`;
    }

    input.value = valor;
  }
}