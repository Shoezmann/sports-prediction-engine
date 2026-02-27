import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { BetsService } from '../../services/bets.service';
import { AuthService } from '../../services/auth.service';
import { BetDto } from '@sports-prediction-engine/shared-types';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-my-bets',
  standalone: true,
  imports: [CommonModule, AgGridAngular, RouterLink],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h1>My Bets</h1>
          <p class="subtitle">Track your predictions history and performance.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/" class="btn-secondary">Dashboard</a>
          <a routerLink="/predictions" class="btn-primary">New Predictions</a>
        </div>
      </header>

      <div class="content-wrapper">
        <div class="table-container" style="height: 600px;" *ngIf="!isLoading; else loadingState">
          <ag-grid-angular
            class="ag-theme-quartz-dark"
            style="width: 100%; height: 100%;"
            [rowData]="rowData"
            [columnDefs]="colDefs"
            [pagination]="true"
            [paginationPageSize]="10"
            [gridOptions]="gridOptions"
            (gridReady)="onGridReady($event)"
          >
          </ag-grid-angular>
        </div>

        <ng-template #loadingState>
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading your bets...</p>
          </div>
        </ng-template>
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

  rowData: BetDto[] = [];
  isLoading = true;

  gridOptions = {
    rowSelection: 'single' as const,
    domLayout: 'autoHeight' as const,
  };

  colDefs: ColDef[] = [
    { field: 'placedAt', headerName: 'Date', valueFormatter: params => new Date(params.value).toLocaleDateString(), width: 120 },
    { field: 'predictionId', headerName: 'Prediction ID', width: 200 },
    { field: 'stake', headerName: 'Stake ($)', width: 120 },
    { field: 'lockedOdds', headerName: 'Odds', width: 100 },
    { field: 'potentialPayout', headerName: 'To Win ($)', valueFormatter: params => params.value.toFixed(2), width: 130 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      cellRenderer: (params: any) => {
        const status = params.value.toLowerCase();
        let color = 'var(--color-warning)';
        if (status === 'won') color = 'var(--color-success)';
        if (status === 'lost') color = 'var(--color-danger, #ef4444)';
        return `<span style="color: ${color}; font-weight: bold; text-transform: uppercase;">${status}</span>`;
      }
    }
  ];

  ngOnInit() {
    this.loadBets();
  }

  loadBets() {
    const user = this.authService.currentUser();
    if (!user) return; // Guard should handle redirect

    this.isLoading = true;
    this.betsService.getUserBets(user.id).subscribe({
      next: (bets) => {
        this.rowData = bets;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load bets', err);
        this.isLoading = false;
      }
    });
  }

  onGridReady(params: any) {
    params.api.sizeColumnsToFit();
  }
}
