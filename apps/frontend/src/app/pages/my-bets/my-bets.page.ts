import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ModuleRegistry, AllCommunityModule, themeQuartz, colorSchemeDark } from 'ag-grid-community';
import { BetsService } from '../../services/bets.service';
import { AuthService } from '../../services/auth.service';
import { BetDto } from '@sports-prediction-engine/shared-types';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'sp-my-bets',
  standalone: true,
  imports: [CommonModule, AgGridAngular, RouterLink],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h1>My Tracker</h1>
          <p class="subtitle">Track your predictions history and performance.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/" class="btn-secondary">Dashboard</a>
          <a routerLink="/predictions" class="btn-primary">New Predictions</a>
        </div>
      </header>

      <div class="content-wrapper">
        @if (!isLoading()) {
          <div class="table-container" style="height: 600px;">
            <ag-grid-angular
              [theme]="theme"
              style="width: 100%; height: 100%;"
              [rowData]="rowData()"
              [columnDefs]="colDefs"
              [pagination]="true"
              [paginationPageSize]="20"
              [gridOptions]="gridOptions"
              (gridReady)="onGridReady($event)"
            >
            </ag-grid-angular>
          </div>
        } @else {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading your tracker...</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      
      h1 {
        font-size: 2.5rem;
        font-weight: 800;
        margin-bottom: 0.5rem;
        background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      .subtitle {
        color: var(--color-text-secondary);
      }
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }



    .grid-container {
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid var(--color-border);
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      color: var(--color-text-secondary);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class MyBetsPage implements OnInit {
  private betsService = inject(BetsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  rowData = signal<BetDto[]>([]);
  isLoading = signal(true);
  theme = themeQuartz.withPart(colorSchemeDark);

  gridOptions = {
    rowSelection: 'single' as const,
    domLayout: 'autoHeight' as const,
  };

  colDefs: ColDef<BetDto>[] = [
    { field: 'placedAt', headerName: 'Date', valueFormatter: params => params.value ? new Date(params.value).toLocaleString() : '', width: 160 },
    { 
      headerName: 'Match', 
      valueGetter: params => params.data?.prediction ? `${params.data.prediction.game.homeTeam.name} vs ${params.data.prediction.game.awayTeam.name}` : params.data?.predictionId,
      width: 250 
    },
    { 
      headerName: 'Pick', 
      valueGetter: params => {
        if (!params.data?.prediction) return '-';
        const p = params.data.prediction;
        const outcome = p.predictedOutcome;
        return outcome === 'home_win' ? p.game.homeTeam.name : outcome === 'away_win' ? p.game.awayTeam.name : 'Draw';
      },
      width: 150
    },
    { field: 'bookmaker', headerName: 'Bookmaker', width: 140, valueFormatter: params => params.value || '-' },
    { field: 'lockedOdds', headerName: 'Odds', width: 100 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      cellRenderer: (params: { value: string }) => {
        const status = params.value.toLowerCase();
        let color = '#fbbf24'; // Warning amber
        const label = status;
        if (status === 'won') color = '#10b981'; // Success emerald
        if (status === 'lost') color = '#ef4444'; // Danger rose
        return `<span style="background: ${color}20; color: ${color}; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; border: 1px solid ${color}40;">${label}</span>`;
      }
    }
  ];

  ngOnInit() {
    this.loadBets();
  }

  loadBets() {
    const user = this.authService.currentUser();
    if (!user) {
      this.isLoading.set(false);
      this.router.navigate(['/login']);
      return; 
    }

    this.isLoading.set(true);
    this.betsService.getUserBets(user.id).subscribe({
      next: (bets) => {
        this.rowData.set(bets);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onGridReady(params: { api: any }) {
    params.api.sizeColumnsToFit();
  }
}
