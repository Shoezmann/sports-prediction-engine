import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'sp-action-cell',
  standalone: true,
  template: `
    @if (params?.context?.authService?.isAuthenticated) {
      <button class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; height: 32px; min-height: 32px; display: inline-flex; align-items: center; gap: 4px;" 
              [disabled]="params?.context?.isInSlip(params?.data?.id)"
              (click)="onClick()">
        <span class="material-symbols-rounded" style="font-size: 14px;">{{ params?.context?.isInSlip(params?.data?.id) ? 'check' : 'add' }}</span>
        {{ params?.context?.isInSlip(params?.data?.id) ? 'In Slip' : 'Add to Slip' }}
      </button>
    } @else {
      <button class="btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; height: 32px; min-height: 32px; display: inline-flex; align-items: center;" (click)="onLoginClick()">
        Login to Add
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
    if (this.params?.data) {
      this.params?.context?.addToSlip(this.params?.data);
    }
  }

  onLoginClick() {
    this.params?.context?.goToLogin();
  }
}
