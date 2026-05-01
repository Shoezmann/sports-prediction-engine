import { Component, signal, OnInit, inject } from '@angular/core';
import { StatCardComponent } from '../../components/stat-card/stat-card.component';
import { AccuracyChartComponent } from '../../components/accuracy-chart/accuracy-chart.component';
import { ApiService, AccuracyData } from '../../services/api.service';

@Component({
  selector: 'sp-dashboard-page',
  standalone: true,
  imports: [StatCardComponent, AccuracyChartComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
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
    this.addLog('Syncing sports...');

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
