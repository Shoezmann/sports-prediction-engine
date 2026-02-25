import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HealthResponse {
    status: string;
    timestamp: string;
    version: string;
}

export interface SyncResult {
    total?: number;
    active?: number;
    new?: number;
    synced?: number;
    sports?: number;
}

export interface PredictionResult {
    generated: number;
    skipped: number;
}

export interface ResultsUpdate {
    updated: number;
    predictionsResolved: number;
    eloUpdated: number;
}

export interface AccuracyBucket {
    total: number;
    correct: number;
    accuracy: number;
}

export interface AccuracyData {
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    byConfidenceLevel: {
        high: AccuracyBucket;
        medium: AccuracyBucket;
        low: AccuracyBucket;
    };
    byModel: {
        elo: number;
        form: number;
        oddsImplied: number;
        ensemble: number;
    };
    bySport: Record<string, AccuracyBucket>;
    bySportGroup: Record<string, AccuracyBucket>;
    last7Days: number;
    last30Days: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly baseUrl = '/api';

    constructor(private http: HttpClient) { }

    // ── Health ──
    getHealth(): Observable<HealthResponse> {
        return this.http.get<HealthResponse>(`${this.baseUrl}/health`);
    }

    // ── Sports ──
    syncSports(): Observable<SyncResult> {
        return this.http.post<SyncResult>(`${this.baseUrl}/sports/sync`, {});
    }

    // ── Games ──
    syncGames(sportKey?: string): Observable<SyncResult> {
        const params = sportKey ? `?sport=${sportKey}` : '';
        return this.http.post<SyncResult>(
            `${this.baseUrl}/games/sync${params}`,
            {},
        );
    }

    // ── Predictions ──
    generatePredictions(sportKey?: string): Observable<PredictionResult> {
        const params = sportKey ? `?sport=${sportKey}` : '';
        return this.http.post<PredictionResult>(
            `${this.baseUrl}/predictions/generate${params}`,
            {},
        );
    }

    // ── Results ──
    updateResults(): Observable<ResultsUpdate> {
        return this.http.post<ResultsUpdate>(
            `${this.baseUrl}/results/update`,
            {},
        );
    }

    // ── Accuracy ──
    getAccuracy(sportKey?: string): Observable<AccuracyData> {
        const params = sportKey ? `?sport=${sportKey}` : '';
        return this.http.get<AccuracyData>(
            `${this.baseUrl}/accuracy${params}`,
        );
    }
}
