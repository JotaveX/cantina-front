import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toasts',
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast toast-{{ t.tipo }}" (click)="toast.fechar(t.id)">{{ t.texto }}</div>
      }
    </div>
  `,
  styles: [`
    .toasts { position: fixed; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 100; max-width: min(420px, calc(100vw - 40px)); }
    .toast { padding: 12px 16px; border-radius: var(--radius); color: #fff; font-weight: 500; box-shadow: 0 6px 20px rgba(0,0,0,.18); cursor: pointer; }
    .toast-sucesso { background: var(--primary-deep); }
    .toast-erro { background: var(--red); }
    .toast-info { background: var(--ink-black); }
  `],
})
export class ToastsComponent {
  toast = inject(ToastService);
}
