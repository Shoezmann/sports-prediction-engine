import { Component, inject } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'sp-action-cell',
  standalone: true,
  template: `
    @if (params?.context?.isAuthenticated) {
      <button class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; height: 32px; min-height: 32px; display: inline-flex; align-items: center;" 
              [disabled]="params?.context?.placingBetFor === params?.data?.id"
              (click)="onClick()">
        {{ params?.context?.placingBetFor === params?.data?.id ? '...' : 'Simulate' }}
      </button>
    } @else {
      <button class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; height: 32px; min-height: 32px; display: inline-flex; align-items: center;" (click)="onLoginClick()">
        Login
      </button>
    }
  `
})
export class ActionCellComponent implements ICellRendererAngularComp {
  params: any;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    return true;
  }

  onClick() {
    this.params?.context?.placeBet(this.params?.data);
  }

  onLoginClick() {
    this.params?.context?.goToLogin();
  }
}
