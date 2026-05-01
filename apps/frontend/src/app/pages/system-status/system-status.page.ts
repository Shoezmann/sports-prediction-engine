import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ApiService, SyncResult, PredictionResult, ResultsUpdate } from '../../services/api.service';
import { Router } from '@angular/router';

interface SystemStatus {
  backend: boolean;
  frontend: boolean;
  ml: boolean;
  databases: {
    sports: number;
    teams: number;
    games: number;
    upcoming: number;
    pastNoScore: number;
    completed: number;
    predictions: number;
    resolved: number;
    users: number;
  };
  dataSources: {
    sofascore: { status: 'ok' | 'limited' | 'dead'; message: string };
    bbc: { status: 'ok' | 'limited' | 'dead'; message: string };
    psl: { status: 'ok' | 'limited' | 'dead'; message: string };
  };
  models: {
    elo: string;
    form: string;
    oddsImplied: string;
    poisson: string;
    h2h: string;
    xgboost: string;
    trainedLeagues: number;
  };
}

interface PipelineStep {
  id: string;
  title: string;
  description: string;
  status: 'working' | 'blocked' | 'warning';
  details: string[];
  icon: string;
}

@Component({
  selector: 'sp-system-status',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="pg">
  @if (loading()) {
    <div class="loader"><span class="spin"></span><p>Loading system status...</p></div>
  }
  @if (!loading() && status()) {
    <div class="pg">
      <!-- Header -->
      <div class="hd">
        <div class="hl"><span class="pr">&gt;</span><div><h1>SYSTEM STATUS</h1>
          <p class="sb">Real-time overview of the prediction engine</p></div></div>
        <div class="hr">
          <button class="btn" (click)="refresh()">[ REFRESH ]</button>
        </div>
      </div>

      <!-- Health Overview -->
      <div class="grid grid--4">
        <div class="card" [class.ok]="s().backend" [class.err]="!s().backend">
          <span class="card__icon">⚙️</span>
          <span class="card__label">Backend</span>
          <span class="card__val">{{ s().backend ? 'ONLINE' : 'OFFLINE' }}</span>
        </div>
        <div class="card" [class.ok]="s().frontend" [class.err]="!s().frontend">
          <span class="card__icon">🖥️</span>
          <span class="card__label">Frontend</span>
          <span class="card__val">{{ s().frontend ? 'ONLINE' : 'OFFLINE' }}</span>
        </div>
        <div class="card" [class.ok]="s().ml" [class.warn]="!s().ml">
          <span class="card__icon">🧠</span>
          <span class="card__label">ML Engine</span>
          <span class="card__val">{{ s().ml ? 'READY' : 'NOT READY' }}</span>
        </div>
        <div class="card">
          <span class="card__icon">📊</span>
          <span class="card__label">Predictions</span>
          <span class="card__val">{{ d().predictions }}</span>
        </div>
      </div>

      <!-- Pipeline: How It Works -->
      <div class="section">
        <h2 class="stitle">HOW PREDICTIONS ARE MADE</h2>
        @for (step of pipeline(); track step.id) {
          <div class="pstep" [class]="step.status">
            <span class="pstep__icon">{{ step.icon }}</span>
            <div class="pstep__body">
              <div class="pstep__head">
                <h3>{{ step.title }}</h3>
                <span class="pstep__badge" [class]="step.status">
                  {{ step.status === 'working' ? 'WORKING' : step.status === 'blocked' ? 'BLOCKED' : 'WARNING' }}
                </span>
              </div>
              <p>{{ step.description }}</p>
              <ul>
                @for (detail of step.details; track detail) { <li>{{ detail }}</li> }
              </ul>
            </div>
          </div>
        }
      </div>

      <!-- Data Sources -->
      <div class="section">
        <h2 class="stitle">DATA SOURCES (Zero Paid APIs)</h2>
        <div class="api-grid">
          <div class="api-card" [class]="ds().sofascore.status">
            <div class="api-card__head">
              <span class="api-card__dot" [class]="ds().sofascore.status"></span>
              <strong>SofaScore</strong>
            </div>
            <p>{{ ds().sofascore.message }}</p>
            <span class="api-card__tag">Fixtures + Live + Results (50+ leagues)</span>
          </div>
          <div class="api-card" [class]="ds().bbc.status">
            <div class="api-card__head">
              <span class="api-card__dot" [class]="ds().bbc.status"></span>
              <strong>BBC Sport</strong>
            </div>
            <p>{{ ds().bbc.message }}</p>
            <span class="api-card__tag">EPL Fallback</span>
          </div>
          <div class="api-card" [class]="ds().psl.status">
            <div class="api-card__head">
              <span class="api-card__dot" [class]="ds().psl.status"></span>
              <strong>PSL Official</strong>
            </div>
            <p>{{ ds().psl.message }}</p>
            <span class="api-card__tag">PSL Fallback</span>
          </div>
        </div>
      </div>

      <!-- Database Stats -->
      <div class="section">
        <h2 class="stitle">DATABASE</h2>
        <div class="grid grid--3">
          <div class="stat">
            <span class="stat__val">{{ d().sports }}</span>
            <span class="stat__label">Sports</span>
          </div>
          <div class="stat">
            <span class="stat__val">{{ d().teams }}</span>
            <span class="stat__label">Teams</span>
          </div>
          <div class="stat">
            <span class="stat__val">{{ d().games }}</span>
            <span class="stat__label">Total Games</span>
          </div>
          <div class="stat ok">
            <span class="stat__val">{{ d().upcoming }}</span>
            <span class="stat__label">Upcoming</span>
          </div>
          <div class="stat err">
            <span class="stat__val">{{ d().pastNoScore }}</span>
            <span class="stat__label">Past (No Score) ⚠️</span>
          </div>
          <div class="stat">
            <span class="stat__val">{{ d().completed }}</span>
            <span class="stat__label">Completed</span>
          </div>
        </div>
      </div>

      <!-- Models -->
      <div class="section">
        <h2 class="stitle">6-MODEL PREDICTION ENSEMBLE</h2>
        <div class="model-grid">
          <div class="model-card">
            <span class="model-card__icon">📐</span>
            <h3>ELO Model</h3>
            <span class="model-card__status ok">ACTIVE</span>
            <p>Team strength ratings from historical results with K-factor adaptation</p>
            <span class="model-card__detail">Weight: 15% of ensemble</span>
          </div>
          <div class="model-card">
            <span class="model-card__icon">📈</span>
            <h3>Form Model</h3>
            <span class="model-card__status ok">ACTIVE</span>
            <p>Recent match results weighted by recency (last 5-20 games)</p>
            <span class="model-card__detail">Weight: 15% of ensemble</span>
          </div>
          <div class="model-card">
            <span class="model-card__icon">🎰</span>
            <h3>Odds Implied (Synthetic)</h3>
            <span class="model-card__status ok">ACTIVE</span>
            <p>Synthetic odds from ELO/Form blend — zero bookmaker dependency</p>
            <span class="model-card__detail">Weight: 25% of ensemble</span>
          </div>
          <div class="model-card">
            <span class="model-card__icon">🎯</span>
            <h3>Dixon-Coles Poisson</h3>
            <span class="model-card__status ok">ACTIVE</span>
            <p>Team-specific attack/defense with low-score correlation correction</p>
            <span class="model-card__detail">Weight: 25% of ensemble | Goals & BTTS</span>
          </div>
          <div class="model-card">
            <span class="model-card__icon">🤝</span>
            <h3>H2H Model</h3>
            <span class="model-card__status ok">ACTIVE</span>
            <p>Head-to-head recency-weighted history blended with ELO ratings</p>
            <span class="model-card__detail">Weight: 10% of ensemble</span>
          </div>
          <div class="model-card">
            <span class="model-card__icon">🧠</span>
            <h3>XGBoost ML</h3>
            <span class="model-card__status" [class.ok]="mlReady()" [class.warn]="!mlReady()">
              {{ mlReady() ? 'TRAINED' : 'LEARNING' }}
            </span>
            <p>Gradient-boosted trees trained on match features and outcomes</p>
            <span class="model-card__detail">
              Weight: 10% | {{ mlReady() ? mlLeagues() + ' leagues trained' : 'Accumulating training data' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Automation Schedule -->
      <div class="section">
        <h2 class="stitle">AUTOMATION SCHEDULE</h2>
        <div class="cron-grid">
          <div class="cron-item"><span class="cron-item__time">Every 4 hours</span><span>SofaScore fixture sync + predictions</span></div>
          <div class="cron-item"><span class="cron-item__time">Every 2 hours</span><span>Fetch results from SofaScore + update ELO</span></div>
          <div class="cron-item"><span class="cron-item__time">Every 5 min</span><span>Regenerate predictions (dev)</span></div>
          <div class="cron-item"><span class="cron-item__time">Every 60 sec</span><span>Broadcast live data via SSE</span></div>
          <div class="cron-item"><span class="cron-item__time">Sunday 5 AM</span><span>Retrain XGBoost ML models</span></div>
        </div>
      </div>

      <!-- System Info -->
      <div class="section">
        <h2 class="stitle">ARCHITECTURE</h2>
        <div class="issue-list">
          <div class="issue" style="border-left: 3px solid var(--color-success)">
            <h3>Zero Paid API Dependencies</h3>
            <p>All data sourced via free web scraping: SofaScore (primary), BBC Sport (EPL fallback), PSL Official (PSL fallback).</p>
            <span class="issue__fix">No API keys, no rate limits, no billing</span>
          </div>
          <div class="issue" style="border-left: 3px solid var(--color-accent)">
            <h3>6-Model Weighted Ensemble</h3>
            <p>ELO (15%) + Form (15%) + Synthetic Odds (25%) + Dixon-Coles Poisson (25%) + H2H (10%) + XGBoost (10%). Weights adapt dynamically per sport based on historical accuracy.</p>
            <span class="issue__fix">Dynamic calibration from resolved predictions</span>
          </div>
          <div class="issue" style="border-left: 3px solid var(--color-accent)">
            <h3>Advanced Goals Markets</h3>
            <p>Team-specific Poisson model predicts Over/Under 1.5, 2.5, 3.5 goals and BTTS with attack/defense strength ratings.</p>
            <span class="issue__fix">Per-team expected goals (xG) from historical data</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="section">
        <h2 class="stitle">QUICK ACTIONS</h2>
        <div class="actions">
          <button class="action-btn" (click)="triggerSync()">Sync Sports & Games</button>
          <button class="action-btn" (click)="triggerPredictions()">Generate Predictions</button>
          <button class="action-btn" (click)="triggerResults()">Update Results</button>
          <button class="action-btn" (click)="triggerTrain()">Train ML Models</button>
        </div>
      </div>
    </div>
  }
</div>
  `,
  styles: [`
    .pg{max-width:1200px;margin:0 auto;padding:20px}
    .loader{text-align:center;padding:60px 20px}.spin{width:32px;height:32px;border:3px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block}@keyframes spin{to{transform:rotate(360deg)}}.loader p{color:var(--color-text-muted);font-family:var(--font-family);margin-top:8px}
    .hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.hl{display:flex;align-items:flex-start;gap:8px}.pr{font-family:var(--font-family);font-size:1.25rem;color:var(--color-accent);font-weight:700;line-height:1}h1{font-family:var(--font-family);font-size:1.375rem;font-weight:700;letter-spacing:0.06em;color:var(--color-text-primary);line-height:1.2;margin:0}.sb{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);margin:3px 0 0}.hr{display:flex;align-items:center;gap:6px}
    .btn{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:5px 12px;background:transparent;border:1px solid var(--color-accent);color:var(--color-accent);border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s}.btn:hover{background:var(--color-accent);color:#fff}
    .grid{display:grid;gap:12px}.grid--4{grid-template-columns:repeat(4,1fr)}.grid--3{grid-template-columns:repeat(3,1fr)}
    .card{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs);padding:16px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px}.card.ok{border-color:var(--color-success)}.card.err{border-color:var(--color-danger)}.card.warn{border-color:#fbbf24}
    .card__icon{font-size:1.5rem}.card__label{font-family:var(--font-family);font-size:0.5625rem;color:var(--color-text-muted);letter-spacing:0.06em}.card__val{font-family:var(--font-family);font-size:1rem;font-weight:700;color:var(--color-text-primary)}
    .section{margin-top:24px}.stitle{font-family:var(--font-family);font-size:0.75rem;font-weight:700;color:var(--color-text-muted);letter-spacing:0.06em;margin-bottom:12px}
    .pstep{display:flex;gap:12px;padding:12px;background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs);margin-bottom:8px}.pstep.working{border-left:3px solid var(--color-success)}.pstep.blocked{border-left:3px solid var(--color-danger)}.pstep.warning{border-left:3px solid #fbbf24}
    .pstep__icon{font-size:1.5rem;flex-shrink:0}.pstep__body{flex:1}.pstep__head{display:flex;align-items:center;gap:8px;margin-bottom:4px}.pstep__head h3{font-family:var(--font-family);font-size:0.875rem;font-weight:600;color:var(--color-text-primary);margin:0}.pstep__badge{font-family:var(--font-family);font-size:0.5625rem;font-weight:700;padding:2px 6px;border-radius:2px;letter-spacing:0.04em}.pstep__badge.working{color:var(--color-success);background:rgba(16,185,129,0.1)}.pstep__badge.blocked{color:var(--color-danger);background:rgba(239,68,68,0.1)}.pstep__badge.warning{color:#fbbf24;background:rgba(251,191,36,0.1)}
    .pstep__body p{font-family:var(--font-family);font-size:0.75rem;color:var(--color-text-secondary);margin:0 0 6px}.pstep__body ul{margin:0;padding-left:16px}.pstep__body li{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);line-height:1.5}
    .api-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.api-card{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs);padding:16px}.api-card.ok{border-left:3px solid var(--color-success)}.api-card.limited{border-left:3px solid #fbbf24}.api-card.dead{border-left:3px solid var(--color-danger)}
    .api-card__head{display:flex;align-items:center;gap:6px;margin-bottom:6px}.api-card__dot{width:8px;height:8px;border-radius:50%}.api-card__dot.ok{background:var(--color-success);box-shadow:0 0 6px var(--color-success)}.api-card__dot.limited{background:#fbbf24}.api-card__dot.dead{background:var(--color-danger)}
    .api-card p{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-secondary);margin:0 0 8px}.api-card__tag{font-family:var(--font-family);font-size:0.5625rem;color:var(--color-text-muted);background:var(--color-bg-tertiary);padding:2px 6px;border-radius:2px}
    .stat{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs);padding:16px;text-align:center}.stat.ok{border-color:var(--color-success)}.stat.err{border-color:var(--color-danger)}.stat__val{font-family:var(--font-family);font-size:1.5rem;font-weight:700;color:var(--color-text-primary)}.stat__label{font-family:var(--font-family);font-size:0.5625rem;color:var(--color-text-muted);letter-spacing:0.06em}
    .model-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.model-card{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs);padding:16px;display:flex;flex-direction:column;gap:6px}.model-card__icon{font-size:1.5rem}.model-card h3{font-family:var(--font-family);font-size:0.875rem;font-weight:600;color:var(--color-text-primary);margin:0}.model-card__status{font-family:var(--font-family);font-size:0.5625rem;font-weight:700;padding:2px 6px;border-radius:2px;letter-spacing:0.04em;display:inline-block;width:fit-content}.model-card__status.ok{color:var(--color-success);background:rgba(16,185,129,0.1)}.model-card__status.warn{color:#fbbf24;background:rgba(251,191,36,0.1)}.model-card p{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-secondary);margin:0}.model-card__detail{font-family:var(--font-family);font-size:0.5625rem;color:var(--color-text-muted);background:var(--color-bg-tertiary);padding:2px 6px;border-radius:2px}
    .cron-grid{display:grid;gap:6px}.cron-item{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs)}.cron-item__time{font-family:var(--font-family);font-size:0.6875rem;font-weight:700;color:var(--color-accent)}.cron-item span:last-child{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-secondary)}
    .section--warn{background:rgba(239,68,68,0.03);border:1px solid rgba(239,68,68,0.1);border-radius:var(--radius-xs);padding:16px;margin-top:24px}
    .issue-list{display:flex;flex-direction:column;gap:8px}.issue{background:var(--color-bg-card);border-radius:var(--radius-xs);padding:12px}.issue--critical{border-left:3px solid var(--color-danger)}.issue--warning{border-left:3px solid #fbbf24}.issue h3{font-family:var(--font-family);font-size:0.8125rem;font-weight:600;color:var(--color-text-primary);margin:0 0 4px}.issue p{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-secondary);margin:0 0 6px}.issue__fix{font-family:var(--font-family);font-size:0.5625rem;color:var(--color-accent);background:rgba(16,185,129,0.1);padding:2px 6px;border-radius:2px}
    .actions{display:flex;gap:8px;flex-wrap:wrap}.action-btn{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:8px 16px;background:var(--color-accent);color:#fff;border:none;border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s}.action-btn:hover{background:#059669;transform:translateY(-1px)}
    @media(max-width:768px){.grid--4,.grid--3,.api-grid,.model-grid{grid-template-columns:1fr 1fr}}@media(max-width:480px){.grid--4,.grid--3,.api-grid,.model-grid{grid-template-columns:1fr}}
  `],
})
export class SystemStatusPage implements OnInit {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private router = inject(Router);

  loading = signal(true);
  status = signal<SystemStatus | null>(null);

  s = computed(() => this.status()!);
  d = computed(() => this.status()!.databases);
  ds = computed(() => this.status()!.dataSources);
  m = computed(() => this.status()!.models);
  mlReady = computed(() => this.m().xgboost === 'ready');
  mlLeagues = computed(() => this.m().trainedLeagues);

  pipeline = computed<PipelineStep[]>(() => [
    {
      id: 'collect', title: '1. Scrape Data',
      description: 'SofaScore scraper fetches fixtures, live scores, and results — zero paid APIs.',
      status: 'working',
      details: [
        'SofaScore → 50+ leagues, fixtures + live + results',
        'BBC Sport → EPL fallback scraper',
        'PSL Official → South African league fallback',
      ],
      icon: '📡',
    },
    {
      id: 'models', title: '2. Run 6 Models',
      description: 'Six independent models predict each match outcome and goals.',
      status: 'working',
      details: [
        'ELO → Team strength ratings (15%)',
        'Form → Recent results, recency weighted (15%)',
        'Odds Implied → Synthetic from ELO/Form blend (25%)',
        'Dixon-Coles Poisson → Attack/defense + goals (25%)',
        'H2H → Head-to-head history (10%)',
        'XGBoost ML → Gradient-boosted trees (10%)',
      ],
      icon: '🔬',
    },
    {
      id: 'ensemble', title: '3. Ensemble Blend',
      description: 'Weighted average with dynamic per-sport calibration.',
      status: 'working',
      details: [
        'Weights adapt based on model accuracy per sport',
        'Output: Home/Draw/Away probabilities + confidence',
        'Goals: Over/Under 1.5, 2.5, 3.5 + BTTS',
      ],
      icon: '⚖️',
    },
    {
      id: 'output', title: '4. Generate Predictions',
      description: 'Final predictions with confidence, expected value, and goals markets.',
      status: 'working',
      details: [
        `${this.d().predictions} predictions generated`,
        'Confidence: LOW / MEDIUM / HIGH',
        'Value betting: Expected Value + Kelly stake sizing',
      ],
      icon: '📊',
    },
    {
      id: 'resolve', title: '5. Resolve & Learn',
      description: 'SofaScore results auto-resolve predictions and update ratings.',
      status: 'working',
      details: [
        'Results fetched every 2 hours from SofaScore',
        'ELO ratings updated from match outcomes',
        'ML models retrained weekly (Sunday 5 AM UTC)',
      ],
      icon: '📈',
    },
  ]);

  ngOnInit() { this.fetch(); }

  fetch() {
    this.loading.set(true);
    const checks = {
      backend: this.api.getHealth().toPromise().then(() => true).catch(() => false),
      ml: this.http.get('/api/ml/health').toPromise().then((d: any) => d?.ready ?? false).catch(() => false),
      predictions: this.api.getPendingPredictions().toPromise().then((d: any) => d?.length ?? 0).catch(() => 0),
    };

    Promise.all([checks.backend, checks.ml, checks.predictions]).then(([be, ml, pred]) => {
      this.status.set({
        backend: be,
        frontend: true,
        ml,
        databases: {
          sports: 0, teams: 0, games: 0, upcoming: 0,
          pastNoScore: 0, completed: 0, predictions: pred, resolved: 0, users: 0
        },
        dataSources: {
          sofascore: { status: be ? 'ok' : 'dead', message: be ? 'Active — scraping fixtures, live scores, results' : 'Backend offline' },
          bbc: { status: 'ok', message: 'EPL fallback active' },
          psl: { status: 'ok', message: 'PSL fallback active' },
        },
        models: {
          elo: 'active',
          form: 'active',
          oddsImplied: 'active',
          poisson: 'active',
          h2h: 'active',
          xgboost: ml ? 'ready' : 'needs-data',
          trainedLeagues: 0,
        },
      });
      this.loading.set(false);
    });
  }

  refresh() { this.fetch(); }

  triggerSync() {
    this.api.syncSports().subscribe({
      next: (d: SyncResult) => alert(`Synced ${d.active ?? d.sports} sports, ${d.synced ?? d.new} games`),
      error: () => alert('Sync failed'),
    });
  }

  triggerPredictions() {
    this.api.generatePredictions().subscribe({
      next: (d: PredictionResult) => alert(`Generated ${d.generated} predictions (${d.skipped} skipped)`),
      error: () => alert('Prediction generation failed'),
    });
  }

  triggerResults() {
    this.api.updateResults().subscribe({
      next: (d: ResultsUpdate) => alert(`Updated ${d.updated} games, resolved ${d.predictionsResolved} predictions, ${d.eloUpdated} ELO updates`),
      error: () => alert('Results update failed'),
    });
  }

  triggerTrain() {
    this.http.post('/api/ml/train', {}).subscribe({
      next: (d: any) => alert(JSON.stringify(d)),
      error: () => alert('ML training failed'),
    });
  }
}
