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
  'soccer_brazil_serie_b': ['SOCCER', 'BRAZIL', 'SERIE B'],
  'soccer_argentina_primera_division': ['SOCCER', 'ARGENTINA', 'PRIMERA'],
  'soccer_mexico_ligamx': ['SOCCER', 'MEXICO', 'LIGAMX'],
  'soccer_usa_mls': ['SOCCER', 'USA', 'MLS'],
  'soccer_australia_aleague': ['SOCCER', 'AUSTRALIA', 'A-LEAGUE'],
  'soccer_japan_j_league': ['SOCCER', 'JAPAN', 'J-LEAGUE'],
  'soccer_south_africa_psl': ['SOCCER', 'SOUTH AFRICA', 'PSL'],
  'soccer_poland_ekstraklasa': ['SOCCER', 'POLAND', 'EKSTRAKLASA'],
  'soccer_sweden_allsvenskan': ['SOCCER', 'SWEDEN', 'ALLSVENSKAN'],
  'soccer_norway_eliteserien': ['SOCCER', 'NORWAY', 'ELITE SERIEN'],
  'soccer_denmark_superliga': ['SOCCER', 'DENMARK', 'SUPERLIGA'],
  'soccer_switzerland_superleague': ['SOCCER', 'SWITZERLAND', 'SUPER LEAGUE'],
  'soccer_austria_bundesliga': ['SOCCER', 'AUSTRIA', 'BUNDESLIGA'],
  'soccer_uefa_champs_league': ['SOCCER', 'EUROPE', 'CHAMPIONS LEAGUE'],
  'soccer_uefa_europa_league': ['SOCCER', 'EUROPE', 'EUROPA LEAGUE'],
  'soccer_uefa_europa_conference_league': ['SOCCER', 'EUROPE', 'CONFERENCE LEAGUE'],
  'soccer_conmebol_copa_libertadores': ['SOCCER', 'S.AMERICA', 'COPA LIBERTADORES'],
  'soccer_saudi_arabia_pro_league': ['SOCCER', 'SAUDI ARABIA', 'PRO LEAGUE'],
  'soccer_esoccer_gt_leagues_12': ['ESOCCER', 'GT LEAGUES', '12 MINS'],
  'basketball_nba': ['BASKETBALL', 'USA', 'NBA'],
  'basketball_euroleague': ['BASKETBALL', 'EUROPE', 'EUROLEAGUE'],
  'americanfootball_nfl': ['AM FOOTBALL', 'USA', 'NFL'],
  'baseball_mlb': ['BASEBALL', 'USA', 'MLB'],
  'icehockey_nhl': ['ICE HOCKEY', 'USA', 'NHL'],
  'tennis_atp_french_open': ['TENNIS', 'ATP', 'FRENCH OPEN'],
  'tennis_atp_wimbledon': ['TENNIS', 'ATP', 'WIMBLEDON'],
  'tennis_atp_monte_carlo_masters': ['TENNIS', 'ATP', 'MONTE CARLO'],
  'mma_ufc': ['MMA', 'WORLD', 'UFC'],
  'boxing_boxing': ['BOXING', 'WORLD', 'BOXING'],
};

function pk(key: string): [string, string, string] {
  const m = LM[key];
  if (m) return m;
  const p = key.split('_');
  return [p[0].toUpperCase(), p.length > 1 ? p[1].toUpperCase() : '', p.length > 2 ? p.slice(2).join(' ').toUpperCase() : ''];
}

interface MR { prediction: PredictionDto; cat: string; reg: string; lg: string; live: boolean; tl: string; }
interface LMR { eid: string; cat: string; lg: string; ht: string; at: string; hs: number; as: number; st: string; mn: number | null; }

@Component({
  selector: 'sp-predictions-page',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="pg">
  <div class="hd">
    <div class="hl"><span class="pr">&gt;</span><div><h1>PREDICTIONS</h1>
      <p class="sb">{{ lc() > 0 ? lc() + ' LIVE  \u00B7  ' : '' }}{{ fm().length }} MATCHES</p></div></div>
    <div class="hr">
      <span class="sd" [class.on]="isLiveConnected()" [class.off]="!isLiveConnected()"></span>
      <span class="st" [class.on]="isLiveConnected()" [class.off]="!isLiveConnected()">{{ isLiveConnected() ? 'LIVE' : 'OFFLINE' }}</span>
      @if (lastRefresh()) { <span class="up">UPDATED {{ lastRefresh() }}</span> }
    </div>
  </div>
  <div class="fl">
    <div class="fg"><label>SPORT</label>
      <select [value]="sc() ?? ''" (change)="onCat($any($event.target).value)">
        <option value="">ALL</option>
        @for (c of cats(); track c) { <option [value]="c">{{ c }}</option> }
      </select></div>
    <div class="fg"><label>REGION</label>
      <select [value]="sr() ?? ''" (change)="onReg($any($event.target).value)">
        <option value="">ALL</option>
        @for (r of regs(); track r) { <option [value]="r">{{ r }}</option> }
      </select></div>
    <div class="fg"><label>LEAGUE</label>
      <select [value]="sl() ?? ''" (change)="onLg($any($event.target).value)">
        <option value="">ALL</option>
        @for (l of lgs(); track l) { <option [value]="l">{{ l }}</option> }
      </select></div>
    @if (sc() || sr() || sl()) { <button class="clr" (click)="clr()">[ CLEAR ]</button> }
  </div>
  @if (lsm().length > 0) {
    <div class="ls"><div class="sl"><span class="pd"></span> LIVE</div>
    @for (m of lsm(); track m.eid) {
      <div class="lr"><span class="lc">{{ m.cat }}</span><span class="ll">{{ m.lg }}</span>
        <span class="lt">{{ m.ht }} <span class="ls">{{ m.hs }}-{{ m.as }}</span> {{ m.at }}</span>
        <span class="lh" [class]="'lh' + hC(m.st)">{{ m.st }}{{ m.mn != null ? ' ' + m.mn + "'" : '' }}</span></div>
    }</div>
  }
  @if (um().length > 0) {
    <div class="sl">UPCOMING</div>
    <div class="tw"><table class="tb">
      <thead><tr><th>TIME</th><th>SPORT</th><th>LEAGUE</th><th>MATCH</th><th>PICK</th><th>CONF</th><th>EV</th><th>ODDS</th><th></th></tr></thead>
      <tbody>
        @for (m of um(); track m.prediction.id) {
          <tr>
            <td class="mo">{{ m.tl }}</td>
            <td class="mo di">{{ m.cat }}</td>
            <td class="mo di">{{ m.lg }}</td>
            <td><span [class.di]="pS(m.prediction)==='a'">{{ m.prediction.game.homeTeam.name }}</span>
                <span class="vs">vs</span>
                <span [class.di]="pS(m.prediction)==='h'">{{ m.prediction.game.awayTeam.name }}</span></td>
            <td><span class="pk" [class]="'pk' + pK(m.prediction)">{{ pL(m.prediction) }}</span></td>
            <td><span class="cf" [class]="m.prediction.confidenceLevel">{{ m.prediction.confidenceLevel.toUpperCase() }} {{ (m.prediction.confidence * 100).toFixed(0) }}%</span></td>
            <td>@if (m.prediction.expectedValue != null) {
              <span class="ev" [class.po]="m.prediction.expectedValue > 0" [class.ne]="m.prediction.expectedValue <= 0">{{ m.prediction.expectedValue > 0 ? '+' : '' }}{{ (m.prediction.expectedValue * 100).toFixed(1) }}%</span>
            } @else { <span class="di">\u2014</span> }</td>
            <td class="mo">{{ m.prediction.odds ? m.prediction.odds.toFixed(2) : '\u2014' }}</td>
            <td><button class="ab" [class.in]="iS(m.prediction.id)" (click)="aS(m.prediction)" [disabled]="iS(m.prediction.id)">{{ iS(m.prediction.id) ? '\u2713' : '+' }}</button></td>
          </tr>
        }
      </tbody>
    </table></div>
  }
  @if (am().length > 0 && fm().length === 0) {
    <div class="em"><pre>\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  NO MATCHES FOR THIS FILTER  \u2502\n\u2502  Clear filters above         \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518</pre>
      <button class="bc" (click)="clr()">[ CLEAR FILTERS ]</button></div>
  }
  @if (am().length === 0) {
    <div class="em"><pre>\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  NO MATCHES IN SYSTEM        \u2502\n\u2502  Pipeline runs every 5 min   \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518</pre></div>
  }
</div>`,
  styles: [`
    .pg{max-width:1200px;margin:0 auto;padding:20px;position:relative;z-index:1}
    .hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
    .hl{display:flex;align-items:flex-start;gap:8px}
    .pr{font-family:var(--font-family);font-size:1.25rem;color:var(--color-accent);font-weight:700;line-height:1}
    h1{font-family:var(--font-family);font-size:1.375rem;font-weight:700;letter-spacing:0.06em;color:var(--color-text-primary);line-height:1.2;margin:0}
    .sb{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);margin:3px 0 0;letter-spacing:0.02em}
    .hr{display:flex;align-items:center;gap:6px}
    .sd{width:7px;height:7px;border-radius:50%}.sd.on{background:var(--color-success);box-shadow:0 0 6px var(--color-success);animation:pulse-glow 2s ease-in-out infinite}.sd.off{background:var(--color-text-muted)}
    .st{font-family:var(--font-family);font-size:0.625rem;font-weight:700;letter-spacing:0.06em}.st.on{color:var(--color-success)}.st.off{color:var(--color-text-muted)}
    .up{font-family:var(--font-family);font-size:0.625rem;color:var(--color-text-muted)}
    .fl{display:flex;align-items:flex-end;gap:10px;margin-bottom:16px;flex-wrap:wrap}
    .fg{display:flex;flex-direction:column;gap:3px}.fg label{font-family:var(--font-family);font-size:0.5625rem;font-weight:700;color:var(--color-text-muted);letter-spacing:0.06em}
    .fg select{font-family:var(--font-family);font-size:0.6875rem;font-weight:500;padding:5px 26px 5px 8px;background:var(--color-bg-input);color:var(--color-text-primary);border:1px solid var(--color-border);border-radius:var(--radius-xs);cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717a' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center}
    .fg select:focus{outline:none;border-color:var(--color-accent)}
    .clr{font-family:var(--font-family);font-size:0.625rem;font-weight:600;padding:5px 10px;background:transparent;border:1px solid var(--color-border);color:var(--color-text-muted);border-radius:var(--radius-xs);cursor:pointer;transition:all var(--transition-fast)}.clr:hover{border-color:var(--color-accent);color:var(--color-accent)}
    .sl{display:flex;align-items:center;gap:6px;font-family:var(--font-family);font-size:0.6875rem;font-weight:700;color:var(--color-text-muted);letter-spacing:0.06em;margin-bottom:10px}
    .pd{width:7px;height:7px;border-radius:50%;background:#ef4444;box-shadow:0 0 5px rgba(239,68,68,0.5);animation:pulse-glow 1.5s ease-in-out infinite}
    .ls{background:linear-gradient(180deg,rgba(239,68,68,0.03),transparent);border:1px solid rgba(239,68,68,0.15);border-radius:var(--radius-xs);padding:12px;margin-bottom:20px}
    .lr{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--color-border-subtle)}.lr:last-child{border-bottom:none}
    .lc{font-family:var(--font-family);font-size:0.5625rem;color:var(--color-text-muted);min-width:70px}
    .ll{font-family:var(--font-family);font-size:0.625rem;color:var(--color-text-secondary);min-width:110px}
    .lt{font-family:var(--font-family);font-size:0.75rem;color:var(--color-text-primary);flex:1}
    .lsc{font-weight:700;color:var(--color-accent);margin:0 3px}
    .lh{font-family:var(--font-family);font-size:0.625rem;font-weight:700;padding:2px 6px;border-radius:2px;white-space:nowrap}
    .lh1H{color:#3b82f6;background:rgba(59,130,246,0.1)}.lh2H{color:#a78bfa;background:rgba(167,139,250,0.1)}.lhHT{color:#fbbf24;background:rgba(251,191,36,0.1)}.lhFT{color:var(--color-text-muted);background:var(--color-bg-tertiary)}
    .tw{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xs);overflow-x:auto;-webkit-overflow-scrolling:touch}
    .tw::-webkit-scrollbar{height:5px}.tw::-webkit-scrollbar-track{background:var(--color-bg-secondary)}.tw::-webkit-scrollbar-thumb{background:var(--color-border-strong);border-radius:3px}
    .tb{width:100%;min-width:800px;border-collapse:collapse;font-family:var(--font-family)}
    .tb thead th{font-size:0.5625rem;font-weight:700;color:var(--color-text-muted);letter-spacing:0.06em;padding:8px 12px;text-align:left;border-bottom:1px solid var(--color-border);background:var(--color-bg-tertiary);white-space:nowrap}
    .tb tbody tr{border-bottom:1px solid var(--color-border-subtle);transition:background var(--transition-fast)}.tb tbody tr:hover{background:var(--color-accent-subtle)}.tb tbody tr:last-child{border-bottom:none}
    .tb tbody td{padding:8px 12px;font-size:0.75rem;white-space:nowrap;vertical-align:middle}
    .mo{font-family:var(--font-family)}.di{color:var(--color-text-muted)}.di2{opacity:0.4}.vs{color:var(--color-text-muted);font-size:0.625rem;margin:0 5px}
    .pk{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:2px 6px;border-radius:2px}
    .pkh{color:#3b82f6;background:rgba(59,130,246,0.1)}.pka{color:#a78bfa;background:rgba(167,139,250,0.1)}.pkd{color:#fbbf24;background:rgba(251,191,36,0.1)}
    .cf{font-family:var(--font-family);font-size:0.625rem;font-weight:700;letter-spacing:0.02em}.cf.high{color:var(--color-confidence-high)}.cf.medium{color:var(--color-confidence-medium)}.cf.low{color:var(--color-confidence-low)}
    .ev{font-family:var(--font-family);font-size:0.6875rem;font-weight:600}.ev.po{color:var(--color-success)}.ev.ne{color:var(--color-danger)}
    .ab{font-family:var(--font-family);font-size:0.875rem;font-weight:700;width:26px;height:26px;display:grid;place-items:center;border:1px solid var(--color-border);background:transparent;color:var(--color-text-secondary);border-radius:var(--radius-xs);cursor:pointer;transition:all var(--transition-fast)}
    .ab:hover:not(:disabled){border-color:var(--color-accent);color:var(--color-accent);background:var(--color-accent-subtle)}.ab.in{border-color:var(--color-accent-border);background:var(--color-accent-subtle);color:var(--color-accent);cursor:default}.ab:disabled{cursor:default}
    .em{text-align:center;padding:48px 20px}.em pre{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);line-height:1.5;display:inline-block}
    .bc{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:5px 14px;margin-top:12px;background:transparent;border:1px solid var(--color-accent-border);color:var(--color-accent);border-radius:var(--radius-xs);cursor:pointer;transition:all var(--transition-fast)}.bc:hover{background:var(--color-accent);color:var(--color-text-on-accent)}
  `],
})
export class PredictionsPage implements OnInit, OnDestroy {
  pendingPredictions = signal<PredictionDto[]>([]);
  sc = signal<string | null>(null);
  sr = signal<string | null>(null);
  sl = signal<string | null>(null);
  lastRefresh = signal('');
  isLiveConnected = signal(false);
  lsm = signal<LMR[]>([]);
  private es: EventSource | null = null;
  private api = inject(ApiService);
  authService = inject(AuthService);
  private bs = inject(BetsService);
  private router = inject(Router);

  ngOnInit() { this.ld(); this.fd(); this.cs(); }
  ngOnDestroy() { this.ds(); }

  am = computed<MR[]>(() => this.pendingPredictions()
    .filter(p => new Date(p.game.commenceTime) > new Date(Date.now() - 7200000))
    .map(p => {
      const [c, r, l] = pk(p.game.sportKey);
      const ct = new Date(p.game.commenceTime), d = ct.getTime() - Date.now(), ms = Math.floor(-d / 60000), lv = ms > 0 && ms < 120;
      let tl = lv ? ms + "'" : (ms <= 0 && ms > -60) ? 'SOON' : (d > 0 && d < 86400000) ? ct.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (Math.floor(d / 86400000) === 1 ? 'TOMORROW' : ct.toLocaleDateString([], { weekday: 'short' }).toUpperCase());
      return { prediction: p, cat: c, reg: r, lg: l, live: lv, tl };
    }).sort((a, b) => (a.live === b.live ? 0 : a.live ? -1 : 1) || new Date(a.prediction.game.commenceTime).getTime() - new Date(b.prediction.game.commenceTime).getTime()));

  cats = computed(() => [...new Set(this.am().map(m => m.cat))].sort());
  regs = computed(() => { const c = this.sc(); return [...new Set(this.am().filter(m => !c || m.cat === c).map(m => m.reg))].sort(); });
  lgs = computed(() => { const c = this.sc(), r = this.sr(); return [...new Set(this.am().filter(m => (!c || m.cat === c) && (!r || m.reg === r)).map(m => m.lg))].sort(); });
  lc = computed(() => this.am().filter(m => m.live).length);
  fm = computed(() => this.fl(this.am()));
  um = computed(() => this.fl(this.am().filter(m => !m.live)));

  private fl(ms: MR[]): MR[] {
    let f = ms;
    const c = this.sc(), r = this.sr(), l = this.sl();
    if (c) f = f.filter(m => m.cat === c);
    if (r) f = f.filter(m => m.reg === r);
    if (l) f = f.filter(m => m.lg === l);
    return f;
  }

  onCat(v: string) { this.sc.set(v || null); this.sr.set(null); this.sl.set(null); this.sv(); }
  onReg(v: string) { this.sr.set(v || null); this.sl.set(null); this.sv(); }
  onLg(v: string) { this.sl.set(v || null); this.sv(); }
  clr() { this.sc.set(null); this.sr.set(null); this.sl.set(null); this.sv(); }
  pS(p: PredictionDto) { return p.predictedOutcome === 'home_win' ? 'h' : p.predictedOutcome === 'away_win' ? 'a' : 'd'; }
  pK(p: PredictionDto) { return p.predictedOutcome === 'home_win' ? 'h' : p.predictedOutcome === 'away_win' ? 'a' : 'd'; }
  pL(p: PredictionDto) { return p.predictedOutcome === 'home_win' ? p.game.homeTeam.name : p.predictedOutcome === 'away_win' ? p.game.awayTeam.name : 'DRAW'; }
  hC(s: string) { return s === '1H' ? '1H' : s === '2H' ? '2H' : 'HT'; }
  iS(id: string) { return !!this.bs.betSlipPredictions().find(p => p.id === id); }
  aS(p: PredictionDto) { this.bs.addToSlip(p); }
  ld() { try { const s = JSON.parse(localStorage.getItem('pv') || '{}'); if (s.c) this.sc.set(s.c); if (s.r) this.sr.set(s.r); if (s.l) this.sl.set(s.l); } catch {} }
  sv() { try { localStorage.setItem('pv', JSON.stringify({ c: this.sc(), r: this.sr(), l: this.sl() })); } catch {} }
  fd() { this.api.getPendingPredictions().subscribe({ next: d => { this.pendingPredictions.set(d); this.lastRefresh.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); }, error: () => {} }); }
  cs() { this.ds(); this.es = new EventSource(window.location.origin + '/api/stream/predictions'); this.es.onopen = () => this.isLiveConnected.set(true); this.es.addEventListener('predictions', (e: any) => { try { const d = JSON.parse(e.data); if (d.data?.predictions) this.pendingPredictions.set(d.data.predictions); if (d.data?.liveMatches) this.lsm.set(d.data.liveMatches.map((m: any) => { const [c,,l] = pk(m.sportKey); return { eid: m.externalId, cat: c, lg: l, ht: m.homeTeam, at: m.awayTeam, hs: m.homeScore, as: m.awayScore, st: m.status, mn: m.minute }; })); this.lastRefresh.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); } catch {} }); this.es.addEventListener('heartbeat', () => this.isLiveConnected.set(true)); this.es.onerror = () => { this.isLiveConnected.set(false); setTimeout(() => { if (!this.isLiveConnected()) this.cs(); }, 5000); }; }
  ds() { if (this.es) { this.es.close(); this.es = null; this.isLiveConnected.set(false); } }
}
