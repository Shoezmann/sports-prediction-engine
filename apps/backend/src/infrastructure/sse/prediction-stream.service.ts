import { Injectable, Logger } from '@nestjs/common';

/**
 * Prediction Stream Service
 *
 * Manages SSE connections and broadcasts prediction updates
 * to all connected clients. Used for real-time live match updates.
 */
export interface PredictionUpdate {
    type: 'predictions' | 'live_scores' | 'accuracy';
    timestamp: string;
    data: unknown;
}

@Injectable()
export class PredictionStreamService {
    private readonly logger = new Logger(PredictionStreamService.name);
    private clients: Map<string, { write: (data: string) => void; ping: () => void }> = new Map();
    private clientIdCounter = 0;

    /**
     * Register a new SSE client. Returns a cleanup function.
     */
    addClient(
        write: (data: string) => void,
        ping: () => void,
    ): () => void {
        const id = `client-${++this.clientIdCounter}`;
        this.clients.set(id, { write, ping });
        this.logger.log(`SSE client connected: ${id} (total: ${this.clients.size})`);

        // Send initial welcome message
        write(this.formatEvent('connected', { clientId: id, totalClients: this.clients.size }));

        return () => {
            this.clients.delete(id);
            this.logger.log(`SSE client disconnected: ${id} (total: ${this.clients.size})`);
        };
    }

    /**
     * Broadcast an event to all connected clients.
     */
    broadcast(event: string, data: unknown): void {
        const payload = this.formatEvent(event, data);
        let disconnected: string[] = [];

        for (const [id, client] of this.clients) {
            try {
                client.write(payload);
            } catch {
                disconnected.push(id);
            }
        }

        // Clean up dead connections
        for (const id of disconnected) {
            this.clients.delete(id);
        }

        if (disconnected.length > 0) {
            this.logger.debug(`Cleaned up ${disconnected.length} dead connections`);
        }
    }

    /**
     * Send periodic pings to keep connections alive.
     */
    pingAll(): void {
        for (const [, client] of this.clients) {
            try {
                client.ping();
            } catch {
                // Connection dead, will be cleaned up on next broadcast
            }
        }
    }

    getClientCount(): number {
        return this.clients.size;
    }

    private formatEvent(event: string, data: unknown): string {
        return `event: ${event}\ndata: ${JSON.stringify({
            type: event,
            timestamp: new Date().toISOString(),
            data,
        })}\n\n`;
    }
}
