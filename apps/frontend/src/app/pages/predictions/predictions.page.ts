import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, AccuracyData } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { BetsService } from '../../services/bets.service';
import { PredictionDto } from '@sports-prediction-engine/shared-types';

interface LeagueGroup {
  sport: string;
  leagues: { name: string; count: number }[];
}

interface MatchRow {
  prediction: PredictionDto;
  sport: string;
  league: string;
  isLive: boolean;
  minutesPlayed: number | null;
  currentScore: string | null;
  timeLabel: string;
}

@Component({
  selector: 'sp-predictions-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="header">
        <div class="header__left">
          <span class="header__prompt">&gt;</span>
          <div>
            <h1 class="header__title">PREDICTIONS</h1>
            <p class="header__subtitle">
              {{ liveCount() > 0 ? liveCount() + ' LIVE · ' : '' }}
              {{ filteredMatches().length }} matches
              {{ selectedLeague() ? 'in ' + selectedLeague() : 'across all leagues' }}
            </p>
          </div>
        </div>
        <div class="header__right">
          @if (lastRefresh()) {
            <span class="refresh-info">
              <span class="refresh-dot"></span>
              Updated {{ lastRefresh() }}
            </span>
          }
        </div>
      </div>

      <!-- Sport Tabs -->
      @if (sportGroups().length > 0) {
        <div class="tabs">
          <button class="tab" [class.tab--active]="selectedSport() === null" (click)="selectSport(null)">
            ALL SPORTS
          </button>
          @for (group of sportGroups(); track group.sport) {
            <button class="tab" [class.tab--active]="selectedSport() === group.sport" (click)="selectSport(group.sport)">
              {{ group.sport }}
            </button>
          }
        </div>
      }

      <!-- League Chips (shown when sport selected) -->
      @if (selectedSport() && availableLeagues().length > 0) {
        <div class="league-bar">
          <span class="league-bar__label">LEAGUE</span>
          <button class="chip" [class.chip--active]="selectedLeague() === null" (click)="selectedLeague.set(null)">
            ALL
          </button>
          @for (league of availableLeagues(); track league) {
            <button class="chip" [class.chip--active]="selectedLeague() === league" (click)="selectedLeague.set(league)">
              {{ league }}
            </button>
          }
        </div>
      }

      <!-- Live Matches (always shown at top if any) -->
      @if (liveMatches().length > 0) {
        <div class="section">
          <h2 class="section__title">
            <span class="live-dot"></span>
            LIVE NOW
          </h2>
          @for (match of liveMatches(); track match.prediction.id) {
            <div class="match-row match-row--live">
              <div class="match-row__time">
                <span class="match-row__minute">{{ match.minutesPlayed }}'</span>
              </div>
              <div class="match-row__sport">{{ match.sport }}</div>
              <div class="match-row__match">
                <span class="match-row__home" [class.dimmed]="predictedSide(match.prediction) === 'away'">{{ match.prediction.game.homeTeam.name }}</span>
                <span class="match-row__score">{{ match.currentScore }}</span>
                <span class="match-row__away" [class.dimmed]="predictedSide(match.prediction) === 'home'">{{ match.prediction.game.awayTeam.name }}</span>
              </div>
              <div class="match-row__pick">
                <span class="pick pick--live">{{ pickLabel(match.prediction) }}</span>
              </div>
              <div class="match-row__edge">
                <span class="edge" [class.edge--high]="match.prediction.confidenceLevel === 'high'" [class.edge--med]="match.prediction.confidenceLevel === 'medium'" [class.edge--low]="match.prediction.confidenceLevel === 'low'">
                  {{ (match.prediction.confidence * 100).toFixed(0) }}%
                </span>
              </div>
              <div class="match-row__ev">
                @if (match.prediction.expectedValue != null) {
                  <span class="ev" [class.ev--pos]="match.prediction.expectedValue > 0" [class.ev--neg]="match.prediction.expectedValue <= 0">
                    {{ match.prediction.expectedValue > 0 ? '+' : '' }}{{ (match.prediction.expectedValue * 100).toFixed(1) }}%
                  </span>
                }
              </div>
              <div class="match-row__action">
                <button class="btn-add" [class.btn-add--in]="isInSlip(match.prediction.id)" (click)="addToSlip(match.prediction)" [disabled]="isInSlip(match.prediction.id)">
                  {{ isInSlip(match.prediction.id) ? '✓' : '+' }}
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Upcoming Matches -->
      @if (upcomingMatches().length > 0) {
        <div class="section">
          <h2 class="section__title">UPCOMING</h2>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th class="th th--time">TIME</th>
                  <th class="th th--sport">SPORT</th>
                  <th class="th th--league">LEAGUE</th>
                  <th class="th th--match">MATCH</th>
                  <th class="th th--pick">PICK</th>
                  <th class="th th--edge">CONFIDENCE</th>
                  <th class="th th--ev">EV</th>
                  <th class="th th--odds">ODDS</th>
                  <th class="th th--action"></th>
                </tr>
              </thead>
              <tbody>
                @for (match of upcomingMatches(); track match.prediction.id) {
                  <tr class="tr">
                    <td class="td td--time">
                      <span class="td__time">{{ match.timeLabel }}</span>
                    </td>
                    <td class="td td--sport">{{ match.sport }}</td>
                    <td class="td td--league">{{ match.league }}</td>
                    <td class="td td--match">
                      <span class="td__home" [class.dimmed]="predictedSide(match.prediction) === 'away'">{{ match.prediction.game.homeTeam.name }}</span>
                      <span class="td__vs">vs</span>
                      <span class="td__away" [class.dimmed]="predictedSide(match.prediction) === 'home'">{{ match.prediction.game.awayTeam.name }}</span>
                    </td>
                    <td class="td td--pick">
                      <span class="pick" [class.pick--home]="predictedSide(match.prediction) === 'home'" [class.pick--away]="predictedSide(match.prediction) === 'away'" [class.pick--draw]="predictedSide(match.prediction) === 'draw'">
                        {{ pickLabel(match.prediction) }}
                      </span>
                    </td>
                    <td class="td td--edge">
                      <span class="edge" [class.edge--high]="match.prediction.confidenceLevel === 'high'" [class.edge--med]="match.prediction.confidenceLevel === 'medium'" [class.edge--low]="match.prediction.confidenceLevel === 'low'">
                        {{ match.prediction.confidenceLevel.toUpperCase() }}
                      </span>
                      <span class="edge__pct">{{ (match.prediction.confidence * 100).toFixed(0) }}%</span>
                    </td>
                    <td class="td td--ev">
                      @if (match.prediction.expectedValue != null) {
                        <span class="ev" [class.ev--pos]="match.prediction.expectedValue > 0" [class.ev--neg]="match.prediction.expectedValue <= 0">
                          {{ match.prediction.expectedValue > 0 ? '+' : '' }}{{ (match.prediction.expectedValue * 100).toFixed(1) }}%
                        </span>
                      } @else {
                        <span class="td__muted">—</span>
                      }
                    </td>
                    <td class="td td--odds">
                      <span class="td__odds">{{ match.prediction.odds ? match.prediction.odds.toFixed(2) : '—' }}</span>
                    </td>
                    <td class="td td--action">
                      <button class="btn-add" [class.btn-add--in]="isInSlip(match.prediction.id)" (click)="addToSlip(match.prediction)" [disabled]="isInSlip(match.prediction.id)">
                        {{ isInSlip(match.prediction.id) ? '✓' : '+' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (allMatches().length === 0) {
        <div class="empty">
          <pre class="empty__ascii">┌─────────────────────────────────────────┐
│  NO MATCHES FOUND                       │
│  Pipeline runs daily at 06:00 UTC       │
│  Next sync will fetch upcoming games    │
└─────────────────────────────────────────┘</pre>
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
      font-family: var(--font-family);
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.06em;
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

    .header__right {
      display: flex;
      align-items: center;
    }

    .refresh-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }

    .refresh-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-success);
      box-shadow: 0 0 6px var(--color-success);
      animation: pulse-glow 2s ease-in-out infinite;
    }

    // ─── Sport Tabs ──────────────────────────────
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
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

    // ─── League Bar ──────────────────────────────
    .league-bar {
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

    .league-bar__label {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--color-text-muted);
      letter-spacing: 0.06em;
      white-space: nowrap;
      margin-right: 4px;
    }

    .chip {
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

    // ─── Section ─────────────────────────────────
    .section {
      margin-bottom: 28px;
    }

    .section__title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-text-muted);
      letter-spacing: 0.06em;
      margin-bottom: 12px;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
      animation: pulse-glow 1.5s ease-in-out infinite;
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
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-tertiary);
      white-space: nowrap;
      user-select: none;
    }

    .tr {
      border-bottom: 1px solid var(--color-border-subtle);
      transition: background var(--transition-fast);

      &:last-child { border-bottom: none; }
      &:hover { background: var(--color-accent-subtle); }
    }

    .td {
      padding: 10px 14px;
      font-size: 0.8125rem;
      vertical-align: middle;
      white-space: nowrap;
    }

    .td__muted { color: var(--color-text-muted); }
    .td__odds { color: var(--color-text-primary); font-variant-numeric: tabular-nums; }

    .td__time {
      color: var(--color-text-muted);
      font-size: 0.75rem;
    }

    .td__home, .td__away {
      font-weight: 500;
      color: var(--color-text-primary);
      transition: opacity var(--transition-fast);
      &.dimmed { opacity: 0.4; }
    }

    .td__vs {
      color: var(--color-text-muted);
      font-size: 0.6875rem;
      margin: 0 8px;
    }

    // Pick badge
    .pick {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      padding: 3px 8px;
      border-radius: 2px;

      &--home { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
      &--away { color: #a78bfa; background: rgba(167, 139, 250, 0.1); }
      &--draw { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
      &--live {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        animation: pulse-glow 2s ease-in-out infinite;
      }
    }

    // Edge
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

    // EV
    .ev {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      &--pos { color: var(--color-success); }
      &--neg { color: var(--color-danger); }
    }

    // Action button
    .td--action { width: 48px; text-align: center; }

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

      &:disabled { cursor: default; }
    }

    // ─── Live Match Row ──────────────────────────
    .match-row {
      display: grid;
      grid-template-columns: 70px 80px 1fr 140px 100px 80px 48px;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xs);
      margin-bottom: 6px;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--color-border-strong);
      }

      &--live {
        border-color: rgba(239, 68, 68, 0.2);
        background: rgba(239, 68, 68, 0.03);

        &:hover {
          border-color: rgba(239, 68, 68, 0.35);
        }
      }
    }

    .match-row__minute {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      font-weight: 700;
      color: #ef4444;
    }

    .match-row__sport {
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }

    .match-row__match {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
    }

    .match-row__home, .match-row__away {
      font-weight: 500;
      color: var(--color-text-primary);
      &.dimmed { opacity: 0.4; }
    }

    .match-row__score {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--color-text-primary);
      padding: 2px 8px;
      background: var(--color-bg-tertiary);
      border-radius: 2px;
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
      display: inline-block;
      text-align: left;
    }

    // ─── Responsive ──────────────────────────────
    @media (max-width: 1024px) {
      .th--sport, .td--sport { display: none; }
      .match-row { grid-template-columns: 70px 1fr 120px 90px 70px 48px; }
      .match-row__sport { display: none; }
    }

    @media (max-width: 768px) {
      .page { padding: 24px 16px; }
      .header { flex-direction: column; gap: 12px; }
      .th--ev, .td--ev { display: none; }
      .th--odds, .td--odds { display: none; }
      .th--league, .td--league { display: none; }
      .match-row { grid-template-columns: 60px 1fr 90px 48px; }
      .match-row__edge { display: none; }
      .match-row__ev { display: none; }
    }

    @media (max-width: 480px) {
      .header__title { font-size: 1.125rem; }
      .pick { font-size: 0.6875rem; padding: 2px 6px; }
    }
  `],
})
export class PredictionsPage implements OnInit, OnDestroy {
  accuracy = signal<AccuracyData | null>(null);
  pendingPredictions = signal<PredictionDto[]>([]);
  selectedSport = signal<string | null>(null);
  selectedLeague = signal<string | null>(null);
  lastRefresh = signal<string>('');
  private pollInterval: any = null;

  private api = inject(ApiService);
  public authService = inject(AuthService);
  private betsService = inject(BetsService);
  private router = inject(Router);

  ngOnInit() {
    this.fetchData();
    // Poll every 30 seconds for real-time updates
    this.pollInterval = setInterval(() => this.fetchData(), 30_000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  fetchData() {
    this.api.getPendingPredictions().subscribe({
      next: (data) => {
        this.pendingPredictions.set(data);
        this.lastRefresh.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      },
    });
    this.api.getAccuracy().subscribe({
      next: (data) => this.accuracy.set(data),
    });
  }

  // Build hierarchical sport → league groups
  sportGroups = computed<LeagueGroup[]>(() => {
    const list = this.pendingPredictions();
    const map = new Map<string, Map<string, number>>();

    for (const p of list) {
      const sport = p.game.sportTitle || this.sportLabel(p.game.sportKey);
      const league = this.extractLeague(p.game.sportKey, p.game.sportTitle);

      if (!map.has(sport)) map.set(sport, new Map());
      const leagues = map.get(sport)!;
      leagues.set(league, (leagues.get(league) || 0) + 1);
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .map(([sport, leagues]) => ({
        sport,
        leagues: Array.from(leagues.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count })),
      }));
  });

  availableLeagues = computed<string[]>(() => {
    const sport = this.selectedSport();
    if (!sport) return [];
    const group = this.sportGroups().find(g => g.sport === sport);
    return group ? group.leagues.map(l => l.name) : [];
  });

  // Parse all matches into enriched rows
  allMatches = computed<MatchRow[]>(() => {
    return this.pendingPredictions()
      .filter(p => new Date(p.game.commenceTime) > new Date(Date.now() - 7200000)) // include recent past for live detection
      .map(p => this.enrichMatch(p))
      .sort((a, b) => {
        // Live matches first
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return new Date(a.prediction.game.commenceTime).getTime() - new Date(b.prediction.game.commenceTime).getTime();
      });
  });

  liveMatches = computed<MatchRow[]>(() =>
    this.filterBySelection(this.allMatches().filter(m => m.isLive))
  );

  upcomingMatches = computed<MatchRow[]>(() =>
    this.filterBySelection(this.allMatches().filter(m => !m.isLive && new Date(m.prediction.game.commenceTime) > new Date()))
  );

  filteredMatches = computed<MatchRow[]>(() =>
    this.filterBySelection(this.allMatches())
  );

  liveCount = computed(() => this.allMatches().filter(m => m.isLive).length);

  private filterBySelection(matches: MatchRow[]): MatchRow[] {
    const sport = this.selectedSport();
    const league = this.selectedLeague();

    let filtered = matches;
    if (sport) {
      filtered = filtered.filter(m => m.sport === sport);
    }
    if (league) {
      filtered = filtered.filter(m => m.league === league);
    }
    return filtered;
  }

  private enrichMatch(p: PredictionDto): MatchRow {
    const commenceTime = new Date(p.game.commenceTime);
    const now = new Date();
    const diffMs = commenceTime.getTime() - now.getTime();
    const minutesSinceStart = Math.floor(-diffMs / 60000);

    // A match is "live" if it started within the last 2 hours and hasn't finished
    const isLive = minutesSinceStart > 0 && minutesSinceStart < 120;
    const minutesPlayed = isLive ? minutesSinceStart : null;

    let timeLabel = '';
    if (isLive) {
      timeLabel = minutesPlayed + "'";
    } else if (minutesSinceStart <= 0 && minutesSinceStart > -60) {
      timeLabel = 'SOON';
    } else {
      timeLabel = this.formatTime(p.game.commenceTime);
    }

    const sport = p.game.sportTitle || this.sportLabel(p.game.sportKey);
    const league = this.extractLeague(p.game.sportKey, p.game.sportTitle);

    return {
      prediction: p,
      sport,
      league,
      isLive,
      minutesPlayed,
      currentScore: null, // Would come from live scores API
      timeLabel,
    };
  }

  private extractLeague(sportKey: string, sportTitle: string | undefined): string {
    // If sportTitle is the same as sport group, extract from key
    const parts = sportKey.split('_');
    if (parts.length <= 2) return sportTitle || parts.join(' ');

    // Extract everything after sport_group
    const leagueParts = parts.slice(2).map(s => s.charAt(0).toUpperCase() + s.slice(1));
    return leagueParts.join(' ') || sportTitle || 'Unknown';
  }

  private sportLabel(key: string): string {
    return key.split('_').slice(0, 2).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }

  private formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffD = Math.floor(diffH / 24);

    if (diffD === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffD === 1) return 'TOMORROW';
    if (diffD < 7) return d.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
  }

  predictedSide(p: PredictionDto): 'home' | 'away' | 'draw' {
    if (p.predictedOutcome === 'home_win') return 'home';
    if (p.predictedOutcome === 'away_win') return 'away';
    return 'draw';
  }

  pickLabel(p: PredictionDto): string {
    if (p.predictedOutcome === 'home_win') return p.game.homeTeam.name;
    if (p.predictedOutcome === 'away_win') return p.game.awayTeam.name;
    return 'DRAW';
  }

  selectSport(sport: string | null) {
    this.selectedSport.set(sport);
    this.selectedLeague.set(null);
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
}
