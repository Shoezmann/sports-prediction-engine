import { Component, signal, OnInit, inject } from '@angular/core';
import { StatCardComponent } from '../../components/stat-card/stat-card.component';
import { AccuracyChartComponent } from '../../components/accuracy-chart/accuracy-chart.component';
import { ApiService, AccuracyData } from '../../services/api.service';

@Component({
  selector: 'sp-dashboard-page',
  standalone: true,
  imports: [StatCardComponent, AccuracyChartComponent],
  template: `
    <div class="page">
      <!-- Hero -->
      <section class="hero animate-in">
        <div class="hero__content">
          <h1 class="hero__title">
            Sports Prediction <span class="hero__title-accent">Engine</span>
          </h1>
          <p class="hero__subtitle">
            Multi-sport prediction platform powered by ELO ratings, form analysis, and market odds ensemble models.
          </p>
          <div class="hero__actions">
            <button class="btn btn-primary" (click)="runFullPipeline()" [disabled]="isRunning()">
              <span class="material-symbols-rounded">bolt</span>
              {{ isRunning() ? 'Running...' : 'Run Full Pipeline' }}
            </button>
            <button class="btn btn-secondary" (click)="syncSports()" [disabled]="isRunning()">
              <span class="material-symbols-rounded">sync</span>
              Sync Sports
            </button>
            <button class="btn btn-secondary" (click)="updateResults()" [disabled]="isRunning()">
              <span class="material-symbols-rounded">update</span>
              Update Results
            </button>
          </div>
        </div>
      </section>

      <!-- Status Toast -->
      @if (statusMessage()) {
        <div class="toast animate-in" [class.toast--success]="!statusError()" [class.toast--error]="statusError()">
          <span class="material-symbols-rounded">{{ statusError() ? 'error_outline' : 'check_circle' }}</span>
          <span>{{ statusMessage() }}</span>
        </div>
      }

      <!-- Stats Grid -->
      <section class="stats animate-in" style="animation-delay: 100ms">
        <sp-stat-card
          label="Resolved"
          [value]="accuracy()?.totalPredictions?.toString() ?? '-'"
          subtitle="All time"
        />
        <sp-stat-card
          label="Pending"
          [value]="accuracy()?.pendingPredictions?.toString() ?? '-'"
          subtitle="Games not yet played"
        />
        <sp-stat-card
          label="Accuracy"
          [value]="accuracy() ? (accuracy()!.accuracy * 100).toFixed(1) + '%' : '-'"
          subtitle="Overall hit rate"
        />
        <sp-stat-card
          label="Last 7 Days"
          [value]="accuracy() ? (accuracy()!.last7Days * 100).toFixed(1) + '%' : '-'"
          subtitle="Recent performance"
        />
        <sp-stat-card
          label="Last 30 Days"
          [value]="accuracy() ? (accuracy()!.last30Days * 100).toFixed(1) + '%' : '-'"
          subtitle="Monthly window"
        />
      </section>

      <!-- Chart -->
      <section class="card animate-in" style="animation-delay: 200ms">
        <sp-accuracy-chart [data]="accuracy()" />
      </section>

      <!-- Pipeline Log -->
      @if (log().length > 0) {
        <section class="card animate-in" style="animation-delay: 300ms">
          <div class="log">
            <div class="log__header">
              <h3 class="log__title">
                <span class="material-symbols-rounded">terminal</span>
                Pipeline Log
              </h3>
              <button class="btn-ghost" (click)="log.set([])">
                <span class="material-symbols-rounded">delete_sweep</span>
              </button>
            </div>
            <div class="log__entries">
              @for (entry of log(); track $index) {
                <div class="log__entry">
                  <span class="log__time">{{ entry.time }}</span>
                  <span class="log__message">{{ entry.message }}</span>
                </div>
              }
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px;
      position: relative;
      z-index: 1;
    }

    // Hero
    .hero {
      margin-bottom: 32px;
    }

    .hero__title {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.03em;
      color: var(--color-text-primary);
      margin-bottom: 8px;
    }

    .hero__title-accent {
      background: var(--gradient-neon);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-style: italic;
    }

    .hero__subtitle {
      font-size: 1rem;
      color: var(--color-text-secondary);
      max-width: 520px;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    .hero__actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .hero__actions .btn {
      .material-symbols-rounded {
        font-size: 18px;
      }
    }

    // Toast
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 24px;
      border: 1px solid;

      .material-symbols-rounded {
        font-size: 18px;
      }

      &--success {
        background: var(--color-success-bg);
        color: var(--color-success);
        border-color: var(--color-success-border);
      }

      &--error {
        background: var(--color-danger-bg);
        color: var(--color-danger);
        border-color: var(--color-danger-border);
      }
    }

    // Stats
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    // Card wrapper
    .card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 24px;
      backdrop-filter: var(--blur-sm);
      margin-bottom: 24px;
      transition: all var(--transition-base);
    }

    // Log
    .log__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .log__title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-secondary);

      .material-symbols-rounded {
        font-size: 18px;
        opacity: 0.7;
      }
    }

    .btn-ghost {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      cursor: pointer;
      border-radius: var(--radius-xs);
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-danger-bg);
        color: var(--color-danger);
      }

      .material-symbols-rounded {
        font-size: 18px;
      }
    }

    .log__entries {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 180px;
      overflow-y: auto;
    }

    .log__entry {
      display: flex;
      gap: 12px;
      font-size: 0.8125rem;
      font-family: var(--font-mono);
      padding: 6px 0;
      border-bottom: 1px solid var(--color-border-subtle);

      &:last-child {
        border-bottom: none;
      }
    }

    .log__time {
      color: var(--color-text-muted);
      flex-shrink: 0;
      font-size: 0.75rem;
    }

    .log__message {
      color: var(--color-text-secondary);
    }

    // Responsive
    @media (max-width: 768px) {
      .page {
        padding: 24px 16px;
      }

      .hero__title {
        font-size: 1.75rem;
      }

      .hero__subtitle {
        font-size: 0.875rem;
      }

      .hero__actions {
        flex-direction: column;
      }

      .hero__actions .btn {
        width: 100%;
        justify-content: center;
      }

      .stats {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .hero__title {
        font-size: 1.5rem;
      }

      .stats {
        grid-template-columns: 1fr;
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

  private api = inject(ApiService);


  ngOnInit() {
    this.loadAccuracy();
  }

  loadAccuracy() {
    this.api.getAccuracy().subscribe({
      next: (data) => this.accuracy.set(data),
      error: () => this.showStatus('Failed to load accuracy', true),
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
      error: () => {
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
      this.addLog('Step 1/4: Syncing sports...');
      const sports = await this.promisify(this.api.syncSports());
      this.addLog(`Found ${sports.total} sports (${sports.active} active)`);

      this.addLog('Step 2/4: Syncing upcoming games...');
      const games = await this.promisify(this.api.syncGames());
      this.addLog(`Synced ${games.synced} new games across ${games.sports} sports`);

      this.addLog('Step 3/4: Generating predictions...');
      const predictions = await this.promisify(this.api.generatePredictions());
      this.addLog(`Generated ${predictions.generated} predictions (${predictions.skipped} skipped)`);

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
