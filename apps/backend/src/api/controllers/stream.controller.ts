import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable, interval, map } from 'rxjs';
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
        return interval(15_000).pipe(
            map(() => ({
                data: { type: 'heartbeat', timestamp: new Date().toISOString() },
            } as MessageEvent)),
        );
    }
}
