import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sp-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader">
      <span class="spin"></span>
      <p>{{ label() }}</p>
    </div>
  `,
  styles: [`
    .loader{display:flex;flex-direction:column;align-items:center;gap:12px;padding:60px 20px;text-align:center}
    .spin{width:32px;height:32px;border:3px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loader p{color:var(--color-text-muted);font-family:var(--font-family);font-size:0.8125rem;margin:0}
  `],
})
export class LoadingSpinnerComponent {
  label = input('Loading...');
}
