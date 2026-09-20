import { Pipe, PipeTransform } from '@angular/core';

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Pipe({ name: 'dinheiro' })
export class DinheiroPipe implements PipeTransform {
  transform(valor: number | string | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') return '';
    return fmt.format(Number(valor));
  }
}
