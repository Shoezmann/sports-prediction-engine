import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccuracyChartComponent } from './accuracy-chart.component';
import { AccuracyData } from '../../services/api.service';

describe('AccuracyChartComponent', () => {
  let component: AccuracyChartComponent;
  let fixture: ComponentFixture<AccuracyChartComponent>;

  const mockData: AccuracyData = {
    accuracy: 0.75,
    totalPredictions: 100,
    pendingPredictions: 10,
    last7Days: 0.8,
    last30Days: 0.72,
    byModel: { ensemble: 0.75, elo: 0.7, form: 0.68, oddsImplied: 0.74 },
    byConfidenceLevel: {
      high: { accuracy: 0.85, total: 30 },
      medium: { accuracy: 0.7, total: 40 },
      low: { accuracy: 0.6, total: 30 }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccuracyChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AccuracyChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render accuracy bars when data is provided', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const barLabels = Array.from(compiled.querySelectorAll('.chart__bar-label')).map(el => el.textContent);
    expect(barLabels).toContain('Ensemble');
    expect(barLabels).toContain('ELO Model');
  });

  it('should render confidence buckets', () => {
    fixture.componentRef.setInput('data', mockData);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const buckets = compiled.querySelectorAll('.chart__bucket');
    expect(buckets.length).toBe(3);
    expect(buckets[0].textContent).toContain('High');
  });

  it('should show empty state when data is null', () => {
    fixture.componentRef.setInput('data', null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.chart__bar-row').length).toBe(0);
  });
});
