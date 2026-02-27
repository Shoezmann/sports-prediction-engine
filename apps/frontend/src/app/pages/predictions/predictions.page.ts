import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, AccuracyData } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { BetsService } from '../../services/bets.service';

@Component({
  selector: 'sp-predictions-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="predictions-page">
      <header class="page-header animate-in">
        <div>
          <h1 class="page-title">Predictions</h1>
          <p class="page-subtitle">AI-powered predictions across {{ sportCount() }} sports</p>
        </div>
        <button class="generate-btn" (click)="generatePredictions()" [disabled]="isGenerating()">
          <span class="material-symbols-rounded" style="vertical-align: sub; font-size: 20px;">bolt</span>
          {{ isGenerating() ? 'Generating...' : 'Generate Predictions' }}
        </button>
      </header>

      <!-- Accuracy Overview -->
      @if (accuracy()) {
        <section class="overview animate-in" style="animation-delay: 100ms">
          <div class="overview-card">
            <div class="overview-card__ring" [style.--progress]="accuracy()!.accuracy">
              <span class="overview-card__pct">{{ (accuracy()!.accuracy * 100).toFixed(1) }}%</span>
            </div>
            <div class="overview-card__info">
              <span class="overview-card__label">Overall Accuracy</span>
              <span class="overview-card__detail">
                {{ accuracy()!.correctPredictions }} / {{ accuracy()!.totalPredictions }} correct
              </span>
            </div>
          </div>

          <div class="model-grid">
            @for (model of models(); track model.name) {
              <div class="model-card">
                <span class="model-card__name">{{ model.name }}</span>
                <div class="model-card__bar">
                  <div class="model-card__fill" [style.width.%]="model.accuracy * 100" [style.background]="model.color"></div>
                </div>
                <span class="model-card__value">{{ (model.accuracy * 100).toFixed(1) }}%</span>
              </div>
            }
          </div>
        </section>
      }

      <!-- Upcoming Predictions -->
      @if (groupedPredictions().length > 0) {
        <section class="upcoming-predictions animate-in" style="animation-delay: 150ms">
          <div class="upcoming-header-row">
            <h2 class="section-title" style="margin-bottom: 0;">Upcoming Matches</h2>
            <div class="view-toggle">
              <button class="view-toggle__btn" [class.active]="viewMode() === 'grid'" (click)="viewMode.set('grid')" aria-label="Grid View">
                <span class="material-symbols-rounded" style="font-size: 20px;">grid_view</span>
              </button>
              <button class="view-toggle__btn" [class.active]="viewMode() === 'table'" (click)="viewMode.set('table')" aria-label="Table View">
                <span class="material-symbols-rounded" style="font-size: 20px;">table_rows</span>
              </button>
            </div>
          </div>
          
          <div class="date-tabs">
            @for (sportGroup of groupedPredictions(); track sportGroup.sport; let isFirst = $first) {
              <button class="date-tab" 
                      [class.active]="selectedSport() === sportGroup.sport || (selectedSport() === null && isFirst)"
                      (click)="selectedSport.set(sportGroup.sport)">
                {{ sportGroup.sport }}
              </button>
            }
          </div>

          @for (sportGroup of groupedPredictions(); track sportGroup.sport; let isFirst = $first) {
            @if (selectedSport() === sportGroup.sport || (selectedSport() === null && isFirst)) {
              <div class="upcoming-sport-group">
                @if (viewMode() === 'grid') {
                @for (countryGroup of sportGroup.countries; track countryGroup.country; let firstC = $first) {
                  <details class="country-section" [open]="firstC">
                    <summary class="country-heading">
                      {{ countryGroup.country }}
                      <span class="material-symbols-rounded chevron">expand_more</span>
                    </summary>
                    
                    <div class="country-content">
                      @for (leagueGroup of countryGroup.leagues; track leagueGroup.league; let firstL = $first) {
                        <details class="league-section" [open]="firstL">
                          <summary class="league-heading">
                            {{ leagueGroup.league }}
                            <span class="material-symbols-rounded chevron">expand_more</span>
                          </summary>
                          
                          <div class="upcoming-list">
                          @for (prediction of leagueGroup.items; track prediction.id) {
                            <div class="upcoming-card">
                              <div class="upcoming-card__header">
                                <span class="upcoming-card__sport">
                                  <span class="material-symbols-rounded" style="font-size: 16px; margin-right: 4px; vertical-align: text-bottom;">schedule</span>
                                  {{ prediction.commenceTime | date:'MMM d, h:mm a' }}
                                </span>
                              </div>
                              
                              <div class="upcoming-card__teams">
                                <span [class.text-muted]="prediction.predictedWinner === 'away_win'">{{ prediction.homeTeam.name }}</span>
                                <span class="upcoming-card__vs">vs</span>
                                <span [class.text-muted]="prediction.predictedWinner === 'home_win'">{{ prediction.awayTeam.name }}</span>
                              </div>

                              <div class="upcoming-card__prediction">
                                <div class="upcoming-card__winner" 
                                     [class.upcoming-card__winner--home]="prediction.predictedWinner === 'home_win'"
                                     [class.upcoming-card__winner--away]="prediction.predictedWinner === 'away_win'"
                                     [class.upcoming-card__winner--draw]="prediction.predictedWinner === 'draw'">
                                  Pick: {{ prediction.predictedWinner === 'home_win' ? prediction.homeTeam.name : prediction.predictedWinner === 'away_win' ? prediction.awayTeam.name : 'Draw' }}
                                </div>
                                <div class="upcoming-card__confidence" 
                                     [class.upcoming-card__confidence--high]="prediction.confidenceLevel === 'high'"
                                     [class.upcoming-card__confidence--medium]="prediction.confidenceLevel === 'medium'"
                                     [class.upcoming-card__confidence--low]="prediction.confidenceLevel === 'low'">
                                  <span style="text-transform: capitalize;">{{ prediction.confidenceLevel }}</span> Edge
                                  <span class="upcoming-card__win-prob">({{ (prediction.confidenceScore * 100).toFixed(0) }}%)</span>
                                </div>
                              </div>

                              @if (prediction.expectedValue !== null) {
                                <div class="upcoming-card__value-bet" [class.negative-ev]="prediction.expectedValue <= 0">
                                  <div class="value-badge" [class.negative-ev]="prediction.expectedValue <= 0">
                                    <span class="material-symbols-rounded">monetization_on</span>
                                    {{ prediction.expectedValue > 0 ? '+' : '' }}{{ (prediction.expectedValue * 100).toFixed(1) }}% EV
                                  </div>
                                  <div class="stake-badge">
                                    Stake: {{ (prediction.recommendedStake * 100).toFixed(1) }}%
                                  </div>
                                  <div class="odds-badge">
                                    Odds: {{ prediction.odds ? prediction.odds.toFixed(2) : '-' }}
                                  </div>
                                </div>
                                @if (prediction.sportKey && isBetwayCovered(prediction.sportKey)) {
                                  <div class="upcoming-card__sportsbooks" style="margin-top: 0.5rem;">
                                    <span class="badge" style="background: rgba(4, 120, 87, 0.1); border: 1px solid var(--color-success-subtle); color: var(--color-success); font-size: 0.65rem; padding: 2px 6px;">
                                      <span class="material-symbols-rounded" style="font-size: 14px; margin-right: 2px; vertical-align: middle;">verified</span> Covered by Betway
                                    </span>
                                  </div>
                                }
                              }

                              <!-- Confidence Bar -->
                              <div class="upcoming-card__bar-container">
                                <div class="upcoming-card__bar" 
                                     [class.bg-high]="prediction.confidenceLevel === 'high'"
                                     [class.bg-medium]="prediction.confidenceLevel === 'medium'"
                                     [class.bg-low]="prediction.confidenceLevel === 'low'"
                                     [style.width.%]="prediction.confidenceScore * 100"></div>
                              </div>
                              
                              <!-- Place Bet Action -->
                              <div class="upcoming-card__actions" style="margin-top: 1rem;">
                                @if (authService.isAuthenticated) {
                                  <button class="btn-primary" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 0.5rem;"
                                          [disabled]="placingBetFor() === prediction.id"
                                          (click)="placeBet(prediction)">
                                    <span class="material-symbols-rounded" style="font-size: 18px;">analytics</span>
                                    {{ placingBetFor() === prediction.id ? 'Simulating...' : 'Simulate Bet' }}
                                  </button>
                                } @else {
                                  <button class="btn-secondary" style="width: 100%; text-align: center; padding: 0.875rem;" (click)="goToLogin()">
                                    Login to Simulate Bets
                                  </button>
                                }
                              </div>
                            </div>
                          }
                          </div>
                        </details>
                      }
                    </div>
                  </details>
                }
                } @else {
                  <div class="table-container">
                    <table class="predictions-table">
                      <thead>
                        <tr>
                          <th>League</th>
                          <th>Match</th>
                          <th>Time</th>
                          <th>Pick</th>
                          <th>Edge</th>
                          <th>EV</th>
                          <th>Stake</th>
                          <th>Odds</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (prediction of flatPredictionsForSport(); track prediction.id) {
                          <tr>
                            <td class="text-secondary">{{ prediction._parsed.league }}</td>
                            <td>
                              <span [class.text-muted]="prediction.predictedWinner === 'away_win'">{{ prediction.homeTeam.name }}</span>
                              <span class="text-secondary mx-2">vs</span>
                              <span [class.text-muted]="prediction.predictedWinner === 'home_win'">{{ prediction.awayTeam.name }}</span>
                            </td>
                            <td>{{ prediction.commenceTime | date:'MMM d, h:mm a' }}</td>
                            <td style="font-weight: 600"
                                [class.text-success]="prediction.predictedWinner === 'home_win'"
                                [class.text-danger]="prediction.predictedWinner === 'away_win'">
                                {{ prediction.predictedWinner === 'home_win' ? prediction.homeTeam.name : prediction.predictedWinner === 'away_win' ? prediction.awayTeam.name : 'Draw' }}
                            </td>
                            <td>
                              <span class="badge" 
                                   [class.badge--success]="prediction.confidenceLevel === 'high'"
                                   [class.badge--warning]="prediction.confidenceLevel === 'medium'"
                                   [class.badge--danger]="prediction.confidenceLevel === 'low'">
                                <span style="text-transform: capitalize;">{{ prediction.confidenceLevel }}</span> ({{ (prediction.confidenceScore * 100).toFixed(0) }}%)
                              </span>
                            </td>
                            <td>
                              @if (prediction.expectedValue !== null) {
                                <span [class.text-success]="prediction.expectedValue > 0" [class.text-danger]="prediction.expectedValue <= 0">{{ prediction.expectedValue > 0 ? '+' : '' }}{{ (prediction.expectedValue * 100).toFixed(1) }}%</span>
                              } @else {
                                <span class="text-muted">-</span>
                              }
                            </td>
                            <td>
                              @if (prediction.recommendedStake !== null) {
                                {{ (prediction.recommendedStake * 100).toFixed(1) }}%
                              } @else {
                                <span class="text-muted">-</span>
                              }
                            </td>
                            <td>{{ prediction.odds ? prediction.odds.toFixed(2) : '-' }}</td>
                            <td>
                              @if (authService.isAuthenticated) {
                                <button class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" 
                                        [disabled]="placingBetFor() === prediction.id"
                                        (click)="placeBet(prediction)">
                                  {{ placingBetFor() === prediction.id ? '...' : 'Simulate' }}
                                </button>
                              } @else {
                                <button class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" (click)="goToLogin()">
                                  Login
                                </button>
                              }
                            </td>
                          </tr>
                        }
                        @if (flatPredictionsForSport().length === 0) {
                          <tr>
                            <td colspan="8" class="text-center text-muted" style="padding: 2rem;">No upcoming matches found for this sport.</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            }
          }
        </section>
      }

      <!-- Empty State -->
      @if (!accuracy() || accuracy()!.totalPredictions === 0 && groupedPredictions().length === 0) {
        <div class="empty-state animate-in" style="animation-delay: 200ms">
          <div class="empty-state__icon material-symbols-rounded" style="font-size: 48px;">sports_esports</div>
          <h2 class="empty-state__title">No predictions yet</h2>
          <p class="empty-state__message">
            Run the full pipeline from the Dashboard to sync sports data, fetch upcoming games, and generate your first predictions.
          </p>
          <a href="/" class="empty-state__cta">← Go to Dashboard</a>
        </div>
      }

      <!-- Sport-by-Sport Breakdown -->
      @if (sportBreakdown().length > 0) {
        <section class="sports-grid animate-in" style="animation-delay: 200ms">
          <h2 class="section-title">By Sport</h2>
          <div class="sport-cards">
            @for (sport of sportBreakdown(); track sport.key) {
              <div class="sport-card">
                <div class="sport-card__header">
                  <span class="sport-card__key">{{ sport.key }}</span>
                  <span class="sport-card__accuracy" [class]="getAccuracyClass(sport.accuracy)">
                    {{ (sport.accuracy * 100).toFixed(1) }}%
                  </span>
                </div>
                <div class="sport-card__bar">
                  <div class="sport-card__fill" [style.width.%]="sport.accuracy * 100"></div>
                </div>
                <span class="sport-card__detail">{{ sport.correct }}/{{ sport.total }} correct</span>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .predictions-page {
      max-width: 1280px;
      margin: 0 auto;
      padding: var(--spacing-xl);
      position: relative;
      z-index: 1;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-2xl);
    }

    .page-title {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .page-subtitle {
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
      margin-top: var(--spacing-xs);
    }

    .generate-btn {
      padding: 0.625rem 1.25rem;
      border-radius: var(--radius-md);
      border: none;
      cursor: pointer;
      font-family: var(--font-family);
      font-size: 0.875rem;
      font-weight: 600;
      background: var(--gradient-hero);
      color: white;
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: var(--shadow-glow);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    // Overview
    .overview {
      display: flex;
      gap: var(--spacing-xl);
      margin-bottom: var(--spacing-2xl);
      flex-wrap: wrap;
    }

    /* Upcoming Predictions */
    .date-tabs {
      display: flex;
      gap: var(--spacing-sm);
      overflow-x: auto;
      padding-bottom: var(--spacing-md);
      margin-bottom: var(--spacing-md);
      scrollbar-width: none;
      -ms-overflow-style: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .date-tab {
      padding: 0.5rem 1.25rem;
      border-radius: var(--radius-full);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-bg-card-hover);
        color: var(--color-text-primary);
      }

      &.active {
        background: var(--color-accent);
        border-color: var(--color-accent);
        color: white;
        box-shadow: var(--shadow-glow);
      }
    }

    .upcoming-date-group {
      animation: fadeInUp 0.3s ease-out;
    }

    .country-section {
      margin-bottom: var(--spacing-md);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      transition: border-color var(--transition-base);
    }
    .country-section:hover {
      border-color: rgba(255, 255, 255, 0.15);
    }
    .country-heading {
      font-size: 1.25rem;
      font-weight: 700;
      padding: var(--spacing-lg);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-text-primary);
      cursor: pointer;
      user-select: none;
      list-style: none; 
    }
    .country-heading::-webkit-details-marker {
      display: none;
    }
    .country-heading::before {
      content: '';
      display: block;
      width: 4px;
      height: 1.25rem;
      background: var(--color-accent);
      border-radius: 2px;
    }
    .country-heading .chevron {
      margin-left: auto;
      transition: transform var(--transition-base);
      color: var(--color-text-secondary);
    }
    details[open] > .country-heading .chevron {
      transform: rotate(180deg);
    }

    .country-content {
      padding: 0 var(--spacing-lg) var(--spacing-lg);
      animation: fadeInUp 0.3s ease-out forwards;
    }

    .league-section {
      margin-bottom: var(--spacing-md);
      background: var(--color-bg-elevated);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .league-section:last-child {
      margin-bottom: 0;
    }
    .league-heading {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      padding: var(--spacing-md);
      margin: 0;
      display: flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
      list-style: none;
    }
    .league-heading::-webkit-details-marker {
      display: none;
    }
    .league-heading .chevron {
      margin-left: auto;
      transition: transform var(--transition-base);
      color: var(--color-text-secondary);
    }
    details[open] > .league-heading .chevron {
      transform: rotate(180deg);
    }

    details[open] > .upcoming-list {
      padding: 0 var(--spacing-md) var(--spacing-md);
      animation: fadeInUp 0.3s ease-out forwards;
    }

    .upcoming-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-lg);
    }

    .view-toggle {
      display: flex;
      background: var(--color-bg-input);
      border-radius: var(--radius-md);
      padding: 4px;
      gap: 4px;
    }

    .view-toggle__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);
      
      &:hover {
        color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.05);
      }
      
      &.active {
        background: var(--color-bg-elevated);
        color: var(--color-accent);
        box-shadow: var(--shadow-sm);
      }
    }

    .table-container {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow-x: auto;
      animation: fadeInUp 0.3s ease-out forwards;
    }

    .predictions-table {
      width: 100%;
      min-width: 800px;
      border-collapse: collapse;
      text-align: left;
      
      th, td {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--color-border-subtle);
        font-size: 0.875rem;
      }
      
      th {
        color: var(--color-text-secondary);
        font-weight: 600;
        background: rgba(0, 0, 0, 0.2);
        white-space: nowrap;
      }
      
      td {
        vertical-align: middle;
      }
      
      tbody tr {
        transition: background-color var(--transition-fast);
        
        &:hover {
          background: var(--color-bg-card-hover);
        }
        
        &:last-child td {
          border-bottom: none;
        }
      }
    }

    .mx-2 {
      margin-left: 0.5rem;
      margin-right: 0.5rem;
    }

    .text-center {
      text-align: center;
    }

    .upcoming-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: var(--spacing-md);
    }

    .upcoming-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      transition: all var(--transition-base);
    }

    .upcoming-card:hover {
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .upcoming-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    .upcoming-card__sport {
      font-weight: 600;
      color: var(--color-accent);
      display: flex;
      align-items: center;
    }

    .upcoming-card__teams {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 1rem;
    }

    .upcoming-card__vs {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin: 0 var(--spacing-sm);
    }

    .upcoming-card__prediction {
      background: var(--color-bg-input);
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      padding: var(--spacing-sm) var(--spacing-md);
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
    }

    .upcoming-card__winner {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .upcoming-card__winner--home { color: #3b82f6; }
    .upcoming-card__winner--away { color: #8b5cf6; }
    .upcoming-card__winner--draw { color: #f59e0b; }

    .upcoming-card__confidence {
      font-size: 0.8125rem;
      font-weight: 700;
    }

    .upcoming-card__win-prob {
      font-weight: 500;
      opacity: 0.8;
      font-size: 0.75rem;
    }

    .upcoming-card__confidence--high { color: var(--color-confidence-high); }
    .upcoming-card__confidence--medium { color: var(--color-confidence-medium); }
    .upcoming-card__confidence--low { color: var(--color-confidence-low); }

    .upcoming-card__value-bet {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm) var(--spacing-md);
      background: rgba(16, 185, 129, 0.08); /* slight green tint */
      font-size: 0.75rem;
      font-weight: 600;

      &.negative-ev {
        background: rgba(239, 68, 68, 0.08);
      }
    }

    .value-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #10b981;

      &.negative-ev {
        color: #ef4444;
      }
    }

    .value-badge .material-symbols-rounded {
      font-size: 14px;
    }

    .stake-badge {
      color: var(--color-text-secondary);
    }

    .odds-badge {
      color: var(--color-accent);
    }

    .upcoming-card__bar-container {
      height: 4px;
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 0 0 var(--radius-md) var(--radius-md);
      overflow: hidden;
    }

    .upcoming-card__bar {
      height: 100%;
      border-radius: 0 0 var(--radius-md) var(--radius-md);
      transition: width 1s ease-out;
    }

    .bg-high { background: var(--color-confidence-high); }
    .bg-medium { background: var(--color-confidence-medium); }
    .bg-low { background: var(--color-confidence-low); }

    .overview-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-lg);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg) var(--spacing-xl);
      flex: 0 0 auto;
    }

    .overview-card__ring {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: conic-gradient(
        var(--color-accent) calc(var(--progress) * 360deg),
        var(--color-bg-input) calc(var(--progress) * 360deg)
      );
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        inset: 7px;
        border-radius: 50%;
        background: var(--color-bg-card);
      }
    }

    .overview-card__pct {
      position: relative;
      z-index: 1;
      font-size: 1rem;
      font-weight: 800;
    }

    .overview-card__info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .overview-card__label {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .overview-card__detail {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .model-grid {
      flex: 1;
      min-width: 300px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .model-card {
      display: grid;
      grid-template-columns: 100px 1fr 56px;
      align-items: center;
      gap: var(--spacing-md);
    }

    .model-card__name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }

    .model-card__bar {
      height: 6px;
      background: var(--color-bg-input);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .model-card__fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 1s ease-out;
    }

    .model-card__value {
      font-size: 0.8125rem;
      font-weight: 700;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    // Empty state
    .empty-state {
      text-align: center;
      padding: var(--spacing-3xl) var(--spacing-xl);
    }

    .empty-state__icon {
      font-size: 3rem;
      margin-bottom: var(--spacing-lg);
    }

    .empty-state__title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: var(--spacing-sm);
    }

    .empty-state__message {
      color: var(--color-text-secondary);
      max-width: 400px;
      margin: 0 auto var(--spacing-lg);
    }

    .empty-state__cta {
      color: var(--color-accent-hover);
      font-weight: 600;
    }

    // Sports grid
    .section-title {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: var(--spacing-lg);
    }

    .sport-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--spacing-md);
    }

    .sport-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      transition: all var(--transition-base);

      &:hover {
        transform: translateY(-1px);
        border-color: rgba(255, 255, 255, 0.1);
      }
    }

    .sport-card__header {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--spacing-md);
    }

    .sport-card__key {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .sport-card__accuracy {
      font-size: 0.875rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;

      &.accuracy-high { color: var(--color-confidence-high); }
      &.accuracy-medium { color: var(--color-confidence-medium); }
      &.accuracy-low { color: var(--color-confidence-low); }
    }

    .sport-card__bar {
      height: 4px;
      background: var(--color-bg-input);
      border-radius: var(--radius-full);
      margin-bottom: var(--spacing-sm);
      overflow: hidden;
    }

    .sport-card__fill {
      height: 100%;
      background: var(--gradient-hero);
      border-radius: var(--radius-full);
      transition: width 1s ease-out;
    }

    .sport-card__detail {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    // Tablet
    @media (max-width: 768px) {
      .predictions-page {
        padding: var(--spacing-md);
      }

      .page-header {
        flex-direction: column;
        gap: var(--spacing-md);
      }

      .generate-btn {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }

      .overview {
        flex-direction: column;
      }

      .model-grid {
        min-width: unset;
      }

      .sport-cards {
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      }

      .upcoming-list {
        grid-template-columns: 1fr;
      }
    }

    // Mobile
    @media (max-width: 480px) {
      .predictions-page {
        padding: var(--spacing-sm);
      }

      .page-title {
        font-size: 1.5rem;
      }

      .page-subtitle {
        font-size: 0.8125rem;
      }

      .overview-card {
        flex-direction: column;
        text-align: center;
        padding: var(--spacing-md);
      }

      .overview-card__ring {
        width: 64px;
        height: 64px;
      }

      .overview-card__info {
        align-items: center;
      }

      .model-card {
        grid-template-columns: 80px 1fr 48px;
        gap: var(--spacing-sm);
      }

      .model-card__name {
        font-size: 0.75rem;
      }

      .sport-cards {
        grid-template-columns: 1fr;
      }

      .sport-card {
        padding: var(--spacing-md);
      }

      .sport-card:hover {
        transform: none;
      }

      .empty-state {
        padding: var(--spacing-xl) var(--spacing-md);
      }

      .empty-state__icon {
        font-size: 2.5rem;
      }

      .empty-state__title {
        font-size: 1.25rem;
      }

      .empty-state__message {
        font-size: 0.875rem;
      }

      .upcoming-card {
        padding: var(--spacing-md);
      }

      .upcoming-card__teams {
        font-size: 0.875rem;
        flex-direction: column;
        gap: var(--spacing-xs);
        align-items: flex-start;
      }

      .upcoming-card__vs {
        display: none;
      }
    }
  `],
})
export class PredictionsPage implements OnInit {
  accuracy = signal<AccuracyData | null>(null);
  pendingPredictions = signal<any[]>([]);
  selectedSport = signal<string | null>(null);
  viewMode = signal<'grid' | 'table'>('grid');
  isGenerating = signal(false);
  sportCount = signal(0);
  placingBetFor = signal<string | null>(null);

  authService = inject(AuthService);
  private betsService = inject(BetsService);
  private router = inject(Router);

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.api.getAccuracy().subscribe({
      next: (data) => {
        this.accuracy.set(data);
        this.updateSportCount();
      },
    });

    this.api.getPendingPredictions().subscribe({
      next: (data) => {
        this.pendingPredictions.set(data);
        this.updateSportCount();
      }
    });
  }

  updateSportCount() {
    const accuracySports = this.accuracy() ? Object.keys(this.accuracy()!.bySport) : [];
    const pendingSports = this.pendingPredictions().map(p => p.sportKey);
    const unique = new Set([...accuracySports, ...pendingSports]);
    this.sportCount.set(unique.size);
  }

  parseSportKey(key: string) {
    const defaultMap = {
      'soccer_epl': { sport: 'Soccer', country: 'England', league: 'Premier League' },
      'soccer_germany_bundesliga': { sport: 'Soccer', country: 'Germany', league: 'Bundesliga' },
      'soccer_italy_serie_a': { sport: 'Soccer', country: 'Italy', league: 'Serie A' },
      'soccer_spain_la_liga': { sport: 'Soccer', country: 'Spain', league: 'La Liga' },
      'soccer_france_ligue_one': { sport: 'Soccer', country: 'France', league: 'Ligue 1' },
      'soccer_usa_mls': { sport: 'Soccer', country: 'USA', league: 'MLS' },
      'basketball_nba': { sport: 'Basketball', country: 'USA', league: 'NBA' },
      'americanfootball_nfl': { sport: 'American Football', country: 'USA', league: 'NFL' },
      'icehockey_nhl': { sport: 'Ice Hockey', country: 'USA/Canada', league: 'NHL' },
      'mma_mixed_martial_arts': { sport: 'MMA', country: 'Global', league: 'UFC/MMA' },
      'boxing_boxing': { sport: 'Boxing', country: 'Global', league: 'Pro Boxing' },
      'tennis_atp_wimbledon': { sport: 'Tennis', country: 'UK', league: 'ATP Wimbledon' },
      'tennis_wta_wimbledon': { sport: 'Tennis', country: 'UK', league: 'WTA Wimbledon' }
    } as any;
    if (defaultMap[key]) return defaultMap[key];

    const parts = key.split('_');
    const sportStr = parts[0];
    const countryStr = parts.length > 2 ? parts[1] : 'Global';
    const leagueStr = parts.slice(parts.length > 2 ? 2 : 1).join(' ');

    return {
      sport: sportStr.charAt(0).toUpperCase() + sportStr.slice(1),
      country: countryStr.charAt(0).toUpperCase() + countryStr.slice(1),
      league: leagueStr.toUpperCase()
    };
  }

  groupedPredictions = computed(() => {
    const list = this.pendingPredictions().filter(p => new Date(p.commenceTime) > new Date());

    // Structure: Sport -> Country -> League -> Items
    const groups: Record<string, Record<string, Record<string, any[]>>> = {};

    for (const p of list) {
      const parsed = this.parseSportKey(p.sportKey);

      if (!groups[parsed.sport]) groups[parsed.sport] = {};
      if (!groups[parsed.sport][parsed.country]) groups[parsed.sport][parsed.country] = {};
      if (!groups[parsed.sport][parsed.country][parsed.league]) groups[parsed.sport][parsed.country][parsed.league] = [];

      groups[parsed.sport][parsed.country][parsed.league].push(p);
    }

    // Convert to sorted arrays
    return Object.keys(groups).sort().map(sport => ({
      sport,
      countries: Object.keys(groups[sport]).sort().map(country => ({
        country,
        leagues: Object.keys(groups[sport][country]).sort().map(league => ({
          league,
          items: groups[sport][country][league].sort((a, b) => new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime())
        }))
      }))
    }));
  });

  flatPredictionsForSport = computed(() => {
    const sport = this.selectedSport();
    const list = this.pendingPredictions().filter(p => new Date(p.commenceTime) > new Date());

    // Sort array globally by time
    const sorted = list.map(p => ({ ...p, _parsed: this.parseSportKey(p.sportKey) }))
      .sort((a, b) => new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime());

    if (sport) {
      return sorted.filter(p => p._parsed.sport === sport);
    }

    // If no sport explicitly selected, return the first alphabetized sport's games
    if (sorted.length === 0) return [];

    const firstSport = this.groupedPredictions()[0]?.sport;
    return sorted.filter(p => p._parsed.sport === firstSport);
  });

  models() {
    const d = this.accuracy();
    if (!d) return [];
    return [
      { name: 'Ensemble', accuracy: d.byModel.ensemble, color: 'var(--gradient-hero)' },
      { name: 'Odds Implied', accuracy: d.byModel.oddsImplied, color: '#3b82f6' },
      { name: 'ELO', accuracy: d.byModel.elo, color: '#8b5cf6' },
      { name: 'Form', accuracy: d.byModel.form, color: '#f59e0b' },
    ];
  }

  sportBreakdown() {
    const d = this.accuracy();
    if (!d) return [];
    return Object.entries(d.bySport).map(([key, bucket]) => ({
      key,
      ...bucket,
    }));
  }

  getAccuracyClass(accuracy: number): string {
    if (accuracy >= 0.7) return 'accuracy-high';
    if (accuracy >= 0.55) return 'accuracy-medium';
    return 'accuracy-low';
  }

  generatePredictions() {
    this.isGenerating.set(true);
    this.api.generatePredictions().subscribe({
      next: () => {
        this.isGenerating.set(false);
        this.fetchData();
      },
      error: () => this.isGenerating.set(false),
    });
  }

  isBetwayCovered(sportKey: string): boolean {
    const betwaySports = [
      'soccer_epl',
      'soccer_italy_serie_a',
      'soccer_spain_la_liga',
      'soccer_germany_bundesliga',
      'soccer_france_ligue_one',
      'basketball_nba',
      'americanfootball_nfl',
      'mma_mixed_martial_arts',
      'tennis_atp_wimbledon',
      'tennis_wta_wimbledon'
    ];
    return betwaySports.includes(sportKey);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  placeBet(prediction: any) {
    if (!this.authService.isAuthenticated) {
      this.goToLogin();
      return;
    }

    const user = this.authService.currentUser();
    if (!user) return;

    this.placingBetFor.set(prediction.id);

    // Hardcode $10 stake for simple demo
    this.betsService.placeBet(user.id, {
      predictionId: prediction.id,
      stake: 10,
      customOdds: prediction.odds
    }).subscribe({
      next: () => {
        this.placingBetFor.set(null);
        alert('Simulation started! Track its success in the Tracker.');
      },
      error: (err) => {
        this.placingBetFor.set(null);
        alert(err.error?.message || 'Failed to simulate. Please try again.');
      }
    });
  }
}
