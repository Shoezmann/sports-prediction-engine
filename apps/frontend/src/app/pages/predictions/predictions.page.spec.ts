import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PredictionsPage } from './predictions.page';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { BetsService } from '../../services/bets.service';
import { ToastService } from '../../components/toast/toast.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';

describe('PredictionsPage', () => {
  let component: PredictionsPage;
  let fixture: ComponentFixture<PredictionsPage>;
  let mockApiService: any;
  let mockAuthService: any;
  let mockBetsService: any;
  let mockToastService: any;

  beforeEach(async () => {
    mockApiService = {
      getPendingPredictions: jest.fn().mockReturnValue(of([]))
    };
    mockAuthService = {
      user: signal(null)
    };
    mockBetsService = {
      betSlipPredictions: signal([]),
      addToSlip: jest.fn(),
      removeFromSlip: jest.fn()
    };
    mockToastService = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PredictionsPage],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: BetsService, useValue: mockBetsService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PredictionsPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch predictions on init', () => {
    fixture.detectChanges();
    expect(mockApiService.getPendingPredictions).toHaveBeenCalled();
  });

  it('should filter predictions by category', () => {
    const mockPredictions = [
      { id: '1', game: { sportKey: 'soccer_epl', homeTeam: { name: 'A' }, awayTeam: { name: 'B' }, commenceTime: new Date().toISOString() }, probabilities: { homeWin: 0.5, awayWin: 0.3, draw: 0.2 }, confidenceLevel: 'high' },
      { id: '2', game: { sportKey: 'basketball_nba', homeTeam: { name: 'C' }, awayTeam: { name: 'D' }, commenceTime: new Date().toISOString() }, probabilities: { homeWin: 0.6, awayWin: 0.4 }, confidenceLevel: 'medium' }
    ];
    mockApiService.getPendingPredictions.mockReturnValue(of(mockPredictions));
    
    fixture.detectChanges();
    
    component.onCat('SOCCER');
    fixture.detectChanges();
    
    expect(component.filt().length).toBe(1);
    expect(component.filt()[0].cat).toBe('SOCCER');
  });

  it('should clear filters', () => {
    component.onCat('SOCCER');
    component.clr();
    expect(component.sc()).toBeNull();
  });
});
