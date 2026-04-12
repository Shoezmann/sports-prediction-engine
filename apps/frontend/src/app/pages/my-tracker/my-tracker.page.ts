import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BetsService } from '../../services/bets.service';
import { LiveCardComponent, LiveCardData } from '../../components/live-card/live-card.component';
import { BetDto, PredictionDto } from '@sports-prediction-engine/shared-types';

const LM: Record<string, [string, string, string]> = {
  'soccer_epl': ['SOCCER', 'ENGLAND', 'EPL'],
  'soccer_efl_champ': ['SOCCER', 'ENGLAND', 'CHAMPIONSHIP'],
  'soccer_england_league1': ['SOCCER', 'ENGLAND', 'LEAGUE 1'],
  'soccer_england_league2': ['SOCCER', 'ENGLAND', 'LEAGUE 2'],
  'soccer_fa_cup': ['SOCCER', 'ENGLAND', 'FA CUP'],
  'soccer_spain_la_liga': ['SOCCER', 'SPAIN', 'LA LIGA'],
  'soccer_spain_segunda_division': ['SOCCER', 'SPAIN', 'SEGUNDA'],
  'soccer_germany_bundesliga': ['SOCCER', 'GERMANY', 'BUNDESLIGA'],
  'soccer_germany_bundesliga2': ['SOCCER', 'GERMANY', 'BUNDESLIGA 2'],
  'soccer_italy_serie_a': ['SOCCER', 'ITALY', 'SERIE A'],
  'soccer_italy_serie_b': ['SOCCER', 'ITALY', 'SERIE B'],
  'soccer_france_ligue_one': ['SOCCER', 'FRANCE', 'LIGUE 1'],
  'soccer_france_ligue_two': ['SOCCER', 'FRANCE', 'LIGUE 2'],
  'soccer_netherlands_eredivisie': ['SOCCER', 'NETHERLANDS', 'EREDIVISIE'],
  'soccer_portugal_primeira_liga': ['SOCCER', 'PORTUGAL', 'PRIMEIRA LIGA'],
  'soccer_belgium_first_div': ['SOCCER', 'BELGIUM', 'FIRST DIV'],
  'soccer_turkey_super_league': ['SOCCER', 'TURKEY', 'SUPER LEAGUE'],
  'soccer_brazil_campeonato': ['SOCCER', 'BRAZIL', 'SERIE A'],
  'soccer_argentina_primera_division': ['SOCCER', 'ARGENTINA', 'PRIMERA'],
  'soccer_mexico_ligamx': ['SOCCER', 'MEXICO', 'LIGAMX'],
  'soccer_usa_mls': ['SOCCER', 'USA', 'MLS'],
  'soccer_south_africa_psl': ['SOCCER', 'SOUTH AFRICA', 'PSL'],
  'soccer_poland_ekstraklasa': ['SOCCER', 'POLAND', 'EKSTRAKLASA'],
  'soccer_sweden_allsvenskan': ['SOCCER', 'SWEDEN', 'ALLSVENSKAN'],
  'soccer_uefa_champs_league': ['SOCCER', 'EUROPE', 'CHAMPIONS LEAGUE'],
  'soccer_uefa_europa_league': ['SOCCER', 'EUROPE', 'EUROPA LEAGUE'],
  'soccer_esoccer_gt_leagues_12': ['ESOCCER', 'GT LEAGUES', '12 MINS'],
  'soccer_africa_cup_of_nations': ['SOCCER', 'AFRICA', 'AFCON'],
  'soccer_egypt_premier_league': ['SOCCER', 'EGYPT', 'PREMIER LEAGUE'],
  'soccer_morocco_botola': ['SOCCER', 'MOROCCO', 'BOTOLA PRO'],
  'soccer_nigeria_npl': ['SOCCER', 'NIGERIA', 'NPL'],
  'soccer_ghana_premier': ['SOCCER', 'GHANA', 'PREMIER LEAGUE'],
  'soccer_tunisia_ligue_1': ['SOCCER', 'TUNISIA', 'LIGUE 1'],
  'soccer_algeria_ligue_1': ['SOCCER', 'ALGERIA', 'LIGUE 1'],
  'soccer_kenya_premier': ['SOCCER', 'KENYA', 'PREMIER LEAGUE'],
  'soccer_tanzania_premier': ['SOCCER', 'TANZANIA', 'PREMIER LEAGUE'],
  'soccer_cameroon_elite_one': ['SOCCER', 'CAMEROON', 'ELITE ONE'],
  'soccer_caf_champions_league': ['SOCCER', 'AFRICA', 'CAF CHAMPIONS'],
  'soccer_caf_confederation_cup': ['SOCCER', 'AFRICA', 'CAF CONFEDERATION'],
  'basketball_nba': ['BASKETBALL', 'USA', 'NBA'],
  'basketball_euroleague': ['BASKETBALL', 'EUROPE', 'EUROLEAGUE'],
  'americanfootball_nfl': ['AM FOOTBALL', 'USA', 'NFL'],
  'baseball_mlb': ['BASEBALL', 'USA', 'MLB'],
  'icehockey_nhl': ['ICE HOCKEY', 'USA', 'NHL'],
  'tennis_atp_french_open': ['TENNIS', 'ATP', 'FRENCH OPEN'],
  'tennis_atp_monte_carlo_masters': ['TENNIS', 'ATP', 'MONTE CARLO'],
  'mma_ufc': ['MMA', 'WORLD', 'UFC'],
  'boxing_boxing': ['BOXING', 'WORLD', 'BOXING'],
};

function formatMinute2(status: string, mn: number | null): string {
  if (mn === null || mn === undefined) return '';
  if (status === 'FT') return 'FT';
  if (status === 'HT') return 'HT';
  if (mn > 90) return `90+${mn - 90}'`;
  return `${mn}'`;
}

function pk(key: string): [string, string, string] {
  const m = LM[key];
  if (m) return m;
  const p = key.split('_');
  return [p[0].toUpperCase(), p.length > 1 ? p[1].toUpperCase() : '', p.length > 2 ? p.slice(2).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') : ''];
}

interface TrackedMatch {
  id: string;
  cat: string;
  reg: string;
  lg: string;
  home: string;
  away: string;
  pick: string;
  pickLabel: string;
  tl: string;
  dt: string;
  status: 'upcoming' | 'live' | 'finished';
  live: boolean;
  mn: number;
  correct?: boolean;
  homeScore?: number;
  awayScore?: number;
  confidence: number;
  confidenceLevel: string;
}

@Component({
  selector: 'sp-my-tracker',
  standalone: true,
  imports: [CommonModule, RouterLink, LiveCardComponent],
  template: `
@if (!authService.isAuthenticated) {
<div class="pg"><div class="auth-prompt">
  <span class="pr">&gt;</span>
  <h2>Sign in to track your matches</h2>
  <p>Add predictions to your watchlist and track them in real-time.</p>
  <a routerLink="/login" class="btn">Sign In</a>
  <span class="or">or</span>
  <a routerLink="/register" class="btn btn--outline">Create Account</a>
</div></div>
}
@if (authService.isAuthenticated) {
<div class="pg">
  <div class="hd">
    <div class="hl"><span class="pr">&gt;</span><div><h1>MY TRACKER</h1>
      <p class="sb">{{ liveCount() }} LIVE &middot; {{ upCount() }} UPCOMING &middot; {{ doneCount() }} FINISHED</p></div></div>
    <div class="hr">
      <span class="sd" [class.on]="isLiveConnected()" [class.off]="!isLiveConnected()"></span>
      <span class="stx" [class.on]="isLiveConnected()" [class.off]="!isLiveConnected()">{{ isLiveConnected() ? 'LIVE' : 'OFFLINE' }}</span>
      @if (lastRefresh()) { <span class="up">UPDATED {{ lastRefresh() }}</span> }
    </div>
  </div>

  @if (tracked().length === 0) {
    <div class="empty"><pre>\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  NO MATCHES TRACKED YET     \u2502\n\u2502  Click + on predictions    \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518</pre>
      <a routerLink="/predictions" class="btn">BROWSE PREDICTIONS</a></div>
  }

  @if (liveMatches().length > 0) {
    <div class="ls">
      <div class="slbl slbl--click" (click)="liveOpen.set(!liveOpen())">
        <span class="pd"></span> LIVE {{ liveMatches().length }}
        <span class="arr" [class.open]="liveOpen()">&#9662;</span>
      </div>
      @if (liveOpen()) {
      @for (m of liveMatches(); track m.id) {
        <sp-live-card [data]="trackerLiveData(m)"></sp-live-card>
      }
      }
    </div>
  }
  @if (upcoming().length > 0) {
    <div class="slbl">UPCOMING</div>
    <div class="tw"><table class="tb">
      <thead><tr>
        <th>TIME</th><th>DATE</th><th>SPORT</th><th>LEAGUE</th><th>MATCH</th><th>PICK</th><th>CONF</th><th></th>
      </tr></thead>
      <tbody>
        @for (m of upcoming(); track m.id) {
          <tr>
            <td class="mo">{{ m.tl }}</td>
            <td class="mo di">{{ m.dt }}</td>
            <td class="mo di">{{ m.cat }}</td>
            <td class="mo di">{{ m.lg || '\u2014' }}</td>
            <td><span>{{ m.home }}</span><span class="vs">vs</span><span>{{ m.away }}</span></td>
            <td><span class="pk" [class]="'pk' + m.pick">{{ m.pickLabel }}</span></td>
            <td><span class="cf" [class]="m.confidenceLevel">{{ m.confidenceLevel.toUpperCase() }} {{ (m.confidence * 100).toFixed(0) }}%</span></td>
            <td><button class="ab" (click)="untrack(m.id)">&times;</button></td>
          </tr>
        }
      </tbody>
    </table></div>
  }

  @if (finished().length > 0) {
    <div class="slbl">FINISHED</div>
    <div class="tw"><table class="tb">
      <thead><tr>
        <th>RESULT</th><th>SPORT</th><th>LEAGUE</th><th>MATCH</th><th>PICK</th><th></th>
      </tr></thead>
      <tbody>
        @for (m of finished(); track m.id) {
          <tr>
            <td class="mo"><span class="res" [class.win]="m.correct" [class.lose]="!m.correct">{{ m.correct ? '\u2713' : '\u2717' }}</span> <span class="rs">{{ m.homeScore ?? '-' }}-{{ m.awayScore ?? '-' }}</span></td>
            <td class="mo di">{{ m.cat }}</td>
            <td class="mo di">{{ m.lg || '\u2014' }}</td>
            <td><span>{{ m.home }}</span><span class="vs">vs</span><span>{{ m.away }}</span></td>
            <td><span class="pk" [class]="'pk' + m.pick">{{ m.pickLabel }}</span></td>
            <td><button class="ab" (click)="untrack(m.id)">&times;</button></td>
          </tr>
        }
      </tbody>
    </table></div>
  }

  @if (accuracy()) {
    <div class="stats">
      <div class="stat"><span class="sv">{{ accuracy() }}%</span><span class="sl">ACCURACY</span></div>
      <div class="stat"><span class="sv">{{ totalTracked() }}</span><span class="sl">TRACKED</span></div>
      <div class="stat"><span class="sv">{{ wins() }}</span><span class="sl">WINS</span></div>
    </div>
  }
</div>
}`,
  styles: [`
    .pg{max-width:1200px;margin:0 auto;padding:20px;position:relative;z-index:1}
    .auth-prompt{text-align:center;padding:80px 20px}
    .pr{font-family:var(--font-family);font-size:1.5rem;color:var(--color-accent);font-weight:700}
    .auth-prompt h2{font-family:var(--font-family);font-size:1.25rem;font-weight:700;color:var(--color-text-primary);margin:0.5rem 0}
    .auth-prompt p{font-family:var(--font-family);font-size:0.8125rem;color:var(--color-text-muted);margin:0 0 1.5rem}
    .btn{font-family:var(--font-family);font-size:0.8125rem;font-weight:600;padding:0.625rem 1.25rem;background:var(--color-accent);color:#fff;border:none;border-radius:var(--radius-xs);cursor:pointer;text-decoration:none;display:inline-block;transition:all 0.2s}
    .btn:hover{background:#059669;transform:translateY(-1px)}
    .btn--outline{background:transparent;border:1px solid var(--color-accent);color:var(--color-accent);margin-left:0.5rem}
    .btn--outline:hover{background:var(--color-accent);color:#fff}
    .or{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);margin:0 0.75rem}
    .hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
    .hl{display:flex;align-items:flex-start;gap:8px}
    h1{font-family:var(--font-family);font-size:1.375rem;font-weight:700;letter-spacing:0.06em;color:var(--color-text-primary);line-height:1.2;margin:0}
    .sb{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);margin:3px 0 0;letter-spacing:0.02em}
    .hr{display:flex;align-items:center;gap:6px}
    .sd{width:7px;height:7px;border-radius:50%}.sd.on{background:var(--color-success);box-shadow:0 0 6px var(--color-success);animation:pulse-glow 2s ease-in-out infinite}.sd.off{background:var(--color-text-muted)}
    .stx{font-family:var(--font-family);font-size:0.625rem;font-weight:700;letter-spacing:0.06em}.stx.on{color:var(--color-success)}.stx.off{color:var(--color-text-muted)}
    .up{font-family:var(--font-family);font-size:0.625rem;color:var(--color-text-muted)}
    .empty{text-align:center;padding:64px 20px}.empty pre{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);line-height:1.5;display:inline-block}.empty .btn{margin-top:16px}
    .slbl{display:flex;align-items:center;gap:6px;font-family:var(--font-family);font-size:0.6875rem;font-weight:700;color:var(--color-text-muted);letter-spacing:0.06em;margin-bottom:10px}.slbl--click{cursor:pointer;user-select:none}.slbl--click:hover{color:var(--color-text-primary)}.arr{font-size:0.625rem;transition:transform 0.2s;display:inline-block}.arr.open{transform:rotate(180deg)}
    .pd{width:7px;height:7px;border-radius:50%;background:#ef4444;box-shadow:0 0 5px rgba(239,68,68,0.5);animation:pulse-glow 1.5s ease-in-out infinite}
    .ls{background:linear-gradient(180deg,rgba(239,68,68,0.03),transparent);border:1px solid rgba(239,68,68,0.15);border-radius:var(--radius-xs);padding:12px;margin-bottom:20px}
    .lr{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--color-border-subtle)}.lr:last-child{border-bottom:none}
    .lcat{font-family:var(--font-family);font-size:0.5625rem;color:var(--color-text-muted);min-width:80px}
    .llg{font-family:var(--font-family);font-size:0.625rem;color:var(--color-text-secondary);min-width:100px}
    .lteams{font-family:var(--font-family);font-size:0.75rem;color:var(--color-text-primary);flex:1}
    .lsc{font-weight:700;color:var(--color-accent);margin:0 4px}
    .lmin{font-family:var(--font-family);font-size:0.8125rem;font-weight:700;color:#ef4444;min-width:40px;text-align:right}
    .lpick{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:2px 6px;border-radius:2px;white-space:nowrap}
    .pkh{color:#3b82f6;background:rgba(59,130,246,0.1)}.pka{color:#a78bfa;background:rgba(167,139,250,0.1)}.pkd{color:#fbbf24;background:rgba(251,191,36,0.1)}
    .rm{font-family:var(--font-family);font-size:1rem;font-weight:700;width:26px;height:26px;display:grid;place-items:center;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s}.rm:hover{border-color:var(--color-danger);color:var(--color-danger)}
    .tw{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs);overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:20px}
    .tw::-webkit-scrollbar{height:5px}.tw::-webkit-scrollbar-track{background:var(--color-bg-secondary)}.tw::-webkit-scrollbar-thumb{background:var(--color-border-strong);border-radius:3px}
    .tb{width:100%;min-width:800px;border-collapse:collapse;font-family:var(--font-family)}
    .tb thead th{font-size:0.5625rem;font-weight:700;color:var(--color-text-muted);letter-spacing:0.06em;padding:8px 12px;text-align:left;border-bottom:1px solid var(--color-border);background:var(--color-bg-tertiary);white-space:nowrap}
    .tb tbody tr{border-bottom:1px solid var(--color-border-subtle);transition:background var(--transition-fast)}.tb tbody tr:hover{background:var(--color-accent-subtle)}.tb tbody tr:last-child{border-bottom:none}
    .tb tbody td{padding:8px 12px;font-size:0.75rem;white-space:nowrap;vertical-align:middle}
    .mo{font-family:var(--font-family)}.di{color:var(--color-text-muted)}.vs{color:var(--color-text-muted);font-size:0.625rem;margin:0 5px}
    .pk{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:2px 6px;border-radius:2px}
    .cf{font-family:var(--font-family);font-size:0.625rem;font-weight:700;letter-spacing:0.02em}.cf.high{color:var(--color-confidence-high)}.cf.medium{color:var(--color-confidence-medium)}.cf.low{color:var(--color-confidence-low)}
    .ab{font-family:var(--font-family);font-size:1rem;font-weight:700;width:26px;height:26px;display:grid;place-items:center;border:1px solid var(--color-border);background:transparent;color:var(--color-text-secondary);border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s}.ab:hover{border-color:var(--color-danger);color:var(--color-danger)}
    .res{font-weight:700;font-size:0.875rem}.res.win{color:var(--color-success)}.res.lose{color:var(--color-danger)}
    .rs{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);margin-left:4px}
    .stats{display:flex;gap:24px;padding:16px;background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs)}
    .stat{display:flex;flex-direction:column;align-items:center;flex:1}
    .sv{font-family:var(--font-family);font-size:1.5rem;font-weight:700;color:var(--color-accent)}
    .sl{font-family:var(--font-family);font-size:0.5625rem;color:var(--color-text-muted);letter-spacing:0.06em;margin-top:2px}
  `],
})
export class MyTrackerPage implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private betsService = inject(BetsService);
  private router = inject(Router);

  tracked = signal<TrackedMatch[]>([]);
  liveOpen = signal(true);
  lastRefresh = signal('');
  isLiveConnected = signal(false);
  private es: EventSource | null = null;
  private http = inject(HttpClient);
  liveScores = signal<any[]>([]);
  private tId: any = null;

  ngOnInit() { this.loadTracked(); this.cs(); this.startTimer(); }
  ngOnDestroy() { this.ds(); if (this.tId) clearInterval(this.tId); }

  private startTimer() { this.tId = setInterval(() => this.refreshLive(), 10000); this.fetchLiveScores(); }

  liveMatches = computed(() => {
    const live = this.tracked().filter(m => m.live);
    return live.map(m => {
      const score = this.findLiveScore(m.home, m.away);
      if (score) {
        return {
          ...m,
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          status: 'live' as const,
          live: true,
          tl: this.formatMinute(score),
          mn: score.minute || m.mn,
        };
      }
      return m;
    });
  });
  upcoming = computed(() => {
    const up = this.tracked().filter(m => m.status === 'upcoming');
    return up.map(m => {
      const score = this.findLiveScore(m.home, m.away);
      if (score && (score.status === '1H' || score.status === '2H' || score.status === 'LIVE' || score.status === 'HT')) {
        return {
          ...m,
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          live: true,
          tl: this.formatMinute(score),
          mn: score.minute || 0,
        };
      }
      return m;
    });
  });
  finished = computed(() => {
    const done = this.tracked().filter(m => m.status === 'finished');
    return done.map(m => {
      const score = this.findLiveScore(m.home, m.away);
      if (score && score.status === 'FT') {
        const homeWon = score.homeScore > score.awayScore;
        const draw = score.homeScore === score.awayScore;
        const pickCorrect = (m.pick === 'h' && homeWon) || (m.pick === 'a' && !homeWon && !draw) || (m.pick === 'd' && draw);
        return {
          ...m,
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          correct: pickCorrect,
        };
      }
      return m;
    });
  });
  liveCount = computed(() => this.liveMatches().length);
  liveMin = (m: any) => { const score = this.findLiveScore(m.home, m.away); if (score?.minute != null) return formatMinute2(score.status, score.minute); return m.tl; }
  upCount = computed(() => this.upcoming().length);
  doneCount = computed(() => this.finished().length);
  totalTracked = computed(() => this.liveMatches().length + this.upcoming().length + this.finished().length);
  wins = computed(() => this.finished().filter(m => m.correct).length);
  accuracy = computed(() => {
    const done = this.finished().filter(m => m.correct !== undefined);
    if (done.length === 0) return 0;
    return Math.round((done.filter(m => m.correct).length / done.length) * 100);
  });

  private loadTracked() {
    const slip = this.betsService.betSlipPredictions();
    const tracked: TrackedMatch[] = [];

    for (const p of slip) {
      const [cat, reg, lg] = pk(p.game.sportKey);
      const ct = new Date(p.game.commenceTime);
      const diff = Date.now() - ct.getTime();
      const mn = Math.floor(diff / 60000);
      const live = mn > 0 && mn < 120;
      const status: TrackedMatch['status'] = live ? 'live' : (diff > 7200000 ? 'finished' : 'upcoming');
      const tl = live ? mn + "'" : (mn <= 0 && mn > -60) ? 'SOON' : ct.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dt = live ? '' : ct.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
      const pick = p.predictedOutcome === 'home_win' ? 'h' : p.predictedOutcome === 'away_win' ? 'a' : 'd';
      const pickLabel = p.predictedOutcome === 'home_win' ? p.game.homeTeam.name : p.predictedOutcome === 'away_win' ? p.game.awayTeam.name : 'DRAW';
      tracked.push({ id: p.id, cat, reg, lg, home: p.game.homeTeam.name, away: p.game.awayTeam.name, pick, pickLabel, tl, dt, status, live, mn, confidence: p.confidence, confidenceLevel: p.confidenceLevel });
    }

    tracked.sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1;
      if (a.status === 'finished' && b.status !== 'finished') return 1;
      if (a.status !== 'finished' && b.status === 'finished') return -1;
      return 0;
    });

    this.tracked.set(tracked);
    this.lastRefresh.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }

  private refreshLive() {
    this.loadTracked();
    this.fetchLiveScores();
  }

  private fetchLiveScores() {
    this.http.get('/api/live-scores').subscribe({
      next: (d: any) => { this.liveScores.set(d.matches || []); },
      error: () => { this.liveScores.set([]); }
    });
  }

  private findLiveScore(home: string, away: string): any {
    const scores = this.liveScores();
    return scores.find(s => 
      s.homeTeam.toLowerCase().includes(home.toLowerCase().substring(0, 4)) &&
      s.awayTeam.toLowerCase().includes(away.toLowerCase().substring(0, 4))
    ) || scores.find(s =>
      home.toLowerCase().includes(s.homeTeam.toLowerCase().substring(0, 4)) &&
      away.toLowerCase().includes(s.awayTeam.toLowerCase().substring(0, 4))
    );
  }

  formatMinute(s: any): string {
    if (!s) return '';
    const status = s.status || '';
    const mn = s.minute;
    if (mn === null || mn === undefined) return '';
    if (status === 'FT') return 'FT';
    if (status === 'HT') return 'HT';
    if (mn > 90) return `90+${mn - 90}'`;
    return `${mn}'`;
  }

  untrack(id: string) {
    this.betsService.removeFromSlip(id);
    this.loadTracked();
  }

  cs() {
    this.ds();
    this.es = new EventSource(window.location.origin + '/api/stream/predictions');
    this.es.onopen = () => this.isLiveConnected.set(true);
    this.es.addEventListener('predictions', () => this.refreshLive());
    this.es.addEventListener('heartbeat', () => this.isLiveConnected.set(true));
    this.es.onerror = () => {
      this.isLiveConnected.set(false);
      setTimeout(() => { if (!this.isLiveConnected()) this.cs(); }, 5000);
    };
  }

  trackerLiveData(m: any): LiveCardData {
    const score = this.findLiveScore(m.home, m.away);
    const mn = score?.minute ?? m.mn;
    const st = score?.status ?? (mn > 0 && mn < 120 ? (mn <= 45 ? '1H' : mn <= 47 ? 'HT' : '2H') : '');
    return {
      id: m.id, cat: m.cat, reg: m.reg, lg: m.lg,
      home: m.home, away: m.away,
      homeScore: score?.homeScore ?? m.homeScore ?? 0,
      awayScore: score?.awayScore ?? m.awayScore ?? 0,
      minute: mn, status: st,
      pick: m.pick, pickLabel: m.pickLabel,
      confidence: m.confidence, confidenceLevel: m.confidenceLevel,
      onRemove: (id: string) => this.untrack(id),
    };
  }

  ds() { if (this.es) { this.es.close(); this.es = null; this.isLiveConnected.set(false); } }
}
