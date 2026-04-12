import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable, interval, merge, map } from 'rxjs';
import { PredictionStreamService } from '../../infrastructure/sse/prediction-stream.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('stream')
@Controller('api/stream')
export class StreamController {
    constructor(
        private readonly streamService: PredictionStreamService,
    ) { }

    @Sse('predictions')
    predictionsStream(): Observable<MessageEvent> {
        // Merge live broadcast messages with periodic heartbeats
        const broadcasts$ = this.streamService.message$.pipe(
            map((msg) => ({
                data: {
                    type: msg.event,
                    timestamp: new Date().toISOString(),
                    data: msg.data,
                },
            } as MessageEvent)),
        );

        const heartbeats$ = interval(15_000).pipe(
            map(() => ({
                data: { type: 'heartbeat', timestamp: new Date().toISOString() },
            } as MessageEvent)),
        );

        return merge(broadcasts$, heartbeats$);
    }
}
