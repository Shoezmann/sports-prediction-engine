import { Component, input, computed } from '@angular/core';
import type { AccuracyData } from '../../services/api.service';

@Component({
  selector: 'sp-accuracy-chart',
  standalone: true,
  templateUrl: './accuracy-chart.component.html',
  styleUrl: './accuracy-chart.component.scss'
})
export class AccuracyChartComponent {
  data = input<AccuracyData | null>(null);

  bars = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Ensemble', value: d.byModel.ensemble, color: 'var(--gradient-hero)' },
      { label: 'Poisson', value: d.byModel.poisson ?? 0, color: '#ef4444' },
      { label: 'Odds Implied', value: d.byModel.oddsImplied, color: '#3b82f6' },
      { label: 'ELO', value: d.byModel.elo, color: '#8b5cf6' },
      { label: 'Form', value: d.byModel.form, color: '#f59e0b' },
      { label: 'H2H', value: d.byModel.h2h ?? 0, color: '#06b6d4' },
      { label: 'ML', value: d.byModel.ml ?? 0, color: '#10b981' },
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
