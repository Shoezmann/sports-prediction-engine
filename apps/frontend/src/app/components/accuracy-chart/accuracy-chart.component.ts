import { Component, input, computed } from '@angular/core';
import type { AccuracyData } from '../../services/api.service';

@Component({
    selector: 'sp-accuracy-chart',
    standalone: true,
    template: `
    <div class="chart">
      <h3 class="chart__title">Model Accuracy Breakdown</h3>
      <div class="chart__bars">
        @for (bar of bars(); track bar.label) {
          <div class="chart__bar-row">
            <div class="chart__bar-label">{{ bar.label }}</div>
            <div class="chart__bar-track">
              <div
                class="chart__bar-fill"
                [style.width.%]="bar.value * 100"
                [style.background]="bar.color"
              >
              </div>
            </div>
            <div class="chart__bar-value">{{ (bar.value * 100).toFixed(1) }}%</div>
          </div>
        }
      </div>

      <div class="chart__confidence">
        <h4 class="chart__subtitle">By Confidence Level</h4>
        <div class="chart__confidence-grid">
          @for (bucket of confidenceBuckets(); track bucket.label) {
            <div class="chart__bucket">
              <div class="chart__bucket-ring" [style.--progress]="bucket.accuracy">
                <span class="chart__bucket-pct">{{ (bucket.accuracy * 100).toFixed(0) }}%</span>
              </div>
              <span class="chart__bucket-label" [style.color]="bucket.color">{{ bucket.label }}</span>
              <span class="chart__bucket-count">{{ bucket.total }} predictions</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
    styles: [`
    .chart {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-xl);
    }

    .chart__title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: var(--spacing-lg);
    }

    .chart__bars {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .chart__bar-row {
      display: grid;
      grid-template-columns: 100px 1fr 60px;
      align-items: center;
      gap: var(--spacing-md);
    }

    .chart__bar-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }

    .chart__bar-track {
      height: 8px;
      background: var(--color-bg-input);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .chart__bar-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 4px;
    }

    .chart__bar-value {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--color-text-primary);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .chart__confidence {
      margin-top: var(--spacing-xl);
      padding-top: var(--spacing-xl);
      border-top: 1px solid var(--color-border);
    }

    .chart__subtitle {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-lg);
    }

    .chart__confidence-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-lg);
    }

    .chart__bucket {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .chart__bucket-ring {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: conic-gradient(
        var(--color-accent) calc(var(--progress) * 360deg),
        var(--color-bg-input) calc(var(--progress) * 360deg)
      );
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        inset: 6px;
        border-radius: 50%;
        background: var(--color-bg-card);
      }
    }

    .chart__bucket-pct {
      position: relative;
      z-index: 1;
      font-size: 0.875rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .chart__bucket-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .chart__bucket-count {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }
  `],
})
export class AccuracyChartComponent {
    data = input<AccuracyData | null>(null);

    bars = computed(() => {
        const d = this.data();
        if (!d) return [];
        return [
            { label: 'Ensemble', value: d.byModel.ensemble, color: 'var(--gradient-hero)' },
            { label: 'Odds Implied', value: d.byModel.oddsImplied, color: '#3b82f6' },
            { label: 'ELO Model', value: d.byModel.elo, color: '#8b5cf6' },
            { label: 'Form Model', value: d.byModel.form, color: '#f59e0b' },
        ];
    });

    confidenceBuckets = computed(() => {
        const d = this.data();
        if (!d) return [];
        return [
            { label: 'High', ...d.byConfidenceLevel.high, color: 'var(--color-confidence-high)' },
            { label: 'Medium', ...d.byConfidenceLevel.medium, color: 'var(--color-confidence-medium)' },
            { label: 'Low', ...d.byConfidenceLevel.low, color: 'var(--color-confidence-low)' },
        ];
    });
}
