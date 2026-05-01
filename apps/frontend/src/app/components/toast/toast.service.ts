import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();

  show(message: string, type: Toast['type'] = 'info', duration = 3000) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const toast: Toast = { id, message, type, duration };
    this._toasts.update(t => [...t, toast]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, duration = 3000) { this.show(message, 'success', duration); }
  error(message: string, duration = 5000) { this.show(message, 'error', duration); }
  info(message: string, duration = 3000) { this.show(message, 'info', duration); }
  warning(message: string, duration = 4000) { this.show(message, 'warning', duration); }

  dismiss(id: string) {
    this._toasts.update(t => t.filter(x => x.id !== id));
  }

  clear() {
    this._toasts.set([]);
  }
}
