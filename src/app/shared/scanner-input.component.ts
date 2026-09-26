import { Component, DestroyRef, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';

/**
 * Campo de leitura para o leitor de código de barras (USB/HID, que "digita" o código e um Enter).
 * Mantém o foco, emite o valor no Enter e limpa o campo. Também aceita digitação manual.
 * Com `pausaMs` > 0, emite `pausa` com o valor atual quando o operador para de digitar por esse tempo
 * (o leitor digita e manda Enter antes disso, então só a digitação manual dispara).
 */
@Component({
  selector: 'app-scanner-input',
  template: `
    <div class="scanner" [class.scanner-lg]="grande()">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="currentColor" d="M3 5h2v14H3zm3 0h1v14H6zm2 0h2v14H8zm3 0h1v14h-1zm2 0h3v14h-3zm4 0h1v14h-1zm2 0h2v14h-2z"/>
      </svg>
      <input #campo type="text" autocomplete="off" spellcheck="false" inputmode="numeric"
             [placeholder]="placeholder()" [value]="valor()" [disabled]="desabilitado()"
             (input)="digitou(campo.value)" (keydown.enter)="enviar($event)" (blur)="refocar()" />
      @if (valor()) {
        <button type="button" class="btn btn-sm" (click)="enviar()">Ler</button>
      }
    </div>
  `,
  styles: [`
    .scanner { display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 14px; border: 2px solid var(--line-strong);
      border-radius: var(--radius-lg); background: var(--surface); color: var(--muted); transition: border-color .12s, box-shadow .12s; }
    .scanner:focus-within { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(0, 167, 225, 0.18); color: var(--primary); }
    input { flex: 1; border: 0; outline: none; background: transparent; padding: 8px 0; font-size: 1.05rem; min-width: 0; }
    .scanner-lg input { font-size: 1.35rem; padding: 12px 0; letter-spacing: 0.04em; }
    input::placeholder { color: var(--muted); letter-spacing: 0; }
  `],
})
export class ScannerInputComponent {
  placeholder = input('Leia o código de barras');
  grande = input(false);
  desabilitado = input(false);
  /** Mantém o foco no campo mesmo quando o operador clica fora (útil no PDV/balcão). */
  manterFoco = input(true);
  /** Tempo sem digitar (ms) para emitir `pausa`; 0 desativa. */
  pausaMs = input(0);
  lido = output<string>();
  pausa = output<string>();

  valor = signal('');
  private campo = viewChild.required<ElementRef<HTMLInputElement>>('campo');
  private timerPausa?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      if (!this.desabilitado()) this.focar();
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timerPausa));
  }

  digitou(texto: string) {
    this.valor.set(texto);
    clearTimeout(this.timerPausa);
    const codigo = texto.trim();
    if (this.pausaMs() > 0 && codigo) {
      this.timerPausa = setTimeout(() => this.pausa.emit(codigo), this.pausaMs());
    }
  }

  /** Limpa o campo sem emitir nada (ex.: quando a pausa já resolveu o código). */
  limpar() {
    clearTimeout(this.timerPausa);
    this.valor.set('');
    this.focar();
  }

  focar() {
    setTimeout(() => this.campo().nativeElement.focus(), 0);
  }

  enviar(ev?: Event) {
    ev?.preventDefault();
    const codigo = this.valor().trim();
    if (!codigo) return;
    clearTimeout(this.timerPausa);
    this.valor.set('');
    this.lido.emit(codigo);
    this.focar();
  }

  refocar() {
    if (!this.manterFoco()) return;
    // Só volta o foco se o usuário não foi para outro campo/botão da tela
    setTimeout(() => {
      const ativo = document.activeElement;
      const ehInterativo = ativo && ativo !== document.body && ativo.tagName !== 'HTML';
      if (!ehInterativo) this.campo().nativeElement.focus();
    }, 150);
  }
}
