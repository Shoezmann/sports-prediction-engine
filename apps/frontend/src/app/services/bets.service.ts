import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BetDto, PlaceBetDto } from '@sports-prediction-engine/shared-types';

@Injectable({
    providedIn: 'root'
})
export class BetsService {
    private http = inject(HttpClient);
    private readonly API_URL = '/api/bets';
    
    // Global state for the active Bet Slip
    public betSlipPredictions = signal<any[]>(this.loadSlip());

    private loadSlip(): any[] {
        try {
            const saved = localStorage.getItem('bet_slip');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    }

    private saveSlip() {
        try { localStorage.setItem('bet_slip', JSON.stringify(this.betSlipPredictions())); } catch {}
    }

    getBets(): BetDto[] {
        // For now, return empty - bets are stored server-side and require auth
        return [];
    }

    getUserBets(userId: string): Observable<BetDto[]> {
        return this.http.get<BetDto[]>(`${this.API_URL}?userId=${userId}`);
    }

    placeBet(userId: string, dto: PlaceBetDto): Observable<BetDto> {
        return this.http.post<BetDto>(`${this.API_URL}?userId=${userId}`, dto);
    }

    addToSlip(prediction: any) {
        if (!this.betSlipPredictions().find(p => p.id === prediction.id)) {
            this.betSlipPredictions.update(curr => [...curr, prediction]);
            this.saveSlip();
        }
    }

    removeFromSlip(predictionId: string) {
        this.betSlipPredictions.update(curr => curr.filter(p => p.id !== predictionId));
        this.saveSlip();
    }

    clearSlip() {
        this.betSlipPredictions.set([]);
        this.saveSlip();
    }
}
