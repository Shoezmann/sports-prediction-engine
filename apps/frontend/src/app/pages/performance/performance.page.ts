import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, PredictionsStats, PredictionsSummary } from '../../services/api.service';
import { LiveCardComponent, LiveCardData } from '../../components/live-card/live-card.component';
import { EmptyStateComponent, EmptyStateProps } from '../../components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { formatRelativeTime, formatShortDate, formatLocalTime12h, getElapsedMinutes, isMatchLive } from '@sports-prediction-engine/shared-types';
import { ToastService } from '../../components/toast/toast.service';

const LM: Record<string, [string, string, string]> = {
  'soccer_epl': ['SOCCER', 'ENGLAND', 'EPL'],
  'soccer_south_africa_psl': ['SOCCER', 'SOUTH AFRICA', 'PSL'],
  'soccer_spain_la_liga': ['SOCCER', 'SPAIN', 'LA LIGA'],
  'soccer_germany_bundesliga': ['SOCCER', 'GERMANY', 'BUNDESLIGA'],
  'soccer_italy_serie_a': ['SOCCER', 'ITALY', 'SERIE A'],
  'soccer_france_ligue_one': ['SOCCER', 'FRANCE', 'LIGUE 1'],
  'soccer_uefa_champs_league': ['SOCCER', 'EUROPE', 'CHAMPIONS LEAGUE'],
  'soccer_uefa_europa_league': ['SOCCER', 'EUROPE', 'EUROPA LEAGUE'],
  'soccer_esoccer_gt_leagues_12': ['ESOCCER', 'GT LEAGUES', '12 MINS'],
  'soccer_africa_cup_of_nations': ['SOCCER', 'AFRICA', 'AFCON'],
  'soccer_egypt_premier_league': ['SOCCER', 'EGYPT', 'PREMIER LEAGUE'],
  'soccer_morocco_botola': ['SOCCER', 'MOROCCO', 'BOTOLA PRO'],
  'soccer_nigeria_npl': ['SOCCER', 'NIGERIA', 'NPL'],
  'soccer_caf_champions_league': ['SOCCER', 'AFRICA', 'CAF CHAMPIONS'],
  'basketball_nba': ['BASKETBALL', 'USA', 'NBA'],
  'americanfootball_nfl': ['AM FOOTBALL', 'USA', 'NFL'],
  'icehockey_nhl': ['ICE HOCKEY', 'USA', 'NHL'],
  'tennis_atp_french_open': ['TENNIS', 'ATP', 'FRENCH OPEN'],
  'mma_ufc': ['MMA', 'WORLD', 'UFC'],
  'boxing_boxing': ['BOXING', 'WORLD', 'BOXING'],
};

function pk(key: string): [string, string, string] {
  const m = LM[key];
  if (m) return m;
  const p = key.split('_');
  return [p[0].toUpperCase(), p.length > 1 ? p[1].toUpperCase() : '', p.slice(2).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') || ''];
}

interface PickRow {
  id: string; cat: string; reg: string; lg: string;
  home: string; away: string; pick: string; pickLabel: string;
  tl: string; dt: string; status: 'live' | 'pending' | 'finished';
  live: boolean; mn: number; sportKey: string;
  correct?: boolean; homeScore?: number; awayScore?: number; totalGoals?: number;
  confidence: number; confidenceLevel: string;
  actualOutcome?: string;
  // Goals
  over2_5?: number; bttsYes?: number;
  goalsCorrect?: boolean; bttsCorrect?: boolean;
}

@Component({
  selector: 'sp-my-picks',
  standalone: true,
  imports: [CommonModule, LiveCardComponent, EmptyStateComponent, LoadingSpinnerComponent],
  template: `
<div class="pg">
  <div class="hd">
    <div class="hl"><span class="pr">&gt;</span><div><h1>Performance</h1>
      <p class="sb">How the prediction engine is performing</p></div></div>
    <div class="hr">
      @if (apiError()) { <span class="err">{{ apiError() }}</span> }
      @if (lastRefresh()) { <span class="up">UPDATED {{ lastRefresh() }}</span> }
      <button class="btn" (click)="refresh()" [disabled]="loading()">[ REFRESH ]</button>
    </div>
  </div>

  <!-- Stats dashboard -->
  <div class="stats">
    <div class="sc sc--total"><span class="sv">{{ summary()?.total ?? '—' }}</span><span class="sl">Total</span><span class="sd">All-time predictions</span></div>
    <div class="sc sc--good"><span class="sv">{{ stats()?.resolved ?? 0 }}</span><span class="sl">Resolved</span><span class="sd">Games finished</span></div>
    <div class="sc sc--bad"><span class="sv">{{ (stats()?.resolved ?? 0) - successfulCount() }}</span><span class="sl">Failed</span><span class="sd">Outcome wrong</span></div>
    <div class="sc"><span class="sv">{{ stats()?.accuracy ?? 0 }}%</span><span class="sl">Outcome</span><span class="sd">Hit rate</span></div>
    <div class="sc"><span class="sv">{{ summary()?.pending ?? '—' }}</span><span class="sl">Pending</span><span class="sd">Awaiting results</span></div>
  </div>

  <!-- Filters -->
  <div class="fl">
    <div class="fg"><label>SPORT</label>
      <select [value]="fc() ?? ''" (change)="onFc($any($event.target).value || null)">
        <option value="">ALL</option>
        @for (c of fcats(); track c) { <option [value]="c">{{ c }}</option> }
      </select></div>
    <div class="fg"><label>LEAGUE</label>
      <select [value]="fl() ?? ''" (change)="onFl($any($event.target).value || null)">
        <option value="">ALL</option>
        @for (l of fleagues(); track l) { <option [value]="l">{{ l }}</option> }
      </select></div>
    @if (fc() || fl()) { <button class="clr" (click)="clearFilters()">[ CLEAR ]</button> }
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab" [class.active]="tab()==='pending'" (click)="tab.set('pending')">
      PENDING ({{ pendingCount() }})
    </button>
    <button class="tab" [class.active]="tab()==='successful'" (click)="tab.set('successful')">
      <span class="dot dot--good"></span>SUCCESSFUL ({{ successfulCount() }})
    </button>
    <button class="tab" [class.active]="tab()==='failed'" (click)="tab.set('failed')">
      <span class="dot dot--bad"></span>FAILED ({{ failedCount() }})
    </button>
  </div>

  @if (loading()) { <sp-loading label="Loading picks..." /> }

  @if (!loading() && picks().length === 0 && !apiError()) {
    <sp-empty-state [data]="{ title: 'NO PICKS IN SYSTEM', subtitle: 'Predictions auto-generate', subtitle2: 'every 5 minutes' }" />
  }

  @if (!loading() && apiError()) {
    <sp-empty-state [data]="{ title: 'API UNAVAILABLE', subtitle: 'Check backend is running' }" />
  }

  @if (!loading() && tab()==='pending' && picks().length > 0 && pendingPicks().length === 0) {
    <sp-empty-state [data]="{ title: 'NO PENDING PICKS', subtitle: 'All predictions resolved', subtitle2: 'or awaiting match results' }" />
  }

  @if (!loading() && tab()==='successful' && picks().length > 0 && successfulPicks().length === 0) {
    <sp-empty-state [data]="{ title: 'NO CORRECT PREDICTIONS', subtitle: 'Results auto-fetch every', subtitle2: '4 hours from live scores' }" />
  }

  @if (!loading() && tab()==='failed' && picks().length > 0 && failedPicks().length === 0) {
    <sp-empty-state [data]="{ title: 'NO FAILED PREDICTIONS', subtitle: 'Results auto-fetch every', subtitle2: '4 hours from live scores' }" />
  }

  <!-- PENDING tab -->
  @if (!loading() && tab()==='pending' && pendingPicks().length > 0) {
    <div class="tw"><table class="tb">
      <thead><tr><th>TIME</th><th>DATE</th><th>LEAGUE</th><th>MATCH</th><th>OUTCOME</th><th>CONF</th></tr></thead>
      <tbody>
        @for (m of pendingPicks(); track m.id) {
          <tr>
            <td>{{ m.tl }}</td><td class="di">{{ m.dt }}</td><td class="di">{{ m.lg || '\u2014' }}</td>
            <td><span>{{ m.home }}</span><span class="vs">vs</span><span>{{ m.away }}</span></td>
            <td class="probs-cell">
              <span class="pk" [class]="'pk' + m.pick">{{ m.pickLabel }}</span>
              @if (m.over2_5 != null) {
                <span class="gp" [class.up]="m.over2_5 > 0.5" [class.down]="m.over2_5 <= 0.5" title="Over/Under 2.5: {{ (m.over2_5 * 100).toFixed(1) }}%">{{ m.over2_5 > 0.5 ? 'O' : 'U' }} {{ (m.over2_5 * 100).toFixed(0) }}%</span>
              }
              @if (m.bttsYes != null) {
                <span class="gp" [class.up]="m.bttsYes > 0.5" [class.down]="m.bttsYes <= 0.5" title="BTTS: {{ (m.bttsYes * 100).toFixed(1) }}%">{{ m.bttsYes > 0.5 ? 'Y' : 'N' }}</span>
              }
            </td>
            <td><span class="cf" [class]="m.confidenceLevel">{{ (m.confidence * 100).toFixed(0) }}%</span></td>
          </tr>
        }
      </tbody>
    </table></div>
  }

  <!-- SUCCESSFUL tab -->
  @if (!loading() && tab()==='successful' && successfulPicks().length > 0) {
    <div class="tw"><table class="tb">
      <thead><tr><th></th><th>OUTCOME</th><th>LEAGUE</th><th>MATCH</th><th>SCORE</th><th>GOALS</th><th>BTTS</th></tr></thead>
      <tbody>
        @for (m of successfulPicks(); track m.id) {
          <tr>
            <td><span class="badge win">\u2713</span></td>
            <td><span class="pk" [class]="'pk' + m.pick">{{ m.pickLabel }}</span></td>
            <td class="di">{{ m.lg || '\u2014' }}</td>
            <td><span>{{ m.home }}</span><span class="vs">vs</span><span>{{ m.away }}</span></td>
            <td class="score">{{ m.homeScore ?? '?' }} - {{ m.awayScore ?? '?' }}</td>
            <td>
              @if (m.over2_5 != null && m.totalGoals != null) {
                <span class="badge" [class.win]="m.goalsCorrect" [class.lose]="!m.goalsCorrect" [title]="'Over/Under 2.5\nPredicted: ' + (m.over2_5 > 0.5 ? 'Over' : 'Under') + '\nActual: ' + m.totalGoals + ' goals'">
                  {{ m.over2_5 > 0.5 ? 'O' : 'U' }} {{ m.totalGoals }}g
                </span>
              } @else { <span class="di">—</span> }
            </td>
            <td>
              @if (m.bttsYes != null && m.homeScore != null && m.awayScore != null) {
                <span class="badge" [class.win]="m.bttsCorrect" [class.lose]="!m.bttsCorrect" [title]="'BTTS\nPredicted: ' + (m.bttsYes > 0.5 ? 'Yes' : 'No') + '\nActual: ' + m.homeScore + '-' + m.awayScore">
                  {{ m.bttsYes > 0.5 ? 'Y' : 'N' }}
                </span>
              } @else { <span class="di">—</span> }
            </td>
          </tr>
        }
      </tbody>
    </table></div>
  }

  <!-- FAILED tab -->
  @if (!loading() && tab()==='failed' && failedPicks().length > 0) {
    <div class="tw"><table class="tb">
      <thead><tr><th></th><th>PREDICTED</th><th>ACTUAL</th><th>LEAGUE</th><th>MATCH</th><th>SCORE</th></tr></thead>
      <tbody>
        @for (m of failedPicks(); track m.id) {
          <tr>
            <td><span class="badge lose">\u2717</span></td>
            <td><span class="pk" [class]="'pk' + m.pick">{{ m.pickLabel }}</span></td>
            <td><span class="pk" [class]="'pk-' + actualKey(m)">{{ actualOutcomeLabel(m) }}</span></td>
            <td class="di">{{ m.lg || '\u2014' }}</td>
            <td><span>{{ m.home }}</span><span class="vs">vs</span><span>{{ m.away }}</span></td>
            <td class="score">{{ m.homeScore ?? '?' }} - {{ m.awayScore ?? '?' }}</td>
          </tr>
        }
      </tbody>
    </table></div>
  }

  @if (!loading() && picks().length > 0 && tab()!=='pending' && tab()!=='successful' && tab()!=='failed') {
    <div class="empty"><pre>\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  NO PICKS HERE  \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518</pre></div>
  }
</div>`,
  styles: [`
    .pg{max-width:1200px;margin:0 auto;padding:20px}
    .hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}.hl{display:flex;align-items:flex-start;gap:8px}
    .pr{font-family:var(--font-family);font-size:1.25rem;color:var(--color-accent);font-weight:700}
    h1{font-family:var(--font-family);font-size:1.375rem;font-weight:700;color:var(--color-text-primary);margin:0}
    .sb{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);margin:3px 0 0}
    .hr{display:flex;align-items:center;gap:6px}.up{font-family:var(--font-family);font-size:0.625rem;color:var(--color-text-muted)}
    .err{font-family:var(--font-family);font-size:0.625rem;color:var(--color-danger)}
    .btn{font-family:var(--font-family);font-size:0.625rem;font-weight:600;padding:4px 10px;background:transparent;border:1px solid var(--color-accent);color:var(--color-accent);border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s}.btn:hover{background:var(--color-accent);color:#fff}.btn:disabled{opacity:0.4;cursor:not-allowed}

    /* Stats dashboard */
    .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px}
    @media(max-width:900px){.stats{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:600px){.stats{grid-template-columns:repeat(2,1fr)}}
    .sc{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs);padding:16px;text-align:center;min-height:80px;display:flex;flex-direction:column;justify-content:center;gap:4px}
    .sc--total{border-color:rgba(99,102,241,0.3);background:rgba(99,102,241,0.03)}
    .sc--good{border-color:rgba(34,197,94,0.3);background:rgba(34,197,94,0.03)}
    .sc--bad{border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.03)}
    .sv{font-family:var(--font-family);font-size:1.5rem;font-weight:700;color:var(--color-accent)}
    .sl{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;color:var(--color-text-muted);letter-spacing:0.04em}
    .sd{font-family:var(--font-family);font-size:0.5rem;color:var(--color-text-secondary);letter-spacing:0.02em}

    /* Tabs */
    .tabs{display:flex;gap:4px;margin-bottom:16px;border-bottom:1px solid var(--color-border);padding-bottom:8px}
    .tab{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:6px 14px;background:transparent;border:1px solid var(--color-border);color:var(--color-text-muted);border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:4px}.tab:hover{border-color:var(--color-accent);color:var(--color-text-primary)}.tab.active{border-color:var(--color-accent);color:var(--color-accent);background:var(--color-accent-subtle)}
    .dot{width:6px;height:6px;border-radius:50%}.dot--live{background:#ef4444;box-shadow:0 0 4px rgba(239,68,68,0.5);animation:pulse-glow 1.5s ease-in-out infinite}.dot--good{background:var(--color-success);box-shadow:0 0 4px rgba(34,197,94,0.5)}.dot--bad{background:var(--color-danger);box-shadow:0 0 4px rgba(239,68,68,0.5)}

    /* Active tab: pick cards */
    .sec{display:grid;gap:8px}
    .pick-card{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs);padding:12px 16px}
    .pc-top{display:flex;justify-content:space-between;margin-bottom:6px}.pc-league{font-family:var(--font-family);font-size:0.5625rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.04em}.pc-time{font-family:var(--font-family);font-size:0.625rem;color:var(--color-accent);font-weight:700}
    .pc-match{font-family:var(--font-family);font-size:0.875rem;color:var(--color-text-primary);margin-bottom:8px}
    .pc-bottom{display:flex;align-items:center;gap:8px}
    .vs{color:var(--color-text-muted);font-size:0.625rem;margin:0 4px}

    /* Tables */
    .tw{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs);overflow-x:auto;margin-bottom:20px}
    .tw::-webkit-scrollbar{height:5px}.tw::-webkit-scrollbar-track{background:var(--color-bg-secondary)}.tw::-webkit-scrollbar-thumb{background:var(--color-border-strong);border-radius:3px}
    .tb{width:100%;min-width:800px;border-collapse:collapse;font-family:var(--font-family)}
    .tb thead th{font-size:0.5625rem;font-weight:700;color:var(--color-text-muted);padding:8px 12px;text-align:left;border-bottom:1px solid var(--color-border);background:var(--color-bg-tertiary);white-space:nowrap}
    .tb tbody tr{border-bottom:1px solid var(--color-border-subtle)}.tb tbody tr:hover{background:var(--color-accent-subtle)}.tb tbody tr:last-child{border-bottom:none}
    .tb tbody td{padding:8px 12px;font-size:0.75rem;white-space:nowrap;vertical-align:middle}
    .probs-cell{display:flex;gap:3px;align-items:center;flex-wrap:wrap}

    /* Badges */
    .pk{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:2px 8px;border-radius:2px}
    .pkh{color:#3b82f6;background:rgba(59,130,246,0.1)}.pka{color:#a78bfa;background:rgba(167,139,250,0.1)}.pkd{color:#fbbf24;background:rgba(251,191,36,0.1)}
    .cf{font-family:var(--font-family);font-size:0.625rem;font-weight:700}.cf.high{color:var(--color-confidence-high)}.cf.medium{color:var(--color-confidence-medium)}.cf.low{color:var(--color-confidence-low)}
    .badge{font-family:var(--font-family);font-weight:700;font-size:0.6875rem;padding:2px 8px;border-radius:2px;display:inline-block;min-width:24px;text-align:center;cursor:help}
    .badge.win{color:var(--color-success);background:rgba(34,197,94,0.1)}.badge.lose{color:var(--color-danger);background:rgba(239,68,68,0.1)}
    .score{font-family:var(--font-family);font-weight:700;font-size:0.875rem}
    .gp{font-family:var(--font-family);font-size:0.625rem;font-weight:600;padding:2px 6px;border-radius:2px;white-space:nowrap;cursor:help;min-width:28px;text-align:center}
    .gp.up{color:#22c55e;background:rgba(34,197,94,0.1)}.gp.down{color:#ef4444;background:rgba(239,68,68,0.1)}
    /* Filters */
    .fl{display:flex;align-items:flex-end;gap:10px;margin-bottom:16px;flex-wrap:wrap}
    .fg{display:flex;flex-direction:column;gap:3px}
    .fg label{font-family:var(--font-family);font-size:0.5625rem;font-weight:700;color:var(--color-text-muted);letter-spacing:0.06em}
    .fg select{font-family:var(--font-family);font-size:0.6875rem;padding:5px 26px 5px 8px;background:var(--color-bg-input);color:var(--color-text-primary);border:1px solid var(--color-border);border-radius:var(--radius-xs);cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717a' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center}
    .fg select:focus{outline:none;border-color:var(--color-accent)}
    .clr{font-family:var(--font-family);font-size:0.625rem;font-weight:600;padding:5px 10px;background:transparent;border:1px solid var(--color-border);color:var(--color-text-muted);border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s}.clr:hover{border-color:var(--color-accent);color:var(--color-accent)}
  `]
})
export class PerformancePage implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = signal(true);
  picks = signal<PickRow[]>([]);
  tab = signal<'pending' | 'successful' | 'failed'>('pending');
  lastRefresh = signal('');
  stats = signal<PredictionsStats | null>(null);
  summary = signal<PredictionsSummary | null>(null);
  apiError = signal<string | null>(null);
  fc = signal<string | null>(null);
  fl = signal<string | null>(null);

  ngOnInit() { this.loadAll(); }
  refresh() {
    this.toast.info('Refreshing performance data...');
    this.loadAll();
  }

  fcats = computed(() => [...new Set(this.picks().map(m => m.cat))].sort());
  fleagues = computed(() => {
    const c = this.fc();
    return [...new Set(this.picks().filter(m => !c || m.cat === c).map(m => m.lg).filter(Boolean))].sort();
  });
  onFc(v: string | null) { this.fc.set(v); this.fl.set(null); }
  onFl(v: string | null) { this.fl.set(v); }
  clearFilters() { this.fc.set(null); this.fl.set(null); }

  private filtered = computed(() => {
    let f = this.picks();
    const c = this.fc(); if (c) f = f.filter(m => m.cat === c);
    const l = this.fl(); if (l) f = f.filter(m => m.lg === l);
    return f;
  });

  successfulPicks = computed(() => this.filtered().filter(m => m.status === 'finished' && m.correct));
  failedPicks = computed(() => this.filtered().filter(m => m.status === 'finished' && !m.correct));
  pendingPicks = computed(() => this.filtered().filter(m => m.status === 'pending'));
  successfulCount = computed(() => this.successfulPicks().length);
  failedCount = computed(() => this.failedPicks().length);
  pendingCount = computed(() => this.pendingPicks().length);

  actualKey(m: PickRow): string {
    if (!m.actualOutcome) return '';
    return m.actualOutcome === 'home_win' ? 'h' : m.actualOutcome === 'away_win' ? 'a' : 'd';
  }
  actualOutcomeLabel(m: PickRow): string {
    if (!m.actualOutcome) return '—';
    const k = this.actualKey(m);
    if (k === 'h') return m.home;
    if (k === 'a') return m.away;
    return 'DRAW';
  }

  private loadAll() {
    this.loading.set(true);
    this.apiError.set(null);

    this.api.getPendingPredictions().subscribe({
      next: (pending) => {
        const items: PickRow[] = pending.map(p => {
          const [cat, reg, lg] = pk(p.game.sportKey);
          const ct = new Date(p.game.commenceTime);
          const mn = getElapsedMinutes(p.game.commenceTime);
          const isLive = isMatchLive(p.game.commenceTime);
          const pick = p.predictedOutcome === 'home_win' ? 'h' : p.predictedOutcome === 'away_win' ? 'a' : 'd';
          return {
            id: p.id, cat, reg, lg, home: p.game.homeTeam.name, away: p.game.awayTeam.name,
            pick, pickLabel: pick === 'h' ? p.game.homeTeam.name : pick === 'a' ? p.game.awayTeam.name : 'DRAW',
            tl: isLive ? mn + "'" : formatRelativeTime(ct), dt: isLive ? '' : formatShortDate(ct),
            status: isLive ? 'live' : (mn > 120 ? 'finished' : 'pending'), live: isLive, mn,
            sportKey: p.game.sportKey, confidence: p.confidence, confidenceLevel: p.confidenceLevel,
            over2_5: p.goals?.over2_5,
            bttsYes: p.btts?.yes,
          };
        });

        // Also load resolved predictions for the Results tab
        this.api.getResolvedPredictions().subscribe({
          next: (resolved) => {
            const resolvedItems: PickRow[] = resolved.map(r => {
              const [cat, reg, lg] = pk(r.game.sportKey);
              const pick = r.predictedOutcome === 'home_win' ? 'h' : r.predictedOutcome === 'away_win' ? 'a' : 'd';
              const totalGoals = (r.game.homeScore ?? 0) + (r.game.awayScore ?? 0);
              const goalsCorrect = r.goals ? (r.goals.over2_5 > 0.5 ? totalGoals > 2.5 : totalGoals <= 2.5) : undefined;
              const bttsCorrect = r.btts ? (r.btts.yes > 0.5 ? (r.game.homeScore > 0 && r.game.awayScore > 0) : !(r.game.homeScore > 0 && r.game.awayScore > 0)) : undefined;
              return {
                id: r.id, cat, reg, lg, home: r.game.homeTeam.name, away: r.game.awayTeam.name,
                pick, pickLabel: pick === 'h' ? r.game.homeTeam.name : pick === 'a' ? r.game.awayTeam.name : 'DRAW',
                tl: formatShortDate(r.game.commenceTime), dt: '',
                status: 'finished' as const, live: false, mn: 0,
                sportKey: r.game.sportKey, confidence: r.confidence, confidenceLevel: r.confidenceLevel,
                correct: r.isCorrect, homeScore: r.game.homeScore, awayScore: r.game.awayScore,
                totalGoals,
                actualOutcome: r.actualOutcome || '',
                over2_5: r.goals?.over2_5,
                bttsYes: r.btts?.yes,
                goalsCorrect,
                bttsCorrect,
              };
            });

            this.picks.set([...items, ...resolvedItems]);
            this.loading.set(false);
            this.toast.success(`Loaded ${items.length} pending, ${resolvedItems.length} resolved picks`);
          },
          error: () => {
            this.picks.set(items);
            this.loading.set(false);
            this.toast.warning('Could not load resolved predictions');
          }
        });
      },
      error: () => {
        this.apiError.set('API unavailable');
        this.loading.set(false);
      }
    });

    // Load stats
    this.api.getPredictionsStats().subscribe({
      next: s => this.stats.set(s),
      error: () => { /* stats are optional, fall back to computed values */ }
    });

    // Load summary (total all-time)
    this.api.getPredictionsSummary().subscribe({
      next: s => this.summary.set(s),
      error: () => { /* summary is optional */ }
    });

    this.lastRefresh.set(formatLocalTime12h(new Date()));
  }
}
