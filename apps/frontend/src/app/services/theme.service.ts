import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'predict-engine-theme';
  
  #theme = signal<Theme>(this.getInitialTheme());

  theme = this.#theme.asReadonly();
  isDark = this.#theme.asReadonly();
  isLight = this.#theme.asReadonly();

  constructor() {
    // Sync theme changes to document
    effect(() => {
      const theme = this.#theme();
      document.documentElement.classList.toggle('light', theme === 'light');
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem(this.STORAGE_KEY, theme);
    });
  }

  toggle() {
    this.#theme.set(this.#theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: Theme) {
    this.#theme.set(theme);
  }

  private getInitialTheme(): Theme {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    
    // Respect system preference
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }
}
