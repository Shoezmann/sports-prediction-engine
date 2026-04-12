import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface SSEMessage {
    event: string;
    data: unknown;
}

/**
 * Prediction Stream Service
 *
 * Manages SSE event broadcasting to all connected clients.
 * Used for real-time live match updates and prediction refreshes.
 */
@Injectable()
export class PredictionStreamService {
    private readonly logger = new Logger(PredictionStreamService.name);
    private messageSubject = new Subject<SSEMessage>();

    /**
     * Observable that emits all SSE messages.
     * The StreamController should subscribe to this.
     */
    get message$() {
        return this.messageSubject.asObservable();
    }

    /**
     * Broadcast an event to all connected SSE clients.
     */
    broadcast(event: string, data: unknown): void {
        this.messageSubject.next({ event, data });
        this.logger.debug(`Broadcast: ${event} (data: ${JSON.stringify(data).substring(0, 100)}...)`);
    }

    /**
     * Send initial connection message
     */
    sendConnected(): void {
        this.messageSubject.next({
            event: 'connected',
            data: { timestamp: new Date().toISOString() },
        });
    }
}
