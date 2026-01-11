import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private toastCounter = 0;

  show(message: string, type: Toast['type'] = 'info', duration = 3000): void {
    const id = `toast-${++this.toastCounter}`;
    const toast: Toast = { id, message, type, duration };

    this.toasts.update((toasts) => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  remove(id: string): void {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }
}
