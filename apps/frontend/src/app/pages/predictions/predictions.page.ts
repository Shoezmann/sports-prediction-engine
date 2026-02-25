import { Component, signal, OnInit } from '@angular/core';
import { ApiService, AccuracyData } from '../../services/api.service';

@Component({
    selector: 'sp-predictions-page',
    standalone: true,
    template: `
    <div class="predictions-page">
      <header class="page-header animate-in">
        <div>
          <h1 class="page-title">Predictions</h1>
          <p class="page-subtitle">AI-powered predictions across {{ sportCount() }} sports</p>
        </div>
        <button class="generate-btn" (click)="generatePredictions()" [disabled]="isGenerating()">
          {{ isGenerating() ? 'Generating...' : '⚡ Generate Predictions' }}
        </button>
      </header>

      <!-- Accuracy Overview -->
      @if (accuracy()) {
        <section class="overview animate-in" style="animation-delay: 100ms">
          <div class="overview-card">
            <div class="overview-card__ring" [style.--progress]="accuracy()!.accuracy">
              <span class="overview-card__pct">{{ (accuracy()!.accuracy * 100).toFixed(1) }}%</span>
            </div>
            <div class="overview-card__info">
              <span class="overview-card__label">Overall Accuracy</span>
              <span class="overview-card__detail">
                {{ accuracy()!.correctPredictions }} / {{ accuracy()!.totalPredictions }} correct
              </span>
            </div>
          </div>

          <div class="model-grid">
            @for (model of models(); track model.name) {
              <div class="model-card">
                <span class="model-card__name">{{ model.name }}</span>
                <div class="model-card__bar">
                  <div class="model-card__fill" [style.width.%]="model.accuracy * 100" [style.background]="model.color"></div>
                </div>
                <span class="model-card__value">{{ (model.accuracy * 100).toFixed(1) }}%</span>
              </div>
            }
          </div>
        </section>
      }

      <!-- Empty State -->
      @if (!accuracy() || accuracy()!.totalPredictions === 0) {
        <div class="empty-state animate-in" style="animation-delay: 200ms">
          <div class="empty-state__icon">🎯</div>
          <h2 class="empty-state__title">No predictions yet</h2>
          <p class="empty-state__message">
            Run the full pipeline from the Dashboard to sync sports data, fetch upcoming games, and generate your first predictions.
          </p>
          <a href="/" class="empty-state__cta">← Go to Dashboard</a>
        </div>
      }

      <!-- Sport-by-Sport Breakdown -->
      @if (sportBreakdown().length > 0) {
        <section class="sports-grid animate-in" style="animation-delay: 200ms">
          <h2 class="section-title">By Sport</h2>
          <div class="sport-cards">
            @for (sport of sportBreakdown(); track sport.key) {
              <div class="sport-card">
                <div class="sport-card__header">
                  <span class="sport-card__key">{{ sport.key }}</span>
                  <span class="sport-card__accuracy" [class]="getAccuracyClass(sport.accuracy)">
                    {{ (sport.accuracy * 100).toFixed(1) }}%
                  </span>
                </div>
                <div class="sport-card__bar">
                  <div class="sport-card__fill" [style.width.%]="sport.accuracy * 100"></div>
                </div>
                <span class="sport-card__detail">{{ sport.correct }}/{{ sport.total }} correct</span>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
    styles: [`
    .predictions-page {
      max-width: 1280px;
      margin: 0 auto;
      padding: var(--spacing-xl);
      position: relative;
      z-index: 1;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-2xl);
    }

    .page-title {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .page-subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      margin-top: var(--spacing-xs);
    }

    .generate-btn {
      padding: 0.625rem 1.25rem;
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
      font-family: var(--font-family);
      font-size: 0.875rem;
      font-weight: 600;
      background: var(--gradient-hero);
      color: white;
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: var(--shadow-glow);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    // Overview
    .overview {
      display: flex;
      gap: var(--spacing-xl);
      margin-bottom: var(--spacing-2xl);
      flex-wrap: wrap;
    }

    .overview-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-lg);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg) var(--spacing-xl);
      flex: 0 0 auto;
    }

    .overview-card__ring {
      width: 80px;
      height: 80px;
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
        inset: 7px;
        border-radius: 50%;
        background: var(--color-bg-card);
      }
    }

    .overview-card__pct {
      position: relative;
      z-index: 1;
      font-size: 1rem;
      font-weight: 800;
    }

    .overview-card__info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .overview-card__label {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .overview-card__detail {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .model-grid {
      flex: 1;
      min-width: 300px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .model-card {
      display: grid;
      grid-template-columns: 100px 1fr 56px;
      align-items: center;
      gap: var(--spacing-md);
    }

    .model-card__name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }

    .model-card__bar {
      height: 6px;
      background: var(--color-bg-input);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .model-card__fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 1s ease-out;
    }

    .model-card__value {
      font-size: 0.8125rem;
      font-weight: 700;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    // Empty state
    .empty-state {
      text-align: center;
      padding: var(--spacing-3xl) var(--spacing-xl);
    }

    .empty-state__icon {
      font-size: 3rem;
      margin-bottom: var(--spacing-lg);
    }

    .empty-state__title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: var(--spacing-sm);
    }

    .empty-state__message {
      color: var(--color-text-secondary);
      max-width: 400px;
      margin: 0 auto var(--spacing-lg);
    }

    .empty-state__cta {
      color: var(--color-accent-hover);
      font-weight: 600;
    }

    // Sports grid
    .section-title {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: var(--spacing-lg);
    }

    .sport-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--spacing-md);
    }

    .sport-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      transition: all var(--transition-base);

      &:hover {
        transform: translateY(-1px);
        border-color: rgba(255, 255, 255, 0.1);
      }
    }

    .sport-card__header {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
    }

    .sport-card__key {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .sport-card__accuracy {
      font-size: 0.875rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;

      &.accuracy-high { color: var(--color-confidence-high); }
      &.accuracy-medium { color: var(--color-confidence-medium); }
      &.accuracy-low { color: var(--color-confidence-low); }
    }

    .sport-card__bar {
      height: 4px;
      background: var(--color-bg-input);
      border-radius: var(--radius-full);
      margin-bottom: var(--spacing-sm);
      overflow: hidden;
    }

    .sport-card__fill {
      height: 100%;
      background: var(--gradient-hero);
      border-radius: var(--radius-full);
      transition: width 1s ease-out;
    }

    .sport-card__detail {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: var(--spacing-md);
      }
      .overview { flex-direction: column; }
    }
  `],
})
export class PredictionsPage implements OnInit {
    accuracy = signal<AccuracyData | null>(null);
    isGenerating = signal(false);
    sportCount = signal(0);

    constructor(private api: ApiService) { }

    ngOnInit() {
        this.api.getAccuracy().subscribe({
            next: (data) => {
                this.accuracy.set(data);
                this.sportCount.set(Object.keys(data.bySport).length);
            },
        });
    }

    models() {
        const d = this.accuracy();
        if (!d) return [];
        return [
            { name: 'Ensemble', accuracy: d.byModel.ensemble, color: 'var(--gradient-hero)' },
            { name: 'Odds Implied', accuracy: d.byModel.oddsImplied, color: '#3b82f6' },
            { name: 'ELO', accuracy: d.byModel.elo, color: '#8b5cf6' },
            { name: 'Form', accuracy: d.byModel.form, color: '#f59e0b' },
        ];
    }

    sportBreakdown() {
        const d = this.accuracy();
        if (!d) return [];
        return Object.entries(d.bySport).map(([key, bucket]) => ({
            key,
            ...bucket,
        }));
    }

    getAccuracyClass(accuracy: number): string {
        if (accuracy >= 0.7) return 'accuracy-high';
        if (accuracy >= 0.55) return 'accuracy-medium';
        return 'accuracy-low';
    }

    generatePredictions() {
        this.isGenerating.set(true);
        this.api.generatePredictions().subscribe({
            next: () => {
                this.isGenerating.set(false);
                this.ngOnInit();
            },
            error: () => this.isGenerating.set(false),
        });
    }
}
