import { Component, signal, OnInit } from '@angular/core';
import { StatCardComponent } from '../../components/stat-card/stat-card.component';
import { AccuracyChartComponent } from '../../components/accuracy-chart/accuracy-chart.component';
import { ApiService, AccuracyData, SyncResult, PredictionResult, ResultsUpdate } from '../../services/api.service';

@Component({
  selector: 'sp-dashboard-page',
  standalone: true,
  imports: [StatCardComponent, AccuracyChartComponent],
  template: `
    <div class="dashboard">
      <!-- Hero Section -->
      <section class="hero animate-in">
        <div class="hero__content">
          <h1 class="hero__title">
            Sports Prediction
            <span class="hero__title-gradient">Engine</span>
          </h1>
          <p class="hero__subtitle">
            Multi-sport prediction platform powered by ELO ratings, form analysis, and market odds ensemble models.
          </p>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="actions animate-in" style="animation-delay: 100ms">
        <button class="action-btn" (click)="runFullPipeline()" [disabled]="isRunning()">
          <span class="action-btn__icon material-symbols-rounded">bolt</span>
          <span class="action-btn__text">
            {{ isRunning() ? 'Running...' : 'Run Full Pipeline' }}
          </span>
        </button>
        <button class="action-btn action-btn--outline" (click)="syncSports()" [disabled]="isRunning()">
          <span class="action-btn__icon material-symbols-rounded">sync</span>
          <span class="action-btn__text">Sync Sports</span>
        </button>
        <button class="action-btn action-btn--outline" (click)="updateResults()" [disabled]="isRunning()">
          <span class="action-btn__icon material-symbols-rounded">analytics</span>
          <span class="action-btn__text">Update Results</span>
        </button>
      </section>

      <!-- Status Toast -->
      @if (statusMessage()) {
        <div class="toast animate-in" [class.toast--success]="!statusError()" [class.toast--error]="statusError()">
          {{ statusMessage() }}
        </div>
      }

      <!-- Stats Grid -->
      <section class="stats animate-in" style="animation-delay: 200ms">
        <sp-stat-card
          label="Resolved Predictions"
          [value]="accuracy()?.totalPredictions?.toString() ?? '—'"
          subtitle="All time"
          variant="default"
        />
        <sp-stat-card
          label="Pending Predictions"
          [value]="accuracy()?.pendingPredictions?.toString() ?? '—'"
          subtitle="Games not yet played"
          variant="accent"
        />
        <sp-stat-card
          label="Accuracy"
          [value]="accuracy() ? (accuracy()!.accuracy * 100).toFixed(1) + '%' : '—'"
          subtitle="Overall hit rate"
        />
        <sp-stat-card
          label="Last 7 Days"
          [value]="accuracy() ? (accuracy()!.last7Days * 100).toFixed(1) + '%' : '—'"
          subtitle="Recent performance"
        />
        <sp-stat-card
          label="Last 30 Days"
          [value]="accuracy() ? (accuracy()!.last30Days * 100).toFixed(1) + '%' : '—'"
          subtitle="Monthly window"
        />
      </section>

      <!-- Accuracy Chart -->
      <section class="chart-section animate-in" style="animation-delay: 300ms">
        <sp-accuracy-chart [data]="accuracy()" />
      </section>

      <!-- Pipeline Log -->
      @if (log().length > 0) {
        <section class="log animate-in">
          <h3 class="log__title">Pipeline Log</h3>
          <div class="log__entries">
            @for (entry of log(); track $index) {
              <div class="log__entry">
                <span class="log__time">{{ entry.time }}</span>
                <span class="log__message">{{ entry.message }}</span>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1280px;
      margin: 0 auto;
      padding: var(--spacing-xl);
      position: relative;
      z-index: 1;
    }

    // Hero
    .hero {
      position: relative;
      padding: var(--spacing-3xl) 0;
      overflow: hidden;
    }

    .hero__content {
      position: relative;
      z-index: 1;
    }

    .hero__title {
      font-size: 3rem;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.04em;
    }

    .hero__title-gradient {
      display: block;
      background: var(--gradient-neon);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero__subtitle {
      margin-top: var(--spacing-md);
      font-size: 1.125rem;
      color: var(--color-text-secondary);
      max-width: 560px;
      line-height: 1.6;
    }
    // Actions
    .actions {
      display: flex;
      gap: var(--spacing-md);
      flex-wrap: wrap;
      margin-bottom: var(--spacing-xl);
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: 0.625rem 1.25rem;
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
      font-family: var(--font-family);
      font-size: 0.875rem;
      font-weight: 600;
      transition: all var(--transition-fast);
      background: var(--gradient-hero);
      color: white;
      min-height: 44px; // Touch target

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: var(--shadow-glow);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &--outline {
        background: transparent;
        border: 1px solid var(--color-border);
        color: var(--color-text-secondary);

        &:hover:not(:disabled) {
          border-color: var(--color-accent);
          color: var(--color-accent-hover);
          box-shadow: none;
          background: var(--color-accent-subtle);
        }
      }
    }

    // Toast
    .toast {
      padding: 0.75rem 1.25rem;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: var(--spacing-xl);

      &--success {
        background: var(--color-success-subtle);
        color: var(--color-success);
        border: 1px solid rgba(34, 197, 94, 0.15);
      }

      &--error {
        background: var(--color-danger-subtle);
        color: var(--color-danger);
        border: 1px solid rgba(239, 68, 68, 0.15);
      }
    }

    // Stats
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    // Chart
    .chart-section {
      margin-bottom: var(--spacing-xl);
    }

    // Log
    .log {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
    }

    .log__title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-md);
    }

    .log__entries {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      max-height: 200px;
      overflow-y: auto;
    }

    .log__entry {
      display: flex;
      gap: var(--spacing-md);
      font-size: 0.8125rem;
      font-family: var(--font-mono);
    }

    .log__time {
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .log__message {
      color: var(--color-text-secondary);
    }

    // ─── Tablet ─────────────────────────────────────────────
    @media (max-width: 768px) {
      .dashboard {
        padding: var(--spacing-md);
      }

      .hero {
        padding: var(--spacing-xl) 0;
      }

      .hero__title {
        font-size: 2rem;
      }

      .hero__subtitle {
        font-size: 1rem;
      }
      .stats {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    // ─── Mobile ─────────────────────────────────────────────
    @media (max-width: 480px) {
      .dashboard {
        padding: var(--spacing-sm);
      }

      .hero {
        padding: var(--spacing-lg) 0;
      }

      .hero__title {
        font-size: 1.625rem;
      }

      .hero__subtitle {
        font-size: 0.875rem;
        margin-top: var(--spacing-sm);
      }

      .actions {
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .action-btn {
        width: 100%;
        justify-content: center;
        padding: 0.75rem 1rem;
      }

      .stats {
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-sm);
      }

      .log {
        padding: var(--spacing-md);
      }

      .log__entry {
        flex-direction: column;
        gap: 2px;
        font-size: 0.75rem;
      }

      .log__time {
        font-size: 0.6875rem;
      }
    }
  `],
})
export class DashboardPage implements OnInit {
  accuracy = signal<AccuracyData | null>(null);
  isRunning = signal(false);
  statusMessage = signal('');
  statusError = signal(false);
  log = signal<{ time: string; message: string }[]>([]);

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.loadAccuracy();
  }

  loadAccuracy() {
    this.api.getAccuracy().subscribe({
      next: (data) => this.accuracy.set(data),
      error: () => { },
    });
  }

  syncSports() {
    this.isRunning.set(true);
    this.addLog('Syncing sports from The Odds API...');

    this.api.syncSports().subscribe({
      next: (r) => {
        this.addLog(`Found ${r.total} sports (${r.active} active, ${r.new} new)`);
        this.showStatus(`Sports synced: ${r.total} total, ${r.active} active`);
        this.isRunning.set(false);
      },
      error: (e) => {
        this.showStatus('Failed to sync sports. Is the API key set?', true);
        this.isRunning.set(false);
      },
    });
  }

  updateResults() {
    this.isRunning.set(true);
    this.addLog('Fetching game results...');

    this.api.updateResults().subscribe({
      next: (r) => {
        this.addLog(`Updated ${r.updated} games, ${r.predictionsResolved} predictions resolved, ${r.eloUpdated} ELO updates`);
        this.showStatus(`Results updated: ${r.predictionsResolved} predictions resolved`);
        this.loadAccuracy();
        this.isRunning.set(false);
      },
      error: () => {
        this.showStatus('Failed to update results', true);
        this.isRunning.set(false);
      },
    });
  }

  async runFullPipeline() {
    this.isRunning.set(true);
    this.log.set([]);

    try {
      // Step 1: Sync sports
      this.addLog('Step 1/4: Syncing sports...');
      const sports = await this.promisify(this.api.syncSports());
      this.addLog(`Found ${sports.total} sports (${sports.active} active)`);

      // Step 2: Sync games
      this.addLog('Step 2/4: Syncing upcoming games...');
      const games = await this.promisify(this.api.syncGames());
      this.addLog(`Synced ${games.synced} new games across ${games.sports} sports`);

      // Step 3: Generate predictions
      this.addLog('Step 3/4: Generating predictions...');
      const predictions = await this.promisify(this.api.generatePredictions());
      this.addLog(`Generated ${predictions.generated} predictions (${predictions.skipped} skipped)`);

      // Step 4: Update results
      this.addLog('Step 4/4: Updating results...');
      const results = await this.promisify(this.api.updateResults());
      this.addLog(`Resolved ${results.predictionsResolved} predictions, updated ${results.eloUpdated} ELO ratings`);

      this.addLog('✅ Full pipeline complete');
      this.showStatus('Pipeline complete. Dashboard updated.');
      this.loadAccuracy();
    } catch (e) {
      this.addLog('❌ Pipeline failed');
      this.showStatus('Pipeline failed. Check API key and connectivity.', true);
    } finally {
      this.isRunning.set(false);
    }
  }

  private promisify<T>(obs: import('rxjs').Observable<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      obs.subscribe({ next: resolve, error: reject });
    });
  }

  private addLog(message: string) {
    const time = new Date().toLocaleTimeString();
    this.log.update((prev) => [...prev, { time, message }]);
  }

  private showStatus(message: string, isError = false) {
    this.statusMessage.set(message);
    this.statusError.set(isError);
    setTimeout(() => this.statusMessage.set(''), 5000);
  }
}
