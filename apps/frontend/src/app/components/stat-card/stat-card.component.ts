import { Component, input } from '@angular/core';

@Component({
  selector: 'sp-stat-card',
  standalone: true,
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss'
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<string>();
  subtitle = input<string>();
  trend = input<number>();
  variant = input<'default' | 'accent'>('default');

  protected readonly Math = Math;
}
