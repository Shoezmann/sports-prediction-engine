import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface EmptyStateProps {
  title: string;
  subtitle?: string;
  subtitle2?: string;
}

@Component({
  selector: 'sp-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty">
      <pre>{{ boxTop }}</pre>
      <p class="title">{{ data().title }}</p>
      @if (data().subtitle) { <p class="sub">{{ data().subtitle }}</p> }
      @if (data().subtitle2) { <p class="sub">{{ data().subtitle2 }}</p> }
      <pre>{{ boxBottom }}</pre>
    </div>
  `,
  styles: [`
    .empty{text-align:center;padding:64px 20px;display:flex;flex-direction:column;align-items:center;gap:4px}
    .empty pre{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);line-height:1.5;user-select:none}
    .title{font-family:var(--font-family);font-size:0.875rem;font-weight:700;color:var(--color-text-primary);letter-spacing:0.04em;margin:0}
    .sub{font-family:var(--font-family);font-size:0.6875rem;color:var(--color-text-muted);margin:0}
  `],
})
export class EmptyStateComponent {
  data = input.required<EmptyStateProps>();

  readonly boxTop = '\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510';
  readonly boxBottom = '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518';
}
