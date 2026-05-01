import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display label and value', () => {
    fixture.componentRef.setInput('label', 'Accuracy');
    fixture.componentRef.setInput('value', '75%');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.stat-card__label')?.textContent).toContain('Accuracy');
    expect(compiled.querySelector('.stat-card__value')?.textContent).toContain('75%');
  });

  it('should display trend if provided', () => {
    fixture.componentRef.setInput('label', 'Profit');
    fixture.componentRef.setInput('value', 'R500');
    fixture.componentRef.setInput('trend', 15);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const trendEl = compiled.querySelector('.stat-card__trend');
    expect(trendEl).toBeTruthy();
    expect(trendEl?.textContent).toContain('15%');
    expect(trendEl?.classList).toContain('stat-card__trend--up');
  });

  it('should display negative trend with correct class', () => {
    fixture.componentRef.setInput('label', 'Loss');
    fixture.componentRef.setInput('value', 'R200');
    fixture.componentRef.setInput('trend', -10);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const trendEl = compiled.querySelector('.stat-card__trend');
    expect(trendEl?.classList).toContain('stat-card__trend--down');
  });
});
