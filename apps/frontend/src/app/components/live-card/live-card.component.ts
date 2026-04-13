import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatSportMinute, getSportDurationConfig } from '@sports-prediction-engine/shared-types';

export interface LiveCardData {
  id: string;
  cat: string;
  reg: string;
  lg: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  status: string;
  sportKey?: string;
  pick?: string;
  pickLabel?: string;
  confidence?: number;
  confidenceLevel?: string;
  onRemove?: (id: string) => void;
}

/** Sports that use cumulative scores (goals, points, runs) */
const SCORING_SPORTS = new Set([
  'soccer',
  'basketball',
  'americanfootball',
  'baseball',
  'icehockey',
  'rugbyleague',
  'rugbyunion',
  'aussierules',
  'handball',
  'volleyball',
  'cricket',
  'lacrosse',
]);

/** Whether this sport key uses scores vs sets/rounds */
function isScoringSport(sportKey?: string): boolean {
  if (!sportKey) return true;
  return SCORING_SPORTS.has(sportKey.split('_')[0].toLowerCase());
}

@Component({
  selector: 'sp-live-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lr">
      <span class="lr__cat">{{ data().cat }}</span>
      <span class="lr__lg">{{ data().lg || '\u2014' }}</span>
      <span class="lr__teams">
        <span class="lr__home">{{ data().home }}</span>
        @if (hasScores()) {
          <span class="lr__score">{{ data().homeScore ?? 0 }} - {{ data().awayScore ?? 0 }}</span>
        } @else {
          <span class="lr__vs">vs</span>
        }
        <span class="lr__away">{{ data().away }}</span>
      </span>
      <span class="lr__min">{{ formatMinute(data()) }}</span>
      @if (data().pick) {
        <span class="lr__pick" [class]="'pk-' + data().pick">{{ data().pickLabel }}</span>
      }
      @if (data().confidenceLevel) {
        <span class="lr__conf" [class]="data().confidenceLevel">{{ (data().confidence! * 100).toFixed(0) }}%</span>
      }
      @if (data().onRemove) {
        <button class="lr__rm" (click)="data().onRemove!(data().id)">&times;</button>
      }
    </div>
  `,
  styles: [`
    .lr{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--color-border-subtle)}
    .lr:last-child{border-bottom:none}
    .lr__cat{font-family:var(--font-family);font-size:0.5625rem;color:var(--color-text-muted);min-width:70px;text-transform:uppercase;letter-spacing:0.04em}
    .lr__lg{font-family:var(--font-family);font-size:0.625rem;color:var(--color-text-secondary);min-width:100px}
    .lr__teams{font-family:var(--font-family);font-size:0.75rem;color:var(--color-text-primary);flex:1;display:flex;align-items:center;gap:4px}
    .lr__home,.lr__away{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}
    .lr__score{font-weight:700;color:var(--color-accent);margin:0 4px;white-space:nowrap}
    .lr__vs{color:var(--color-text-muted);font-size:0.625rem;margin:0 4px}
    .lr__min{font-family:var(--font-family);font-size:0.75rem;font-weight:700;color:#ef4444;min-width:35px;text-align:right;white-space:nowrap}
    .lr__pick{font-family:var(--font-family);font-size:0.625rem;font-weight:600;padding:2px 6px;border-radius:2px;white-space:nowrap}
    .pk-h{color:#3b82f6;background:rgba(59,130,246,0.1)}.pk-a{color:#a78bfa;background:rgba(167,139,250,0.1)}.pk-d{color:#fbbf24;background:rgba(251,191,36,0.1)}
    .lr__conf{font-family:var(--font-family);font-size:0.5625rem;font-weight:700;min-width:30px;text-align:right}
    .lr__conf.high{color:var(--color-confidence-high)}.lr__conf.medium{color:var(--color-confidence-medium)}.lr__conf.low{color:var(--color-confidence-low)}
    .lr__rm{font-family:var(--font-family);font-size:0.875rem;font-weight:700;width:24px;height:24px;display:grid;place-items:center;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);border-radius:var(--radius-xs);cursor:pointer;transition:all 0.2s;flex-shrink:0}
    .lr__rm:hover{border-color:var(--color-danger);color:var(--color-danger)}
  `]
})
export class LiveCardComponent {
  data = input.required<LiveCardData>();

  hasScores(): boolean {
    return isScoringSport(this.data().sportKey);
  }

  formatMinute(d: LiveCardData): string {
    // Use sport-aware formatter if sportKey is available
    if (d.sportKey) {
      return formatSportMinute(d.sportKey, d.minute ?? 0, d.status);
    }
    // Fallback: soccer-style formatting for backward compatibility
    const mn = d.minute;
    const st = d.status;
    if (mn === null || mn === undefined) return '';
    if (st === 'FT') return 'FT';
    if (st === 'HT') return 'HT';
    if (mn > 90) return `90+${mn - 90}'`;
    return `${mn}'`;
  }
}
