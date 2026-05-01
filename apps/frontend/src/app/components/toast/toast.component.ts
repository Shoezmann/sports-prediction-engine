import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

@Component({
  selector: 'sp-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (toastService.toasts().length > 0) {
    <div class="toasts">
      @for (t of toastService.toasts(); track t.id) {
        <div class="toast toast--{{ t.type }}" (click)="toastService.dismiss(t.id)">
          <span class="toast__icon">{{ ICONS[t.type] }}</span>
          <span class="toast__msg">{{ t.message }}</span>
          <button class="toast__close" (click)="toastService.dismiss(t.id)">&times;</button>
        </div>
      }
    </div>
    }
  `,
  styles: [`
    .toasts{position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:400px;pointer-events:none}
    .toast{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:var(--radius-xs);font-family:var(--font-family);font-size:0.8125rem;pointer-events:auto;box-shadow:var(--shadow-lg);animation:toastIn 0.3s ease-out forwards;cursor:pointer}
    @keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
    .toast__icon{font-size:1rem;font-weight:700;flex-shrink:0;width:20px;text-align:center}
    .toast__msg{flex:1;line-height:1.4}
    .toast__close{background:none;border:none;font-size:1.125rem;color:inherit;opacity:0.5;cursor:pointer;padding:0 4px;line-height:1;flex-shrink:0}
    .toast__close:hover{opacity:1}

    /* Theme-aware colors */
    .toast--success{background:var(--color-bg-elevated,#18181c);color:var(--color-success,#22c55e);border:1px solid var(--color-success-border,rgba(34,197,94,0.2))}
    .toast--error{background:var(--color-bg-elevated,#18181c);color:var(--color-danger,#ef4444);border:1px solid var(--color-danger-border,rgba(239,68,68,0.2))}
    .toast--warning{background:var(--color-bg-elevated,#18181c);color:var(--color-warning,#f59e0b);border:1px solid var(--color-warning-border,rgba(245,158,11,0.2))}
    .toast--info{background:var(--color-bg-elevated,#18181c);color:var(--color-info,#3b82f6);border:1px solid var(--color-info-border,rgba(59,130,246,0.2))}
  `]
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
  protected readonly ICONS = ICONS;
}
