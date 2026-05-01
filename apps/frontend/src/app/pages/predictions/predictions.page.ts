import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { BetsService } from '../../services/bets.service';
import { PredictionDto, formatRelativeTime, formatShortDate, formatLocalTime12h } from '@sports-prediction-engine/shared-types';
import { ToastService } from '../../components/toast/toast.service';

const LM: Record<string, [string, string, string]> = {
  'soccer_epl': ['SOCCER', 'ENGLAND', 'EPL'],
  'soccer_efl_champ': ['SOCCER', 'ENGLAND', 'CHAMPIONSHIP'],
  'soccer_england_league1': ['SOCCER', 'ENGLAND', 'LEAGUE 1'],
  'soccer_england_league2': ['SOCCER', 'ENGLAND', 'LEAGUE 2'],
  'soccer_fa_cup': ['SOCCER', 'ENGLAND', 'FA CUP'],
  'soccer_england_efl_cup': ['SOCCER', 'ENGLAND', 'EFL CUP'],
  'soccer_spain_la_liga': ['SOCCER', 'SPAIN', 'LA LIGA'],
  'soccer_spain_segunda_division': ['SOCCER', 'SPAIN', 'SEGUNDA'],
  'soccer_germany_bundesliga': ['SOCCER', 'GERMANY', 'BUNDESLIGA'],
  'soccer_germany_bundesliga2': ['SOCCER', 'GERMANY', 'BUNDESLIGA 2'],
  'soccer_germany_liga3': ['SOCCER', 'GERMANY', 'LIGA 3'],
  'soccer_italy_serie_a': ['SOCCER', 'ITALY', 'SERIE A'],
  'soccer_italy_serie_b': ['SOCCER', 'ITALY', 'SERIE B'],
  'soccer_italy_coppa_italia': ['SOCCER', 'ITALY', 'COPPA ITALIA'],
  'soccer_france_ligue_one': ['SOCCER', 'FRANCE', 'LIGUE 1'],
  'soccer_france_ligue_two': ['SOCCER', 'FRANCE', 'LIGUE 2'],
  'soccer_netherlands_eredivisie': ['SOCCER', 'NETHERLANDS', 'EREDIVISIE'],
  'soccer_portugal_primeira_liga': ['SOCCER', 'PORTUGAL', 'PRIMEIRA LIGA'],
  'soccer_belgium_first_div': ['SOCCER', 'BELGIUM', 'FIRST DIV'],
  'soccer_turkey_super_league': ['SOCCER', 'TURKEY', 'SUPER LEAGUE'],
  'soccer_brazil_campeonato': ['SOCCER', 'BRAZIL', 'SERIE A'],
  'soccer_brazil_serie_b': ['SOCCER', 'BRAZIL', 'SERIE B'],
  'soccer_argentina_primera_division': ['SOCCER', 'ARGENTINA', 'PRIMERA'],
  'soccer_mexico_ligamx': ['SOCCER', 'MEXICO', 'LIGAMX'],
  'soccer_usa_mls': ['SOCCER', 'USA', 'MLS'],
  'soccer_australia_aleague': ['SOCCER', 'AUSTRALIA', 'A-LEAGUE'],
  'soccer_japan_j_league': ['SOCCER', 'JAPAN', 'J-LEAGUE'],
  'soccer_korea_kleague1': ['SOCCER', 'KOREA', 'K LEAGUE 1'],
  'soccer_saudi_arabia_pro_league': ['SOCCER', 'SAUDI ARABIA', 'PRO LEAGUE'],
  'soccer_poland_ekstraklasa': ['SOCCER', 'POLAND', 'EKSTRAKLASA'],
  'soccer_russia_premier_league': ['SOCCER', 'RUSSIA', 'PREMIER LEAGUE'],
  'soccer_sweden_allsvenskan': ['SOCCER', 'SWEDEN', 'ALLSVENSKAN'],
  'soccer_sweden_superettan': ['SOCCER', 'SWEDEN', 'SUPERETTAN'],
  'soccer_norway_eliteserien': ['SOCCER', 'NORWAY', 'ELITE SERIEN'],
  'soccer_denmark_superliga': ['SOCCER', 'DENMARK', 'SUPERLIGA'],
  'soccer_switzerland_superleague': ['SOCCER', 'SWITZERLAND', 'SUPER LEAGUE'],
  'soccer_austria_bundesliga': ['SOCCER', 'AUSTRIA', 'BUNDESLIGA'],
  'soccer_greece_super_league': ['SOCCER', 'GREECE', 'SUPER LEAGUE'],
  'soccer_finland_veikkausliiga': ['SOCCER', 'FINLAND', 'VEIKKAUSLIIGA'],
  'soccer_south_africa_psl': ['SOCCER', 'SOUTH AFRICA', 'PSL'],
  'soccer_league_of_ireland': ['SOCCER', 'IRELAND', 'LEAGUE OF IRELAND'],
  'soccer_spl': ['SOCCER', 'SCOTLAND', 'PREMIERSHIP'],
  'soccer_uefa_champs_league': ['SOCCER', 'EUROPE', 'CHAMPIONS LEAGUE'],
  'soccer_uefa_europa_league': ['SOCCER', 'EUROPE', 'EUROPA LEAGUE'],
  'soccer_uefa_europa_conference_league': ['SOCCER', 'EUROPE', 'CONFERENCE LEAGUE'],
  'soccer_conmebol_copa_libertadores': ['SOCCER', 'S.AMERICA', 'COPA LIBERTADORES'],
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
  'basketball_ncaab': ['BASKETBALL', 'USA', 'NCAA'],
  'basketball_euroleague': ['BASKETBALL', 'EUROPE', 'EUROLEAGUE'],
  'americanfootball_nfl': ['AM FOOTBALL', 'USA', 'NFL'],
  'americanfootball_ncaaf': ['AM FOOTBALL', 'USA', 'NCAA'],
  'baseball_mlb': ['BASEBALL', 'USA', 'MLB'],
  'icehockey_nhl': ['ICE HOCKEY', 'USA', 'NHL'],
  'icehockey_ahl': ['ICE HOCKEY', 'USA', 'AHL'],
  'tennis_atp_french_open': ['TENNIS', 'ATP', 'FRENCH OPEN'],
  'tennis_atp_wimbledon': ['TENNIS', 'ATP', 'WIMBLEDON'],
  'tennis_atp_us_open': ['TENNIS', 'ATP', 'US OPEN'],
  'tennis_atp_australian_open': ['TENNIS', 'ATP', 'AUSTRALIAN OPEN'],
  'tennis_atp_monte_carlo_masters': ['TENNIS', 'ATP', 'MONTE CARLO'],
  'tennis_wta_french_open': ['TENNIS', 'WTA', 'FRENCH OPEN'],
  'mma_ufc': ['MMA', 'WORLD', 'UFC'],
  'mma_mixed_martial_arts': ['MMA', 'WORLD', 'MMA'],
  'boxing_boxing': ['BOXING', 'WORLD', 'BOXING'],
  'rugbyleague_nrl': ['RUGBY LEAGUE', 'AUSTRALIA', 'NRL'],
  'rugbyunion_six_nations': ['RUGBY UNION', 'EUROPE', 'SIX NATIONS'],
  'handball_germany_bundesliga': ['HANDBALL', 'GERMANY', 'BUNDESLIGA'],
  'lacrosse_ncaa': ['LACROSSE', 'USA', 'NCAA'],
};

function pk(key: string): [string, string, string] {
  const m = LM[key];
  if (m) return m;
  const p = key.split('_');
  const c = p[0].toUpperCase();
  const r = p.length > 1 ? p[1].toUpperCase() : '';
  const l = p.length > 2 ? p.slice(2).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') : r;
  return [c, r, l];
}

interface MR { p: PredictionDto; cat: string; reg: string; lg: string; live: boolean; tl: string; dt: string; mn: number; }

@Component({
  selector: 'sp-predictions-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './predictions.page.html',
  styleUrl: './predictions.page.scss'
})
export class PredictionsPage implements OnInit {
  pp = signal<PredictionDto[]>([]);
  loading = signal(true);
  sc = signal<string | null>(null);
  sr = signal<string | null>(null);
  sl = signal<string | null>(null);
  lastRefresh = signal('');
  private api = inject(ApiService);
  authService = inject(AuthService);
  private bs = inject(BetsService);
  private router = inject(Router);
  private toast = inject(ToastService);

  ngOnInit() { this.loadState(); this.fd(); }
  ngOnDestroy() { /* no timers or SSE to clean up */ }

  all = computed<MR[]>(() => {
    const now = Date.now();
    return this.pp()
      .filter(p => { const d = now - new Date(p.game.commenceTime).getTime(); return d < 7200000; })
      .map(p => {
        const [cat, reg, lg] = pk(p.game.sportKey);
        const ct = new Date(p.game.commenceTime);
        const diff = now - ct.getTime();
        const mn = Math.floor(diff / 60000);
        const live = mn > 0 && mn < 120;
        const tl = live ? mn + "'" : formatRelativeTime(ct, now);
        const dt = live ? '' : formatShortDate(ct);
        return { p, cat, reg, lg, live, tl, dt, mn };
      })
      .sort((a, b) => {
        if (a.live !== b.live) return a.live ? -1 : 1;
        return new Date(a.p.game.commenceTime).getTime() - new Date(b.p.game.commenceTime).getTime();
      });
  });

  total = computed(() => this.all().length);
  cats = computed(() => [...new Set(this.all().map(m => m.cat))].sort());
  regs = computed(() => { const c = this.sc(); return [...new Set(this.all().filter(m => !c || m.cat === c).map(m => m.reg))].sort(); });
  lgs = computed(() => { const c = this.sc(), r = this.sr(); return [...new Set(this.all().filter(m => (!c || m.cat === c) && (!r || m.reg === r)).map(m => m.lg))].sort(); });
  lv = computed(() => this.all().filter(m => m.live));
  filt = computed(() => this.af(this.all()));
  up = computed(() => this.filt().filter(m => !m.live));

  private af(ms: MR[]): MR[] {
    let f = ms;
    const c = this.sc(); if (c) f = f.filter(m => m.cat === c);
    const r = this.sr(); if (r) f = f.filter(m => m.reg === r);
    const l = this.sl(); if (l) f = f.filter(m => m.lg === l);
    return f;
  }

  onCat(v: string | null) { this.sc.set(v); this.sr.set(null); this.sl.set(null); this.sv(); }
  onReg(v: string | null) { this.sr.set(v); this.sl.set(null); this.sv(); }
  onLg(v: string | null) { this.sl.set(v); this.sv(); }
  clr() { this.sc.set(null); this.sr.set(null); this.sl.set(null); this.sv(); }
  expandedId = signal<string | null>(null);
  pS(p: PredictionDto) { return p.predictedOutcome === 'home_win' ? 'h' : p.predictedOutcome === 'away_win' ? 'a' : 'd'; }
  pK(p: PredictionDto) { return p.predictedOutcome === 'home_win' ? 'h' : p.predictedOutcome === 'away_win' ? 'a' : 'd'; }
  pL(p: PredictionDto) { return p.predictedOutcome === 'home_win' ? p.game.homeTeam.name : p.predictedOutcome === 'away_win' ? p.game.awayTeam.name : 'DRAW'; }
  toggleExpand(id: string) { this.expandedId.set(this.expandedId() === id ? null : id); }
  isExpanded(id: string) { return this.expandedId() === id; }
  hasDraw(p: PredictionDto) { return p.probabilities.draw != null; }
  pPct(p: PredictionDto, key: 'homeWin' | 'awayWin' | 'draw') { return (((key === 'draw' ? p.probabilities.draw : p.probabilities[key]) ?? 0) * 100).toFixed(0); }
  iS(id: string) { return !!this.bs.betSlipPredictions().find(p => p.id === id); }
  tS(p: PredictionDto) { if (this.iS(p.id)) this.bs.removeFromSlip(p.id); else this.bs.addToSlip(p); }
  loadState() { try { const s = JSON.parse(localStorage.getItem('pred-filters') || '{}'); if (s.c) this.sc.set(s.c); if (s.r) this.sr.set(s.r); if (s.l) this.sl.set(s.l); } catch {} }
  sv() { try { localStorage.setItem('pred-filters', JSON.stringify({ c: this.sc(), r: this.sr(), l: this.sl() })); } catch {} }
  fd() {
    this.loading.set(true);
    this.api.getPendingPredictions().subscribe({
      next: d => { this.pp.set(d); this.loading.set(false); this.lastRefresh.set(formatLocalTime12h(new Date())); },
      error: () => { this.loading.set(false); this.toast.error('Could not load predictions'); }
    });
  }
  refresh() { this.toast.info('Refreshing predictions...'); this.fd(); }
}
