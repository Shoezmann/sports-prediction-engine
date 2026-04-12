import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { BetsService } from '../../services/bets.service';
import { PredictionDto } from '@sports-prediction-engine/shared-types';

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

interface MR { p: PredictionDto; cat: string; reg: string; lg: string; live: boolean; tl: string; mn: number; }

@Component({
  selector: 'sp-predictions-page',
  standalone: true,
  imports: [CommonModule],
  template: `
@if (loading()) {
<div class="pg"><div class="ldr"><span class="spin"></span><p>Loading predictions...</p></div></div>
}
@if (!loading()) {
<div class="pg">
  <div class="hd">
    <div class="hl"><span class="pr">&gt;</span><div><h1>PREDICTIONS</h1>
      <p class="sb">{{ lv().length }} LIVE &middot; {{ up().length }} UPCOMING</p></div></div>
    <div class="hr">
      <span class="sd" [class.on]="isLiveConnected()" [class.off]="!isLiveConnected()"></span>
      <span class="stx" [class.on]="isLiveConnected()" [class.off]="!isLiveConnected()">{{ isLiveConnected() ? 'LIVE' : 'OFFLINE' }}</span>
      @if (lastRefresh()) { <span class="up">UPDATED {{ lastRefresh() }}</span> }
    </div>
  </div>

  <div class="fl">
    <div class="fg"><label>SPORT</label>
      <select [value]="sc() ?? ''" (change)="onCat($any($event.target).value || null)">
        <option value="">ALL</option>
        @for (c of cats(); track c) { <option [value]="c">{{ c }}</option> }
      </select></div>
    <div class="fg"><label>REGION</label>
      <select [value]="sr() ?? ''" (change)="onReg($any($event.target).value || null)">
        <option value="">ALL</option>
        @for (r of regs(); track r) { <option [value]="r">{{ r }}</option> }
      </select></div>
    <div class="fg"><label>LEAGUE</label>
      <select [value]="sl() ?? ''" (change)="onLg($any($event.target).value || null)">
        <option value="">ALL</option>
        @for (l of lgs(); track l) { <option [value]="l">{{ l }}</option> }
      </select></div>
    @if (sc() || sr() || sl()) { <button class="clr" (click)="clr()">[ CLEAR ]</button> }
  </div>

  @if (lv().length > 0) {
    <div class="ls"><div class="slbl"><span class="pd"></span> LIVE {{ lv().length }}</div>
    @for (m of lv(); track m.p.id) {
      <div class="lr">
        <span class="lcat">{{ m.cat }}</span>
        <span class="llg">{{ m.lg || '\u2014' }}</span>
        <span class="lteams"><span [class.di]="pS(m.p)==='a'">{{ m.p.game.homeTeam.name }}</span> <span class="lvs">vs</span> <span [class.di]="pS(m.p)==='h'">{{ m.p.game.awayTeam.name }}</span></span>
        <span class="lmin">{{ m.tl }}</span>
        <span class="lpick" [class]="'pk' + pK(m.p)">{{ pL(m.p) }}</span>
        <span class="lconf">{{ (m.p.confidence * 100).toFixed(0) }}%</span>
      </div>
    }
    </div>
  }

  @if (up().length > 0) {
    <div class="slbl">UPCOMING</div>
    <div class="tw"><table class="tb">
      <thead><tr>
        <th>TIME</th><th>SPORT</th><th>LEAGUE</th><th>MATCH</th><th>PICK</th><th>CONF</th><th>EV</th><th>ODDS</th><th></th>
      </tr></thead>
      <tbody>
        @for (m of up(); track m.p.id) {
          <tr>
            <td class="mo">{{ m.tl }}</td>
            <td class="mo di">{{ m.cat }}</td>
            <td class="mo di">{{ m.lg || '\u2014' }}</td>
            <td>
              <span [class.di]="pS(m.p)==='a'">{{ m.p.game.homeTeam.name }}</span>
              <span class="vs">vs</span>
              <span [class.di]="pS(m.p)==='h'">{{ m.p.game.awayTeam.name }}</span>
            </td>
            <td><span class="pk" [class]="'pk' + pK(m.p)">{{ pL(m.p) }}</span></td>
            <td><span class="cf" [class]="m.p.confidenceLevel">{{ m.p.confidenceLevel.toUpperCase() }} {{ (m.p.confidence * 100).toFixed(0) }}%</span></td>
            <td>@if (m.p.expectedValue != null) {
              <span class="ev" [class.po]="m.p.expectedValue > 0" [class.ne]="m.p.expectedValue <= 0">{{ m.p.expectedValue > 0 ? '+' : '' }}{{ (m.p.expectedValue * 100).toFixed(1) }}%</span>
            } @else { <span class="di">\u2014</span> }</td>
            <td class="mo">{{ m.p.odds ? m.p.odds.toFixed(2) : '\u2014' }}</td>
            <td><button class="ab" [class.in]="iS(m.p.id)" (click)="tS(m.p)">{{ iS(m.p.id) ? '\u2713' : '+' }}</button></td>
          </tr>
        }
      </tbody>
    </table></div>
  }

  @if (total() > 0 && filt().length === 0) {
    <div class="em"><pre>\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  NO MATCHES FOR THIS FILTER  \u2502\n\u2502  Clear filters to view all   \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518</pre>
      <button class="bclr" (click)="clr()">[ CLEAR FILTERS ]</button></div>
  }
  @if (total() === 0) {
    <div class="em"><pre>\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  NO MATCHES IN SYSTEM        \u2502\n\u2502  Pipeline runs every 5 min   \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518</pre></div>
  }
</div>
}`,
  styles: [`
    .pg{max-width:1200px;margin:0 auto;padding:20px;position:relative;z-index:1}
    .ldr{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center;gap:12px}
    .spin{width:32px;height:32px;border:3px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .ldr p{color:var(--color-text-muted);font-family:var(--font-family);font-size:0.8125rem}
    .hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
    .hl{display:flex;align-items:flex-start;gap:8px}
    .pr{font-family:var(--font-family);font-size:1.25rem;color:var(--color-accent);font-weight:700;line-height:1}
    h1{font-family:var(--font-family);font-size:1.375rem;font-weight:700;letter-spacing:0.06em;color:var(--color-text-primary);line-height:1.2;margin:0}
    .sb{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);margin:3px 0 0;letter-spacing:0.02em}
    .hr{display:flex;align-items:center;gap:6px}
    .sd{width:7px;height:7px;border-radius:50%}.sd.on{background:var(--color-success);box-shadow:0 0 6px var(--color-success);animation:pulse-glow 2s ease-in-out infinite}.sd.off{background:var(--color-text-muted)}
    .stx{font-family:var(--font-family);font-size:0.625rem;font-weight:700;letter-spacing:0.06em}.stx.on{color:var(--color-success)}.stx.off{color:var(--color-text-muted)}
    .up{font-family:var(--font-family);font-size:0.625rem;color:var(--color-text-muted)}
    .fl{display:flex;align-items:flex-end;gap:10px;margin-bottom:16px;flex-wrap:wrap}
    .fg{display:flex;flex-direction:column;gap:3px}.fg label{font-family:var(--font-family);font-size:0.5625rem;font-weight:700;color:var(--color-text-muted);letter-spacing:0.06em}
    .fg select{font-family:var(--font-family);font-size:0.6875rem;font-weight:500;padding:5px 26px 5px 8px;background:var(--color-bg-input);color:var(--color-text-primary);border:1px solid var(--color-border);border-radius:var(--radius-xs);cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717a' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center}
    .fg select:focus{outline:none;border-color:var(--color-accent)}
    .clr{font-family:var(--font-family);font-size:0.625rem;font-weight:600;padding:5px 10px;background:transparent;border:1px solid var(--color-border);color:var(--color-text-muted);border-radius:var(--radius-xs);cursor:pointer;transition:all var(--transition-fast)}.clr:hover{border-color:var(--color-accent);color:var(--color-accent)}
    .slbl{display:flex;align-items:center;gap:6px;font-family:var(--font-family);font-size:0.6875rem;font-weight:700;color:var(--color-text-muted);letter-spacing:0.06em;margin-bottom:10px}
    .pd{width:7px;height:7px;border-radius:50%;background:#ef4444;box-shadow:0 0 5px rgba(239,68,68,0.5);animation:pulse-glow 1.5s ease-in-out infinite}
    .ls{background:linear-gradient(180deg,rgba(239,68,68,0.03),transparent);border:1px solid rgba(239,68,68,0.15);border-radius:var(--radius-xs);padding:12px;margin-bottom:20px}
    .lr{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--color-border-subtle)}.lr:last-child{border-bottom:none}
    .lcat{font-family:var(--font-family);font-size:0.5625rem;color:var(--color-text-muted);min-width:80px}
    .llg{font-family:var(--font-family);font-size:0.625rem;color:var(--color-text-secondary);min-width:110px}
    .lteams{font-family:var(--font-family);font-size:0.75rem;color:var(--color-text-primary);flex:1}
    .lvs{color:var(--color-text-muted);font-size:0.625rem;margin:0 4px}
    .lmin{font-family:var(--font-family);font-size:0.8125rem;font-weight:700;color:#ef4444;min-width:45px;text-align:right}
    .lpick{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:2px 6px;border-radius:2px;white-space:nowrap}
    .pkh{color:#3b82f6;background:rgba(59,130,246,0.1)}.pka{color:#a78bfa;background:rgba(167,139,250,0.1)}.pkd{color:#fbbf24;background:rgba(251,191,36,0.1)}
    .lconf{font-family:var(--font-family);font-size:0.625rem;font-weight:700;color:var(--color-text-muted);min-width:35px;text-align:right}
    .tw{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs);overflow-x:auto;-webkit-overflow-scrolling:touch}
    .tw::-webkit-scrollbar{height:5px}.tw::-webkit-scrollbar-track{background:var(--color-bg-secondary)}.tw::-webkit-scrollbar-thumb{background:var(--color-border-strong);border-radius:3px}
    .tb{width:100%;min-width:800px;border-collapse:collapse;font-family:var(--font-family)}
    .tb thead th{font-size:0.5625rem;font-weight:700;color:var(--color-text-muted);letter-spacing:0.06em;padding:8px 12px;text-align:left;border-bottom:1px solid var(--color-border);background:var(--color-bg-tertiary);white-space:nowrap}
    .tb tbody tr{border-bottom:1px solid var(--color-border-subtle);transition:background var(--transition-fast)}.tb tbody tr:hover{background:var(--color-accent-subtle)}.tb tbody tr:last-child{border-bottom:none}
    .tb tbody td{padding:8px 12px;font-size:0.75rem;white-space:nowrap;vertical-align:middle}
    .mo{font-family:var(--font-family)}.di{color:var(--color-text-muted)}.vs{color:var(--color-text-muted);font-size:0.625rem;margin:0 5px}
    .pk{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:2px 6px;border-radius:2px}
    .cf{font-family:var(--font-family);font-size:0.625rem;font-weight:700;letter-spacing:0.02em}.cf.high{color:var(--color-confidence-high)}.cf.medium{color:var(--color-confidence-medium)}.cf.low{color:var(--color-confidence-low)}
    .ev{font-family:var(--font-family);font-size:0.6875rem;font-weight:600}.ev.po{color:var(--color-success)}.ev.ne{color:var(--color-danger)}
    .ab{font-family:var(--font-family);font-size:0.875rem;font-weight:700;width:26px;height:26px;display:grid;place-items:center;border:1px solid var(--color-border);background:transparent;color:var(--color-text-secondary);border-radius:var(--radius-xs);cursor:pointer;transition:all var(--transition-fast)}
    .ab:hover{border-color:var(--color-accent);color:var(--color-accent);background:var(--color-accent-subtle)}.ab.in{border-color:var(--color-accent-border);background:var(--color-accent-subtle);color:var(--color-accent);cursor:default}
    .em{text-align:center;padding:48px 20px}.em pre{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);line-height:1.5;display:inline-block}
    .bclr{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:5px 14px;margin-top:12px;background:transparent;border:1px solid var(--color-accent-border);color:var(--color-accent);border-radius:var(--radius-xs);cursor:pointer;transition:all var(--transition-fast)}.bclr:hover{background:var(--color-accent);color:var(--color-text-on-accent)}
  `],
})
export class PredictionsPage implements OnInit, OnDestroy {
  pp = signal<PredictionDto[]>([]);
  loading = signal(true);
  sc = signal<string | null>(null);
  sr = signal<string | null>(null);
  sl = signal<string | null>(null);
  lastRefresh = signal('');
  isLiveConnected = signal(false);
  private timer = signal(Date.now());
  private tId: any = null;
  private es: EventSource | null = null;
  private api = inject(ApiService);
  authService = inject(AuthService);
  private bs = inject(BetsService);
  private router = inject(Router);

  ngOnInit() { this.ld(); this.fd(); this.cs(); this.st(); }
  ngOnDestroy() { this.ds(); if (this.tId) clearInterval(this.tId); }

  private st() { this.tId = setInterval(() => this.timer.set(Date.now()), 10000); }

  all = computed<MR[]>(() => {
    const now = this.timer();
    return this.pp()
      .filter(p => { const d = now - new Date(p.game.commenceTime).getTime(); return d < 7200000; })
      .map(p => {
        const [cat, reg, lg] = pk(p.game.sportKey);
        const ct = new Date(p.game.commenceTime).getTime();
        const diff = now - ct;
        const mn = Math.floor(diff / 60000);
        const live = mn > 0 && mn < 120;
        let tl: string;
        if (live) tl = mn + "'";
        else if (mn <= 0 && mn > -60) tl = 'SOON';
        else if (diff < 0) {
          const d = Math.floor(-diff / 86400000);
          tl = d === 1 ? 'TOMORROW' : new Date(p.game.commenceTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else tl = new Date(p.game.commenceTime).toLocaleDateString([], { weekday: 'short' }).toUpperCase();
        return { p, cat, reg, lg, live, tl, mn };
      })
      .sort((a, b) => {
        if (a.live !== b.live) return a.live ? -1 : 1;
        return a.mn - b.mn;
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
  pS(p: PredictionDto) { return p.predictedOutcome === 'home_win' ? 'h' : p.predictedOutcome === 'away_win' ? 'a' : 'd'; }
  pK(p: PredictionDto) { return p.predictedOutcome === 'home_win' ? 'h' : p.predictedOutcome === 'away_win' ? 'a' : 'd'; }
  pL(p: PredictionDto) { return p.predictedOutcome === 'home_win' ? p.game.homeTeam.name : p.predictedOutcome === 'away_win' ? p.game.awayTeam.name : 'DRAW'; }
  iS(id: string) { return !!this.bs.betSlipPredictions().find(p => p.id === id); }
  tS(p: PredictionDto) { if (this.iS(p.id)) this.bs.removeFromSlip(p.id); else this.bs.addToSlip(p); }
  ld() { try { const s = JSON.parse(localStorage.getItem('pv') || '{}'); if (s.c) this.sc.set(s.c); if (s.r) this.sr.set(s.r); if (s.l) this.sl.set(s.l); } catch {} }
  sv() { try { localStorage.setItem('pv', JSON.stringify({ c: this.sc(), r: this.sr(), l: this.sl() })); } catch {} }
  fd() {
    this.loading.set(true);
    this.api.getPendingPredictions().subscribe({
      next: d => { this.pp.set(d); this.loading.set(false); this.lastRefresh.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); },
      error: () => { this.loading.set(false); }
    });
  }
  cs() {
    this.ds(); this.es = new EventSource(window.location.origin + '/api/stream/predictions');
    this.es.onopen = () => this.isLiveConnected.set(true);
    this.es.addEventListener('predictions', (e: any) => {
      try {
        const d = JSON.parse(e.data);
        if (d.data?.predictions) this.pp.set(d.data.predictions);
        this.lastRefresh.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch {}
    });
    this.es.addEventListener('heartbeat', () => this.isLiveConnected.set(true));
    this.es.onerror = () => {
      this.isLiveConnected.set(false);
      setTimeout(() => { if (!this.isLiveConnected()) this.cs(); }, 5000);
    };
  }
  ds() { if (this.es) { this.es.close(); this.es = null; this.isLiveConnected.set(false); } }
}
