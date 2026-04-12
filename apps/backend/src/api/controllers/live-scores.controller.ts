import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LiveScoresService } from '../../infrastructure/live-scores/live-scores.service';

@ApiTags('live')
@Controller('api/live')
export class LiveScoresController {
    constructor(
        private readonly liveScoresService: LiveScoresService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get current live match scores with half indicators' })
    async getLiveMatches() {
        return {
            matches: await this.liveScoresService.getLiveMatches(),
            count: (await this.liveScoresService.getLiveMatches()).length,
        };
    }
}
