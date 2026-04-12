import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'sp-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar__header">
        <a routerLink="/" class="sidebar__logo">
          <div class="sidebar__logo-icon">
            <span class="material-symbols-rounded">analytics</span>
          </div>
          <span class="sidebar__brand">
            <span class="sidebar__brand-text">Predict</span>
            <span class="sidebar__brand-accent">Engine</span>
          </span>
        </a>
      </div>

      <nav class="sidebar__nav">
        <div class="nav-group">
          <span class="nav-label">Navigation</span>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
            <span class="material-symbols-rounded">space_dashboard</span>
            <span>Dashboard</span>
          </a>
          <a routerLink="/predictions" routerLinkActive="active" class="nav-item">
            <span class="material-symbols-rounded">auto_awesome</span>
            <span>Predictions</span>
          </a>
          <a routerLink="/system" routerLinkActive="active" class="nav-item">
            <span class="material-symbols-rounded">monitoring</span>
            <span>System</span>
          </a>
        </div>

        <div class="nav-group">
          <span class="nav-label">Activity</span>
          <a routerLink="/live" routerLinkActive="active" class="nav-item nav-item--live">
            <span class="material-symbols-rounded">sports_soccer</span>
            <span>Live Now</span>
            @if (liveCount() > 0) {
              <span class="live-dot">{{ liveCount() }}</span>
            }
          </a>
          <a routerLink="/tracker" routerLinkActive="active" class="nav-item">
            <span class="material-symbols-rounded">receipt_long</span>
            <span>My Tracker</span>
          </a>
        </div>
      </nav>

      <div class="sidebar__footer">
        @if (authService.isAuthenticated) {
          <div class="user-card">
            <div class="user-avatar">
              <span class="material-symbols-rounded">person</span>
            </div>
            <div class="user-info">
              <span class="user-name">{{ userName() }}</span>
              <span class="user-status">Active</span>
            </div>
          </div>
          <button class="btn-logout" (click)="logout()">
            <span class="material-symbols-rounded">logout</span>
          </button>
        } @else {
          <div class="auth-actions">
            <a routerLink="/login" class="btn-auth btn-auth--primary">
              <span class="material-symbols-rounded">login</span>
              Sign in
            </a>
          </div>
        }

        <button class="theme-toggle" (click)="themeService.toggle()" [attr.aria-label]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
          @if (themeService.isDark()) {
            <span class="material-symbols-rounded">light_mode</span>
          } @else {
            <span class="material-symbols-rounded">dark_mode</span>
          }
          <span class="theme-toggle__label">{{ themeService.isDark() ? 'Dark' : 'Light' }}</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 260px;
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      z-index: 100;
      transition: background var(--transition-base), border-color var(--transition-base);
    }

    .sidebar__header {
      height: 64px;
      display: flex;
      align-items: center;
      padding: 0 20px;
      border-bottom: 1px solid var(--color-border);
    }

    .sidebar__logo {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }

    .sidebar__logo-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: var(--gradient-hero);
      display: grid;
      place-items: center;
      box-shadow: var(--shadow-glow);

      .material-symbols-rounded {
        font-size: 18px;
        color: white;
      }
    }

    .sidebar__brand {
      display: flex;
      font-size: 1.125rem;
      font-weight: 400;
      letter-spacing: 0.06em;
    }

    .sidebar__brand-text {
      color: var(--color-text-primary);
    }

    .sidebar__brand-accent {
      background: var(--gradient-neon);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-style: italic;
    }

    .sidebar__nav {
      flex: 1;
      padding: 16px 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0 12px 8px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all var(--transition-fast);
      position: relative;

      &:hover {
        background: var(--color-accent-subtle);
        color: var(--color-text-primary);
      }

      .material-symbols-rounded {
        font-size: 18px;
        opacity: 0.7;
        transition: all var(--transition-fast);
      }

      &:hover .material-symbols-rounded {
        opacity: 1;
      }

      &.active {
        background: var(--color-accent-subtle);
        color: var(--color-accent);

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 16px;
          background: var(--color-accent);
          border-radius: 0 2px 2px 0;
        }

        .material-symbols-rounded {
          opacity: 1;
          color: var(--color-accent);
        }
      }
    }

    .sidebar__footer {
      padding: 16px;
      border-top: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: var(--radius-sm);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      background: var(--color-surface-elevated);
      border: 1px solid var(--color-border);
      display: grid;
      place-items: center;
      color: var(--color-text-secondary);

      .material-symbols-rounded {
        font-size: 16px;
      }
    }

    .user-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-status {
      font-size: 0.6875rem;
      color: var(--color-success);
    }

    .btn-logout {
      display: grid;
      place-items: center;
      width: 100%;
      padding: 8px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-danger-bg);
        color: var(--color-danger);
        border-color: var(--color-danger-border);
      }

      .material-symbols-rounded {
        font-size: 18px;
      }
    }

    .auth-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn-auth {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all var(--transition-fast);

      .material-symbols-rounded {
        font-size: 16px;
      }

      &--primary {
        background: var(--color-accent-subtle);
        color: var(--color-accent);
        border: 1px solid var(--color-accent-border);

        &:hover {
          background: var(--color-accent);
          color: white;
        }
      }
    }

    .theme-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-bg-card);
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all var(--transition-fast);
      font-family: var(--font-family);

      &:hover {
        background: var(--color-bg-card-hover);
        border-color: var(--color-border-strong);
        color: var(--color-text-primary);
      }

      .material-symbols-rounded {
        font-size: 16px;
      }
    }

    .theme-toggle__label {
      flex: 1;
      text-align: right;
    }

    .nav-item--live {
      position: relative;
    }

    .live-dot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      background: #ef4444;
      color: #fff;
      font-size: 0.625rem;
      font-weight: 700;
      font-family: var(--font-family);
      line-height: 1;
      margin-left: auto;
    }

    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
      }
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  private router = inject(Router);
  private http = inject(HttpClient);

  liveCount = signal(0);
  private pollInterval: any = null;

  ngOnInit() {
    this.fetchLiveCount();
    this.pollInterval = setInterval(() => this.fetchLiveCount(), 15000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private fetchLiveCount() {
    this.http.get<any>('http://127.0.0.1:3000/api/live-scores').subscribe({
      next: (d) => this.liveCount.set(d.live || 0),
      error: () => this.liveCount.set(0),
    });
  }

  userName() {
    const user = this.authService.currentUser();
    return user?.firstName || user?.email?.split('@')[0] || 'Guest';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
