import { Component, signal } from '@angular/core';
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
                  <stop stop-color="#6366f1"/>
                  <stop offset="1" stop-color="#a855f7"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span class="header__title">Predict<span class="header__title-accent">Engine</span></span>
        </a>

        <nav class="header__nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="header__link">
            Dashboard
          </a>
          <a routerLink="/predictions" routerLinkActive="active" class="header__link">
            Predictions
          </a>
        </nav>

        <div class="header__actions">
          <div class="header__status" [class.header__status--connected]="isConnected()">
            <span class="header__status-dot"></span>
            {{ isConnected() ? 'Connected' : 'Checking...' }}
          </div>
        </div>
      </div>
    </header>
  `,
    styles: [`
    .header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(10, 14, 26, 0.85);
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
    }

    .header__logo {
      display: flex;
      align-items: center;
    }

    .header__title {
      font-size: 1.125rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .header__title-accent {
      background: var(--gradient-hero);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
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

    .header__actions {
      margin-left: auto;
      display: flex;
      align-items: center;
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
  `],
})
export class HeaderComponent {
    isConnected = signal(false);

    constructor(private api: ApiService) {
        this.checkConnection();
    }

    private checkConnection() {
        this.api.getHealth().subscribe({
            next: () => this.isConnected.set(true),
            error: () => this.isConnected.set(false),
        });
    }
}
