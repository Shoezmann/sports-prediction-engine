import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, LiveScoresResponse } from '../../services/api.service';
import { LiveCardComponent, LiveCardData } from '../../components/live-card/live-card.component';
import { ToastService } from '../../components/toast/toast.service';

const LM: Record<string, [string, string, string]> = {
  'soccer_epl': ['SOCCER', 'ENGLAND', 'EPL'],
  'soccer_efl_champ': ['SOCCER', 'ENGLAND', 'CHAMPIONSHIP'],
  'soccer_spain_la_liga': ['SOCCER', 'SPAIN', 'LA LIGA'],
  'soccer_germany_bundesliga': ['SOCCER', 'GERMANY', 'BUNDESLIGA'],
  'soccer_italy_serie_a': ['SOCCER', 'ITALY', 'SERIE A'],
  'soccer_france_ligue_one': ['SOCCER', 'FRANCE', 'LIGUE 1'],
  'soccer_uefa_champs_league': ['SOCCER', 'EUROPE', 'CHAMPIONS LEAGUE'],
  'soccer_uefa_europa_league': ['SOCCER', 'EUROPE', 'EUROPA LEAGUE'],
  'soccer_south_africa_psl': ['SOCCER', 'SOUTH AFRICA', 'PSL'],
  'soccer_esoccer_gt_leagues_12': ['ESOCCER', 'GT LEAGUES', '12 MINS'],
  'soccer_flashscore': ['SOCCER', '', ''],
  'soccer_sportapi': ['SOCCER', '', ''],
  'basketball_nba': ['BASKETBALL', 'USA', 'NBA'],
  'tennis_atp': ['TENNIS', 'ATP', ''],
};

function pk(key: string): [string, string, string] {
  const m = LM[key];
  if (m) return m;
  const p = key.split('_');
  return [p[0].toUpperCase(), p.length > 1 ? p[1].toUpperCase() : '', p.length > 2 ? p.slice(2).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') : ''];
}

@Component({
  selector: 'sp-live-page',
  standalone: true,
  imports: [CommonModule, LiveCardComponent],
  templateUrl: './live.page.html',
  styleUrl: './live.page.scss'
})
export class LivePage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  loading = signal(true);
  matches = signal<LiveCardData[]>([]);
  error = signal<string | null>(null);
  lastRefresh = signal('');
  sc = signal<string | null>(null);
  sr = signal<string | null>(null);
  sl = signal<string | null>(null);

  private pollInterval: any = null;

  cats = computed(() => [...new Set(this.matches().map(m => m.cat))].sort());
  regs = computed(() => { const c = this.sc(); return [...new Set(this.matches().filter(m => !c || m.cat === c).map(m => m.reg))].sort(); });
  lgs = computed(() => { const c = this.sc(), r = this.sr(); return [...new Set(this.matches().filter(m => (!c || m.cat === c) && (!r || m.reg === r)).map(m => m.lg))].sort(); });
  filtered = computed(() => {
    let f = this.matches();
    const c = this.sc(); if (c) f = f.filter(m => m.cat === c);
    const r = this.sr(); if (r) f = f.filter(m => m.reg === r);
    const l = this.sl(); if (l) f = f.filter(m => m.lg === l);
    return f;
  });

  ngOnInit() {
    this.loadState();
    this.fetch();
    // Auto-refresh every 30 seconds
    this.pollInterval = setInterval(() => this.fetch(), 30000);
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  onCat(v: string | null) { this.sc.set(v); this.sr.set(null); this.sl.set(null); this.sv(); }
  onReg(v: string | null) { this.sr.set(v); this.sl.set(null); this.sv(); }
  onLg(v: string | null) { this.sl.set(v); this.sv(); }
  clr() { this.sc.set(null); this.sr.set(null); this.sl.set(null); this.sv(); }

  private loadState() {
    try { const s = JSON.parse(localStorage.getItem('live-filters') || '{}'); if (s.c) this.sc.set(s.c); if (s.r) this.sr.set(s.r); if (s.l) this.sl.set(s.l); } catch {}
  }
  private sv() { try { localStorage.setItem('live-filters', JSON.stringify({ c: this.sc(), r: this.sr(), l: this.sl() })); } catch {} }

  fetch() {
    this.loading.set(true);
    this.error.set(null);
    this.api.getLiveScores().subscribe({
      next: (d: LiveScoresResponse) => {
        const matches = (d.matches || []).map((m: any) => {
          const [cat, reg, lg] = pk(m.sportKey || m.sportTitle?.toLowerCase().replace(/\s+/g, '_') || 'soccer');
          return {
            id: m.externalId || `${m.homeTeam}-${m.awayTeam}`,
            cat, reg, lg: m.league || lg,
            home: m.homeTeam, away: m.awayTeam,
            homeScore: m.homeScore ?? null, awayScore: m.awayScore ?? null,
            minute: m.minute, status: m.status || 'LIVE',
            sportKey: m.sportKey,
          };
        });
        this.matches.set(matches);
        this.loading.set(false);
        this.lastRefresh.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (matches.length > 0) {
          this.toast.success(`${matches.length} live match${matches.length > 1 ? 'es' : ''} found`);
        }
      },
      error: (err) => {
        this.error.set('API unavailable');
        this.matches.set([]);
        this.loading.set(false);
        this.toast.error('Could not fetch live scores');
        console.error('Live scores fetch error:', err);
      }
    });
  }

  refresh() {
    this.toast.info('Refreshing live scores...');
    this.fetch();
  }
}
