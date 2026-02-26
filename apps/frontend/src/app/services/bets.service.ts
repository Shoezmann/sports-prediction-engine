import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BetDto, PlaceBetDto } from '@sports-prediction-engine/shared-types';

@Injectable({
    providedIn: 'root'
})
export class BetsService {
    private http = inject(HttpClient);
    private readonly API_URL = 'http://localhost:3000/api/bets';

    getUserBets(userId: string): Observable<BetDto[]> {
        return this.http.get<BetDto[]>(`${this.API_URL}?userId=${userId}`);
    }

    placeBet(userId: string, dto: PlaceBetDto): Observable<BetDto> {
        return this.http.post<BetDto>(`${this.API_URL}?userId=${userId}`, dto);
    }
}
