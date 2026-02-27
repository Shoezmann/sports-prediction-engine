import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'sp-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar__brand">
        <a routerLink="/" class="sidebar__logo-link">
          <div class="sidebar__logo-icon">
            <span class="material-symbols-rounded" style="color: white; font-size: 24px;">analytics</span>
          </div>
          <span class="sidebar__title">Predict<span class="sidebar__title-accent">Engine</span></span>
        </a>
      </div>

      <nav class="sidebar__nav">
        <div class="nav-section">
          <div class="nav-section-title">MAIN</div>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="sidebar__link">
            <span class="material-symbols-rounded">dashboard</span>
            Dashboard
          </a>
          <a routerLink="/predictions" routerLinkActive="active" class="sidebar__link">
            <span class="material-symbols-rounded">online_prediction</span>
            Predictions
          </a>
        </div>
        
        <div class="nav-section">
          <div class="nav-section-title">TRACKING</div>
          <a routerLink="/my-bets" routerLinkActive="active" class="sidebar__link">
            <span class="material-symbols-rounded">receipt_long</span>
            My Tracker
          </a>
        </div>
      </nav>
      
      <div class="sidebar__footer">
        <div class="sidebar__profile">
          <div class="avatar">
            <span class="material-symbols-rounded">person</span>
          </div>
          <div class="profile-info">
            <span class="profile-name">User Account</span>
            <span class="profile-role">Pro Analyst</span>
          </div>
        </div>
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
      background: rgba(10, 10, 10, 0.95);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      z-index: 100;
      backdrop-filter: blur(20px);
    }

    .sidebar__brand {
      height: 72px;
      display: flex;
      align-items: center;
      padding: 0 var(--spacing-lg);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .sidebar__logo-link {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }

    .sidebar__logo-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #008200, #006a00);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 130, 0, 0.2);
    }

    .sidebar__title {
      font-size: 1.25rem;
      font-weight: 800;
      color: white;
      letter-spacing: -0.02em;
    }

    .sidebar__title-accent {
      background: linear-gradient(135deg, #00a82d, #00ff4d);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-style: italic;
    }

    .sidebar__nav {
      flex: 1;
      padding: var(--spacing-lg) var(--spacing-md);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nav-section-title {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--color-text-muted);
      letter-spacing: 0.1em;
      padding: 0 var(--spacing-sm) 8px;
    }

    .sidebar__link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      color: var(--color-text-secondary);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }

    .sidebar__link:hover {
      background: rgba(255, 255, 255, 0.05);
      color: white;
    }

    .sidebar__link.active {
      background: var(--color-accent-subtle);
      color: var(--color-accent);
    }

    .sidebar__link .material-symbols-rounded {
      font-size: 20px;
      opacity: 0.8;
      transition: transform 0.2s ease;
    }
    
    .sidebar__link.active .material-symbols-rounded {
      opacity: 1;
      color: var(--color-accent);
    }
    
    .sidebar__link:hover .material-symbols-rounded {
      transform: translateX(2px);
    }

    .sidebar__footer {
      padding: var(--spacing-lg);
      border-top: 1px solid rgba(255,255,255,0.05);
      background: rgba(0,0,0,0.2);
    }

    .sidebar__profile {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-surface-elevated);
      border: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary);
    }

    .profile-info {
      display: flex;
      flex-direction: column;
    }

    .profile-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: white;
    }

    .profile-role {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }
    
    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
      }
    }
  `]
})
export class SidebarComponent {}
