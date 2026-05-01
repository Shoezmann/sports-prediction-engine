import { Injectable, inject } from '@angular/core';
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
    updated?: number;
    rescheduled?: number;
}

export interface PredictionResult {
    generated: number;
    skipped: number;
}

export interface ResultsUpdate {
    updated: number;
    predictionsResolved: number;
    eloUpdated: number;
    postponed: number;
    skipped: number;
}

export interface AccuracyBucket {
    total: number;
    correct: number;
    accuracy: number;
}

export interface AccuracyData {
    totalPredictions: number;
    pendingPredictions: number;
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
        poisson?: number;
        h2h?: number;
        ml?: number;
        ensemble: number;
    };
    bySport: Record<string, AccuracyBucket>;
    bySportGroup: Record<string, AccuracyBucket>;
    last7Days: number;
    last30Days: number;
}

export interface LiveScoresResponse {
    matches: Array<{
        externalId: string;
        sportKey: string;
        sportTitle: string;
        league?: string;
        homeTeam: string;
        awayTeam: string;
        homeScore: number | null;
        awayScore: number | null;
        status: string;
        minute: number | null;
        commenceTime: string;
    }>;
    count: { live: number; total: number; bySport: Record<string, number> };
}

export interface PredictionsStats {
    total: number;
    resolved: number;
    pending: number;
    accuracy: number;
    last7Days: number;
    last30Days: number;
    byConfidence: Record<string, { total: number; correct: number; accuracy: number }>;
    bySport: Record<string, { total: number; correct: number; accuracy: number }>;
}

export interface PredictionsSummary {
    total: number;
    resolved: number;
    pending: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly baseUrl = '/api';

    private http = inject(HttpClient);

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

    getPendingPredictions(sportKey?: string): Observable<any[]> {
        const params = sportKey ? `?sport=${sportKey}` : '';
        return this.http.get<any[]>(
            `${this.baseUrl}/predictions/pending${params}`,
        );
    }

    getResolvedPredictions(sportKey?: string): Observable<any[]> {
        const params = sportKey ? `?sport=${sportKey}` : '';
        return this.http.get<any[]>(
            `${this.baseUrl}/predictions/resolved${params}`,
        );
    }

    getPredictionsStats(sportKey?: string): Observable<PredictionsStats> {
        const params = sportKey ? `?sport=${sportKey}` : '';
        return this.http.get<PredictionsStats>(
            `${this.baseUrl}/predictions/stats${params}`,
        );
    }

    getPredictionsSummary(): Observable<PredictionsSummary> {
        return this.http.get<PredictionsSummary>(
            `${this.baseUrl}/predictions/summary`,
        );
    }

    // ── Live Scores ──
    getLiveScores(): Observable<LiveScoresResponse> {
        return this.http.get<LiveScoresResponse>(`${this.baseUrl}/live-scores`);
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
