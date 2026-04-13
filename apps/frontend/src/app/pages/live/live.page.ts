import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { LiveCardComponent, LiveCardData } from '../../components/live-card/live-card.component';

interface LiveMatch {
  externalId: string;
  sportKey: string;
  sportTitle: string;
  league?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  minute: number | null;
  commenceTime: string;
}

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
  template: `
<div class="pg">
  @if (loading()) {
    <div class="loader"><span class="spin"></span><p>Loading live matches...</p></div>
  }
  @if (!loading()) {
    <div class="hd">
      <div class="hl"><span class="pr">&gt;</span><div><h1>LIVE NOW</h1>
        <p class="sb">{{ filtered().length }} of {{ matches().length }} matches</p></div></div>
      <div class="hr">
        <button class="btn" (click)="refresh()">[ REFRESH ]</button>
      </div>
    </div>

    <!-- Filters -->
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

    @if (filtered().length > 0) {
      <div class="ls">
        @for (m of filtered(); track m.id) {
          <sp-live-card [data]="m"></sp-live-card>
        }
      </div>
    }

    @if (matches().length === 0) {
      <div class="empty"><pre>\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  NO LIVE MATCHES RIGHT NOW  \u2502\n\u2502  Check back during games    \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518</pre></div>
    }
    @if (matches().length > 0 && filtered().length === 0) {
      <div class="empty"><pre>\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502  NO MATCHES FOR THIS FILTER  \u2502\n\u2502  Clear filters to view all   \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518</pre>
        <button class="bclr" (click)="clr()">[ CLEAR FILTERS ]</button></div>
    }
  }
</div>
  `,
  styles: [`
    .pg{max-width:1200px;margin:0 auto;padding:20px}
    .loader{text-align:center;padding:60px 20px}.spin{width:32px;height:32px;border:3px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block}@keyframes spin{to{transform:rotate(360deg)}}.loader p{color:var(--color-text-muted);font-family:var(--font-family);margin-top:8px}
    .hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}.hl{display:flex;align-items:flex-start;gap:8px}.pr{font-family:var(--font-family);font-size:1.25rem;color:var(--color-accent);font-weight:700;line-height:1}h1{font-family:var(--font-family);font-size:1.375rem;font-weight:700;letter-spacing:0.06em;color:var(--color-text-primary);line-height:1.2;margin:0}.sb{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);margin:3px 0 0}.hr{display:flex;align-items:center;gap:6px}
    .sd{width:7px;height:7px;border-radius:50%}.sd.on{background:var(--color-success);box-shadow:0 0 6px var(--color-success);animation:pulse-glow 2s ease-in-out infinite}.sd.off{background:var(--color-text-muted)}
    .stx{font-family:var(--font-family);font-size:0.625rem;font-weight:700;letter-spacing:0.06em}.stx.on{color:var(--color-success)}.stx.off{color:var(--color-text-muted)}
    .btn{font-family:var(--font-family);font-size:0.625rem;font-weight:600;padding:4px 10px;background:transparent;border:1px solid var(--color-accent);color:var(--color-accent);border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s}.btn:hover{background:var(--color-accent);color:#fff}
    .fl{display:flex;align-items:flex-end;gap:10px;margin-bottom:16px;flex-wrap:wrap}.fg{display:flex;flex-direction:column;gap:3px}.fg label{font-family:var(--font-family);font-size:0.5625rem;font-weight:700;color:var(--color-text-muted);letter-spacing:0.06em}
    .fg select{font-family:var(--font-family);font-size:0.6875rem;font-weight:500;padding:5px 26px 5px 8px;background:var(--color-bg-input);color:var(--color-text-primary);border:1px solid var(--color-border);border-radius:var(--radius-xs);cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717a' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center}.fg select:focus{outline:none;border-color:var(--color-accent)}
    .clr{font-family:var(--font-family);font-size:0.625rem;font-weight:600;padding:5px 10px;background:transparent;border:1px solid var(--color-border);color:var(--color-text-muted);border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s}.clr:hover{border-color:var(--color-accent);color:var(--color-accent)}
    .ls{background:linear-gradient(180deg,rgba(239,68,68,0.03),transparent);border:1px solid rgba(239,68,68,0.15);border-radius:var(--radius-xs);padding:12px 16px}
    .empty{text-align:center;padding:64px 20px}.empty pre{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);line-height:1.5;display:inline-block}.bclr{font-family:var(--font-family);font-size:0.6875rem;font-weight:600;padding:5px 14px;margin-top:12px;background:transparent;border:1px solid var(--color-accent-border);color:var(--color-accent);border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s}.bclr:hover{background:var(--color-accent);color:#fff}
  `],
})
export class LivePage implements OnInit, OnDestroy {
  private http = inject(HttpClient);

  loading = signal(true);
  matches = signal<LiveCardData[]>([]);
  sc = signal<string | null>(null);
  sr = signal<string | null>(null);
  sl = signal<string | null>(null);

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

  ngOnInit() { this.fetch(); }
  ngOnDestroy() { /* no timers or SSE to clean up */ }

  onCat(v: string | null) { this.sc.set(v); this.sr.set(null); this.sl.set(null); this.sv(); }
  onReg(v: string | null) { this.sr.set(v); this.sl.set(null); this.sv(); }
  onLg(v: string | null) { this.sl.set(v); this.sv(); }
  clr() { this.sc.set(null); this.sr.set(null); this.sl.set(null); this.sv(); }

  private loadState() {
    try { const s = JSON.parse(localStorage.getItem('live-filters') || '{}'); if (s.c) this.sc.set(s.c); if (s.r) this.sr.set(s.r); if (s.l) this.sl.set(s.l); } catch {}
  }
  private sv() { try { localStorage.setItem('live-filters', JSON.stringify({ c: this.sc(), r: this.sr(), l: this.sl() })); } catch {} }

  fetch() {
    this.http.get<any>('http://127.0.0.1:3000/api/live-scores').subscribe({
      next: (d) => {
        const matches = (d.matches || []).map((m: any) => {
          const [cat, reg, lg] = pk(m.sportKey || m.sportTitle?.toLowerCase().replace(/\s+/g, '_') || 'soccer_flashscore');
          return {
            id: m.externalId || `${m.homeTeam}-${m.awayTeam}`,
            cat, reg, lg: m.league || lg,
            home: m.homeTeam, away: m.awayTeam,
            homeScore: m.homeScore, awayScore: m.awayScore,
            minute: m.minute, status: m.status || 'LIVE',
            sportKey: m.sportKey,
          };
        });
        this.matches.set(matches);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  refresh() { this.fetch(); }
}
