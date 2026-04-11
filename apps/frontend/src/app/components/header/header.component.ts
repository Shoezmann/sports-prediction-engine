import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'sp-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <div class="header__inner">
        <a routerLink="/" class="header__brand">
          <div class="header__logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="url(#logo-gradient)"/>
              <path d="M8 14L12 18L20 10" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="28" y2="28">
                  <stop stop-color="#059669"/>
                  <stop offset="1" stop-color="#10b981"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span class="header__title">Predict<span class="header__title-accent">Engine</span></span>
        </a>

        <nav class="header__nav" [class.header__nav--open]="menuOpen()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
             class="header__link" (click)="closeMenu()">
            Dashboard
          </a>
          <a routerLink="/predictions" routerLinkActive="active"
             class="header__link" (click)="closeMenu()">
            Predictions
          </a>
        </nav>

        <div class="header__right">
          <div class="header__status" [class.header__status--connected]="isConnected()">
            <span class="header__status-dot"></span>
            <span class="header__status-text">{{ isConnected() ? 'Connected' : 'Offline' }}</span>
          </div>

          <button class="header__hamburger" (click)="toggleMenu()" [attr.aria-label]="menuOpen() ? 'Close menu' : 'Open menu'">
            <span class="header__hamburger-line" [class.open]="menuOpen()"></span>
            <span class="header__hamburger-line" [class.open]="menuOpen()"></span>
            <span class="header__hamburger-line" [class.open]="menuOpen()"></span>
          </button>
        </div>
      </div>
    </header>

    @if (menuOpen()) {
      <div class="header__backdrop" (click)="closeMenu()"></div>
    }
  `,
  styles: [`
    .header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(16px) saturate(180%);
      border-bottom: 1px solid var(--color-border);
    }

    .header__inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 var(--spacing-xl);
      height: 64px;
      display: flex;
      align-items: center;
      gap: var(--spacing-xl);
    }

    .header__brand {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      text-decoration: none;
      color: var(--color-text-primary);
      flex-shrink: 0;
    }

    .header__logo {
      display: flex;
      align-items: center;
    }

    .header__title {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .header__title-accent {
      background: linear-gradient(135deg, #10b981, #34d399, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      padding-bottom: 0.1em;
      margin-left: 2px;
      display: inline-block;
      font-style: italic;
      font-weight: 900;
      filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.6));
    }

    .header__nav {
      display: flex;
      gap: var(--spacing-xs);
      margin-left: var(--spacing-xl);
    }

    .header__link {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      text-decoration: none;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.05);
      }

      &.active {
        color: var(--color-accent-hover);
        background: var(--color-accent-subtle);
      }
    }

    .header__right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .header__status {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-muted);
    }

    .header__status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-text-muted);
      transition: background var(--transition-base);
    }

    .header__status--connected .header__status-dot {
      background: var(--color-success);
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
      animation: pulse-glow 2s ease-in-out infinite;
    }

    .header__status--connected {
      color: var(--color-success);
    }

    // Hamburger - hidden on desktop
    .header__hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      padding: 8px;
      background: none;
      border: none;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .header__hamburger-line {
      display: block;
      width: 20px;
      height: 2px;
      background: var(--color-text-secondary);
      border-radius: 2px;
      transition: all var(--transition-base);
    }

    .header__hamburger-line.open:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }
    .header__hamburger-line.open:nth-child(2) {
      opacity: 0;
    }
    .header__hamburger-line.open:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }

    .header__backdrop {
      display: none;
    }

    // ─── Mobile ─────────────────────────────────────────────
    @media (max-width: 640px) {
      .header__inner {
        padding: 0 var(--spacing-md);
        height: 56px;
      }

      .header__hamburger {
        display: flex;
      }

      .header__status-text {
        display: none;
      }

      .header__nav {
        position: fixed;
        top: 56px;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.97);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--color-border);
        padding: var(--spacing-md);
        flex-direction: column;
        gap: var(--spacing-xs);
        margin-left: 0;
        transform: translateY(-100%);
        opacity: 0;
        pointer-events: none;
        transition: all var(--transition-base);
        z-index: 99;
      }

      .header__nav--open {
        transform: translateY(0);
        opacity: 1;
        pointer-events: all;
      }

      .header__link {
        padding: 0.75rem 1rem;
        font-size: 1rem;
      }

      .header__backdrop {
        display: block;
        position: fixed;
        inset: 0;
        top: 56px;
        background: rgba(0, 0, 0, 0.4);
        z-index: 98;
      }
    }
  `],
})
export class HeaderComponent {
  private api = inject(ApiService);
  isConnected = signal(false);
  menuOpen = signal(false);
  
  constructor() {
    this.checkConnection();
  }

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  private checkConnection() {
    this.api.getHealth().subscribe({
      next: () => this.isConnected.set(true),
      error: () => this.isConnected.set(false),
    });
  }
}
