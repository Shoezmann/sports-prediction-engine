import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BetsService } from '../../services/bets.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'sp-bet-slip',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <aside class="bet-slip">
      <div class="bet-slip__header">
        <div class="bet-slip__title">
          <span class="material-symbols-rounded">receipt_long</span>
          Prediction Slip
        </div>
        <span class="bet-slip__count">{{ predictions().length }}</span>
      </div>

      <div class="bet-slip__tabs">
        <button class="tab-btn" [class.active]="tab() === 'single'" (click)="tab.set('single')">Singles</button>
        <button class="tab-btn" [class.active]="tab() === 'multi'" (click)="tab.set('multi')">Multi</button>
      </div>

      <div class="bet-slip__content">
        @if (predictions().length === 0) {
          <div class="bet-slip__empty">
            <span class="material-symbols-rounded" style="font-size: 32px; opacity: 0.5;">widgets</span>
            <p>Click odds on the predictions table to add them to your slip.</p>
          </div>
        } @else {
          <div class="bet-slip__items">
            @for (item of predictions(); track item.id; let i = $index) {
              <div class="slip-item">
                <div class="slip-item__header">
                  <span class="slip-item__league">{{ item._parsed?.league || item.sportKey }}</span>
                  <button class="slip-item__remove" (click)="removeItem(item.id)">
                    <span class="material-symbols-rounded">close</span>
                  </button>
                </div>
                <div class="slip-item__match">
                  {{ item.homeTeam?.name || 'Home' }} vs {{ item.awayTeam?.name || 'Away' }}
                </div>
                <div class="slip-item__pick">
                  Pick: <strong>{{ item.predictedWinner === 'home_win' ? item.homeTeam?.name : item.predictedWinner === 'away_win' ? item.awayTeam?.name : 'Draw' }}</strong>
                </div>

                <div class="slip-item__odds-row">
                  <span class="slip-item__pick-label">Odds:</span>
                  <div class="odds-box">{{ item.odds | number:'1.2-2' }}</div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Footer calculations -->
      @if (predictions().length > 0) {
        <div class="bet-slip__footer">
          <div class="bookmaker-group">
            <label for="bookmaker-select">Bookmaker / Platform (Optional)</label>
            <input id="bookmaker-select" type="text" class="bookmaker-input" placeholder="e.g. Betway, 10bets, etc." [(ngModel)]="bookmaker" />
          </div>

          @if (tab() === 'multi') {
            <div class="summary-row highlight">
              <span>Total Multi Odds</span>
              <strong>{{ multiOdds() | number:'1.2-2' }}</strong>
            </div>
          } @else {
            <div class="summary-row highlight">
              <span>Avg Odds</span>
              <strong>{{ avgOdds() | number:'1.2-2' }}</strong>
            </div>
          }

          @if (statusMessage()) {
            <div class="slip-toast" [class.slip-toast--error]="statusError()" [class.slip-toast--success]="!statusError()">
              <span class="material-symbols-rounded" style="font-size: 16px;">{{ statusError() ? 'error' : 'check_circle' }}</span>
              {{ statusMessage() }}
            </div>
          }

          <button class="btn-primary" style="width: 100%; margin-top: 0.75rem;" (click)="placeBets()" [disabled]="isSubmitting()">
            {{ isSubmitting() ? 'Processing...' : 'Save Slip' }}
          </button>
        </div>
      }
    </aside>
  `,
  styles: [`
    .bet-slip {
      background: rgba(20, 24, 34, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      height: 600px;
      position: sticky;
      top: var(--spacing-xl);
      overflow: hidden;
    }

    .bet-slip__header {
      padding: var(--spacing-md);
      background: rgba(0,0,0,0.5);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .bet-slip__title {
      font-weight: 600;
      color: var(--color-text);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .bet-slip__count {
      background: var(--gradient-neon);
      color: white;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .bet-slip__tabs {
      display: flex;
      background: rgba(0,0,0,0.3);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .tab-btn {
      flex: 1;
      padding: 0.75rem;
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-weight: 600;
      font-size: 0.875rem;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;

      &.active {
        color: white;
        border-bottom-color: #10b943;
      }
    }

    .bet-slip__content {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-md);
    }

    .bet-slip__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: var(--color-text-muted);
      gap: 1rem;
      padding: 2rem;
      font-size: 0.875rem;
    }

    .bet-slip__items {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .slip-item {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: var(--radius-md);
      padding: var(--spacing-sm);
    }

    .slip-item__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .slip-item__league {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .slip-item__remove {
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      display: flex;
      padding: 2px;
      
      &:hover { color: var(--color-danger); }
      span { font-size: 16px; }
    }

    .slip-item__match {
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
    }

    .slip-item__pick {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: 0.75rem;

      strong { color: var(--color-text); }
    }

    .slip-item__odds-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .odds-box {
      background: rgba(16, 185, 67, 0.1);
      color: #10b943;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      font-weight: 700;
      font-size: 0.875rem;
    }

    .slip-item__pick-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
    }

    .bookmaker-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
      
      label {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
      }
    }

    .bookmaker-input {
      background: rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--radius-sm);
      color: white;
      padding: 0.5rem;
      font-size: 0.875rem;
      font-family: inherit;
      width: 100%;

      &:focus { 
        outline: none; 
        border-color: #10b943;
      }
    }

    .bet-slip__footer {
      padding: var(--spacing-md);
      background: rgba(0,0,0,0.5);
      border-top: 1px solid rgba(255,255,255,0.05);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: 0.25rem;

      &.highlight {
        color: var(--color-text);
        font-size: 1rem;
        margin-top: 0.5rem;
        strong { color: #10b943; }
      }
    }

    .slip-toast {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 500;
      margin-top: 0.75rem;
      animation: fadeInUp 0.3s ease-out;

      &--success {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.15);
      }

      &--error {
        background: rgba(239, 68, 68, 0.1);
        color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.15);
      }
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class BetSlipComponent {
  betsService = inject(BetsService);
  authService = inject(AuthService);
  router = inject(Router);

  // We expose shared signal from BetsService so any component can push predictions to the slip
  predictions = this.betsService.betSlipPredictions;
  
  tab = signal<'single'|'multi'>('single');
  isSubmitting = signal(false);
  statusMessage = signal('');
  statusError = signal(false);

  bookmaker = signal<string>('');

  // Computed properties
  multiOdds = computed(() => {
    return this.predictions().reduce((acc, p) => acc * (p.odds || 1), 1);
  });

  avgOdds = computed(() => {
    const list = this.predictions();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, p) => acc + (p.odds || 1), 0);
    return sum / list.length;
  });

  removeItem(id: string) {
    this.betsService.removeFromSlip(id);
  }

  async placeBets() {
    this.isSubmitting.set(true);
    this.statusMessage.set('');
    try {
      const user = this.authService.currentUser();
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      const currentBookmaker = this.bookmaker() || undefined;

      const promises = this.predictions().map(p => {
        return this.betsService.placeBet(user.id, { predictionId: p.id, bookmaker: currentBookmaker }).toPromise();
      });
      await Promise.all(promises);

      this.showStatus('Slip saved. Track results on the My Tracker page.');

      this.betsService.clearSlip();
      this.bookmaker.set('');
    } catch {
      this.showStatus('Failed to save slip. Please try again.', true);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private showStatus(message: string, isError = false) {
    this.statusMessage.set(message);
    this.statusError.set(isError);
    setTimeout(() => this.statusMessage.set(''), 4000);
  }
}
