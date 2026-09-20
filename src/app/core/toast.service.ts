import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; tipo: 'sucesso' | 'erro' | 'info'; texto: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  sucesso(texto: string) { this.push('sucesso', texto); }
  erro(texto: string) { this.push('erro', texto, 6000); }
  info(texto: string) { this.push('info', texto); }

  fechar(id: number) { this.toasts.update(t => t.filter(x => x.id !== id)); }

  private push(tipo: Toast['tipo'], texto: string, ms = 3500) {
    const id = ++this.seq;
    this.toasts.update(t => [...t, { id, tipo, texto }]);
    setTimeout(() => this.fechar(id), ms);
  }
}
