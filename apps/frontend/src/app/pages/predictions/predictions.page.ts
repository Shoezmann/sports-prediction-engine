import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, AccuracyData } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { BetsService } from '../../services/bets.service';
import { PredictionDto } from '@sports-prediction-engine/shared-types';

@Component({
  selector: 'sp-predictions-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="header">
        <div class="header__left">
          <span class="header__prompt">></span>
          <div>
            <h1 class="header__title">PREDICTIONS</h1>
            <p class="header__subtitle">{{ pendingPredictions().length }} upcoming matches across {{ sportCount() }} sports</p>
          </div>
        </div>
        <button class="btn-generate" (click)="generatePredictions()" [disabled]="isGenerating()">
          [{{ isGenerating() ? '...' : 'GENERATE' }}]
        </button>
      </div>

      <!-- Status Bar -->
      @if (accuracy()) {
        <div class="status-bar animate-in">
          <span class="status-item">ACC: <span class="val">{{ (accuracy()!.accuracy * 100).toFixed(1) }}%</span></span>
          <span class="status-sep">│</span>
          <span class="status-item">CORRECT: <span class="val">{{ accuracy()!.correctPredictions }}</span></span>
          <span class="status-sep">│</span>
          <span class="status-item">TOTAL: <span class="val">{{ accuracy()!.totalPredictions }}</span></span>
          <span class="status-sep">│</span>
          <span class="status-item">7D: <span class="val">{{ (accuracy()!.last7Days * 100).toFixed(1) }}%</span></span>
          <span class="status-sep">│</span>
          <span class="status-item">30D: <span class="val">{{ (accuracy()!.last30Days * 100).toFixed(1) }}%</span></span>
        </div>
      }

      <!-- Sport Tabs -->
      @if (groupedPredictions().length > 0) {
        <div class="tabs animate-in" style="animation-delay: 50ms">
          <button class="tab" [class.tab--active]="selectedSport() === null" (click)="selectSport(null)">
            ALL
          </button>
          @for (sport of groupedPredictions(); track sport.name; let i = $index) {
            <button class="tab" [class.tab--active]="selectedSport() === sport.name" (click)="selectSport(sport.name)">
              {{ sport.name.toUpperCase() }}
            </button>
          }
        </div>
      }

      <!-- League Filter (shown when a sport is selected) -->
      @if (selectedSport() && leagues().length > 1) {
        <div class="league-filter animate-in" style="animation-delay: 80ms">
          <span class="league-filter__label">LEAGUE:</span>
          <button class="league-chip" [class.league-chip--active]="selectedLeague() === null" (click)="selectedLeague.set(null)">
            ALL
          </button>
          @for (league of leagues(); track league) {
            <button class="league-chip" [class.league-chip--active]="selectedLeague() === league" (click)="selectedLeague.set(league)">
              {{ league.toUpperCase() }}
            </button>
          }
        </div>
      }

      <!-- Predictions List -->
      @if (filteredPredictions().length > 0) {
        <div class="table-wrap animate-in" style="animation-delay: 100ms">
          <table class="tbl">
            <thead>
              <tr>
                <th class="th th--time">TIME</th>
                <th class="th th--sport">SPORT</th>
                <th class="th th--match">MATCH</th>
                <th class="th th--pick">PICK</th>
                <th class="th th--edge">EDGE</th>
                <th class="th th--odds">ODDS</th>
                <th class="th th--ev">EV</th>
                <th class="th th--action"></th>
              </tr>
            </thead>
            <tbody>
              @for (p of filteredPredictions(); track p.id; let i = $index) {
                <tr class="tr" [class.tr--hover]="!isInSlip(p.id)">
                  <td class="td td--time">
                    <span class="td__time">{{ formatTime(p.game.commenceTime) }}</span>
                  </td>
                  <td class="td td--sport">
                    <span class="td__sport">{{ p.game.sportTitle || sportLabel(p.game.sportKey) }}</span>
                  </td>
                  <td class="td td--match">
                    <span class="td__home" [class.dimmed]="predictedTeam(p) === 'away'">{{ p.game.homeTeam.name }}</span>
                    <span class="td__vs">vs</span>
                    <span class="td__away" [class.dimmed]="predictedTeam(p) === 'home'">{{ p.game.awayTeam.name }}</span>
                  </td>
                  <td class="td td--pick">
                    <span class="pick" [class.pick--home]="predictedTeam(p) === 'home'" [class.pick--away]="predictedTeam(p) === 'away'" [class.pick--draw]="predictedTeam(p) === 'draw'">
                      {{ pickLabel(p) }}
                    </span>
                  </td>
                  <td class="td td--edge">
                    <span class="edge" [class.edge--high]="p.confidenceLevel === 'high'" [class.edge--med]="p.confidenceLevel === 'medium'" [class.edge--low]="p.confidenceLevel === 'low'">
                      {{ p.confidenceLevel.toUpperCase() }}
                    </span>
                    <span class="edge__pct">{{ (p.confidence * 100).toFixed(0) }}%</span>
                  </td>
                  <td class="td td--odds">
                    <span class="td__odds">{{ p.odds ? p.odds.toFixed(2) : '-' }}</span>
                  </td>
                  <td class="td td--ev">
                    @if (p.expectedValue !== undefined && p.expectedValue !== null) {
                      <span class="ev" [class.ev--pos]="p.expectedValue > 0" [class.ev--neg]="p.expectedValue <= 0">
                        {{ p.expectedValue > 0 ? '+' : '' }}{{ (p.expectedValue * 100).toFixed(1) }}%
                      </span>
                    } @else {
                      <span class="td__muted">-</span>
                    }
                  </td>
                  <td class="td td--action">
                    @if (authService.isAuthenticated) {
                      <button class="btn-add" [class.btn-add--in]="isInSlip(p.id)" (click)="addToSlip(p)" [disabled]="isInSlip(p.id)">
                        {{ isInSlip(p.id) ? '✓' : '+' }}
                      </button>
                    } @else {
                      <button class="btn-add" (click)="goToLogin()">
                        →
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Empty State -->
      @if (pendingPredictions().length === 0 && accuracy() && accuracy()!.totalPredictions === 0) {
        <div class="empty animate-in" style="animation-delay: 100ms">
          <pre class="empty__ascii">
  ╔══════════════════════════════════╗
  ║  NO PREDICTIONS IN SYSTEM        ║
  ║  Run pipeline from dashboard     ║
  ╚══════════════════════════════════╝</pre>
          <a href="/" class="empty__link">[ GO TO DASHBOARD ]</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px;
      position: relative;
      z-index: 1;
    }

    // ─── Header ──────────────────────────────────
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header__left {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .header__prompt {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      color: var(--color-accent);
      font-weight: 700;
      line-height: 1;
    }

    .header__title {
      font-family: var(--font-mono);
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--color-text-primary);
      line-height: 1.2;
    }

    .header__subtitle {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-top: 4px;
      letter-spacing: 0.02em;
    }

    .btn-generate {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      font-weight: 700;
      padding: 8px 16px;
      background: transparent;
      border: 1px solid var(--color-accent);
      color: var(--color-accent);
      border-radius: var(--radius-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      letter-spacing: 0.05em;

      &:hover:not(:disabled) {
        background: var(--color-accent);
        color: var(--color-text-on-accent);
        box-shadow: var(--shadow-glow);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    // ─── Status Bar ──────────────────────────────
    .status-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xs);
      margin-bottom: 20px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      overflow-x: auto;
    }

    .status-item {
      color: var(--color-text-muted);
      white-space: nowrap;
      letter-spacing: 0.04em;
    }

    .status-item .val {
      color: var(--color-text-primary);
      font-weight: 600;
    }

    .status-sep {
      color: var(--color-border-strong);
      user-select: none;
    }

    // ─── Tabs ────────────────────────────────────
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: none;

      &::-webkit-scrollbar { display: none; }
    }

    .tab {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 6px 14px;
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      border-radius: var(--radius-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
      letter-spacing: 0.04em;

      &:hover {
        border-color: var(--color-border-strong);
        color: var(--color-text-secondary);
      }

      &--active {
        background: var(--color-accent-subtle);
        border-color: var(--color-accent-border);
        color: var(--color-accent);
      }
    }

    // ─── League Filter ───────────────────────────
    .league-filter {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 20px;
      padding: 8px 12px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xs);
      overflow-x: auto;
      scrollbar-width: none;

      &::-webkit-scrollbar { display: none; }
    }

    .league-filter__label {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--color-text-muted);
      letter-spacing: 0.06em;
      white-space: nowrap;
      margin-right: 4px;
    }

    .league-chip {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 4px 10px;
      background: transparent;
      border: 1px solid var(--color-border-subtle);
      color: var(--color-text-muted);
      border-radius: 2px;
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
      letter-spacing: 0.03em;

      &:hover {
        border-color: var(--color-border-strong);
        color: var(--color-text-secondary);
      }

      &--active {
        background: var(--color-bg-tertiary);
        border-color: var(--color-border-strong);
        color: var(--color-text-primary);
      }
    }

    // ─── Table ───────────────────────────────────
    .table-wrap {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xs);
      overflow: hidden;
    }

    .tbl {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-mono);
    }

    .th {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      letter-spacing: 0.06em;
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-tertiary);
      white-space: nowrap;
      user-select: none;
    }

    .tr {
      border-bottom: 1px solid var(--color-border-subtle);
      transition: background var(--transition-fast);

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: var(--color-accent-subtle);
      }
    }

    .td {
      padding: 12px 16px;
      font-size: 0.8125rem;
      vertical-align: middle;
      white-space: nowrap;
    }

    .td__time {
      color: var(--color-text-muted);
      font-size: 0.75rem;
    }

    .td__sport {
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      letter-spacing: 0.02em;
    }

    .td__muted {
      color: var(--color-text-muted);
    }

    .td--match {
      white-space: normal;
    }

    .td__home,
    .td__away {
      font-weight: 500;
      color: var(--color-text-primary);
      transition: opacity var(--transition-fast);

      &.dimmed {
        opacity: 0.4;
      }
    }

    .td__vs {
      color: var(--color-text-muted);
      font-size: 0.6875rem;
      margin: 0 8px;
    }

    // Pick
    .pick {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      padding: 3px 8px;
      border-radius: 2px;

      &--home {
        color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }

      &--away {
        color: #a78bfa;
        background: rgba(167, 139, 250, 0.1);
      }

      &--draw {
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
      }
    }

    // Edge
    .td--edge {
      min-width: 100px;
    }

    .edge {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;

      &--high { color: var(--color-confidence-high); }
      &--med { color: var(--color-confidence-medium); }
      &--low { color: var(--color-confidence-low); }
    }

    .edge__pct {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      margin-left: 4px;
    }

    // Odds
    .td__odds {
      color: var(--color-text-primary);
      font-variant-numeric: tabular-nums;
    }

    // EV
    .ev {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;

      &--pos {
        color: var(--color-success);
      }

      &--neg {
        color: var(--color-danger);
      }
    }

    // Action button
    .td--action {
      width: 48px;
      text-align: center;
    }

    .btn-add {
      font-family: var(--font-mono);
      font-size: 1rem;
      font-weight: 700;
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      border-radius: var(--radius-xs);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        border-color: var(--color-accent);
        color: var(--color-accent);
        background: var(--color-accent-subtle);
      }

      &--in {
        border-color: var(--color-accent-border);
        background: var(--color-accent-subtle);
        color: var(--color-accent);
        cursor: default;
      }

      &:disabled {
        cursor: default;
      }
    }

    // ─── Empty State ─────────────────────────────
    .empty {
      text-align: center;
      padding: 64px 24px;
    }

    .empty__ascii {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--color-text-muted);
      margin-bottom: 24px;
      display: inline-block;
      text-align: left;
    }

    .empty__link {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--color-accent);
      text-decoration: none;
      font-weight: 600;
      letter-spacing: 0.04em;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--color-accent-hover);
        text-shadow: var(--shadow-glow);
      }
    }

    // ─── Responsive ──────────────────────────────
    @media (max-width: 1024px) {
      .th--sport, .td--sport {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .page {
        padding: 24px 16px;
      }

      .header {
        flex-direction: column;
        gap: 16px;
      }

      .btn-generate {
        width: 100%;
        text-align: center;
      }

      .status-bar {
        font-size: 0.6875rem;
        gap: 8px;
        padding: 8px 12px;
      }

      .th, .td {
        padding: 8px 10px;
      }

      .th--ev, .td--ev {
        display: none;
      }

      .th--odds, .td--odds {
        display: none;
      }

      .td__home, .td__away {
        font-size: 0.75rem;
      }
    }

    @media (max-width: 480px) {
      .header__title {
        font-size: 1.125rem;
      }

      .th--edge, .td--edge {
        display: none;
      }

      .pick {
        font-size: 0.6875rem;
        padding: 2px 6px;
      }
    }
  `],
})
export class PredictionsPage implements OnInit {
  accuracy = signal<AccuracyData | null>(null);
  pendingPredictions = signal<PredictionDto[]>([]);
  selectedSport = signal<string | null>(null);
  selectedLeague = signal<string | null>(null);
  isGenerating = signal(false);
  sportCount = signal(0);

  private api = inject(ApiService);
  public authService = inject(AuthService);
  private betsService = inject(BetsService);
  private router = inject(Router);

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.api.getAccuracy().subscribe({
      next: (data) => {
        this.accuracy.set(data);
        this.updateSportCount();
      },
    });

    this.api.getPendingPredictions().subscribe({
      next: (data) => {
        this.pendingPredictions.set(data);
        this.updateSportCount();
      }
    });
  }

  updateSportCount() {
    const accuracyData = this.accuracy();
    const accuracySports = accuracyData ? Object.keys(accuracyData.bySport) : [];
    const pendingSports = this.pendingPredictions().map(p => p.game.sportKey);
    const unique = new Set([...accuracySports, ...pendingSports]);
    this.sportCount.set(unique.size);
  }

  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffD = Math.floor(diffH / 24);

    if (diffD === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffD === 1) return 'TOMORROW';
    if (diffD < 7) {
      return d.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
  }

  predictedTeam(p: PredictionDto): 'home' | 'away' | 'draw' {
    if (p.predictedOutcome === 'home_win') return 'home';
    if (p.predictedOutcome === 'away_win') return 'away';
    return 'draw';
  }

  pickLabel(p: PredictionDto): string {
    if (p.predictedOutcome === 'home_win') return p.game.homeTeam.name;
    if (p.predictedOutcome === 'away_win') return p.game.awayTeam.name;
    return 'DRAW';
  }

  groupedPredictions = computed(() => {
    const list = this.pendingPredictions().filter(p => new Date(p.game.commenceTime) > new Date());
    const sportMap = new Map<string, Set<string>>();

    for (const p of list) {
      const sportName = p.game.sportTitle || this.sportLabel(p.game.sportKey);
      const league = p.game.sportTitle || this.sportLabel(p.game.sportKey);
      if (!sportMap.has(sportName)) sportMap.set(sportName, new Set());
      sportMap.get(sportName)!.add(league);
    }

    return Array.from(sportMap.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .map(([name]) => ({ name }));
  });

  leagues = computed(() => {
    const sport = this.selectedSport();
    if (!sport) return [];
    const list = this.pendingPredictions().filter(p => new Date(p.game.commenceTime) > new Date());
    const leagueSet = new Set<string>();

    for (const p of list) {
      const sportName = p.game.sportTitle || this.sportLabel(p.game.sportKey);
      if (sportName === sport) {
        leagueSet.add(p.game.sportTitle || this.sportLabel(p.game.sportKey));
      }
    }

    return Array.from(leagueSet).sort();
  });

  filteredPredictions = computed(() => {
    const sport = this.selectedSport();
    const league = this.selectedLeague();
    const list = this.pendingPredictions().filter(p => new Date(p.game.commenceTime) > new Date());

    let filtered = list;

    if (sport) {
      filtered = filtered.filter(p => {
        const sportName = p.game.sportTitle || this.sportLabel(p.game.sportKey);
        return sportName === sport;
      });
    }

    if (sport && league) {
      filtered = filtered.filter(p => {
        return (p.game.sportTitle || this.sportLabel(p.game.sportKey)) === league;
      });
    }

    return filtered.sort((a, b) => new Date(a.game.commenceTime).getTime() - new Date(b.game.commenceTime).getTime());
  });

  selectSport(sport: string | null) {
    this.selectedSport.set(sport);
    this.selectedLeague.set(null);
  }

  generatePredictions() {
    this.isGenerating.set(true);
    this.api.generatePredictions().subscribe({
      next: () => {
        this.isGenerating.set(false);
        this.fetchData();
      },
      error: () => this.isGenerating.set(false),
    });
  }

  isInSlip(predictionId: string): boolean {
    return !!this.betsService.betSlipPredictions().find(p => p.id === predictionId);
  }

  addToSlip(prediction: PredictionDto) {
    this.betsService.addToSlip(prediction);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  sportLabel(key: string): string {
    return key.split('_').slice(0, 2).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }
}
