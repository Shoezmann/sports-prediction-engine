import { Component, input } from '@angular/core';

@Component({
  selector: 'sp-stat-card',
  standalone: true,
  template: `
    <div class="stat-card" [class]="'stat-card stat-card--' + variant()">
      <div class="stat-card__header">
        <span class="stat-card__label">{{ label() }}</span>
        @if (trend()) {
          <span class="stat-card__trend" [class.stat-card__trend--up]="trend()! > 0" [class.stat-card__trend--down]="trend()! < 0">
            {{ trend()! > 0 ? '↑' : '↓' }} {{ Math.abs(trend()!) }}%
          </span>
        }
      </div>
      <div class="stat-card__value">{{ value() }}</div>
      @if (subtitle()) {
        <div class="stat-card__subtitle">{{ subtitle() }}</div>
      }
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      transition: all var(--transition-base);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--gradient-hero);
        opacity: 0;
        transition: opacity var(--transition-base);
      }

      &:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: var(--shadow-lg);

        &::before {
          opacity: 1;
        }
      }
    }

    .stat-card--accent::before {
      opacity: 1;
    }

    .stat-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-sm);
    }

    .stat-card__label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-card__trend {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-full);

      &--up {
        color: var(--color-success);
        background: var(--color-success-subtle);
      }

      &--down {
        color: var(--color-danger);
        background: var(--color-danger-subtle);
      }
    }

    .stat-card__value {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.1;
      background: linear-gradient(135deg, var(--color-text-primary), var(--color-text-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat-card__subtitle {
      margin-top: var(--spacing-xs);
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    @media (max-width: 480px) {
      .stat-card {
        padding: var(--spacing-md);
      }

      .stat-card__label {
        font-size: 0.6875rem;
      }

      .stat-card__value {
        font-size: 1.5rem;
      }

      .stat-card__subtitle {
        font-size: 0.6875rem;
      }

      .stat-card:hover {
        transform: none;
      }
    }
  `],
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<string>();
  subtitle = input<string>();
  trend = input<number>();
  variant = input<'default' | 'accent'>('default');

  protected readonly Math = Math;
}
