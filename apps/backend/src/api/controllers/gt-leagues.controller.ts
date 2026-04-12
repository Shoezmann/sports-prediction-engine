import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GTLeaguesService } from '../../infrastructure/gt-leagues/gt-leagues.service';

@ApiTags('gt-leagues')
@Controller('api/gt-leagues')
export class GTLeaguesController {
    constructor(
        private readonly gtLeaguesService: GTLeaguesService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get live and upcoming GT Leagues Esoccer matches' })
    async getMatches() {
        const matches = await this.gtLeaguesService.getMatches();
        return {
            matches,
            count: matches.length,
            live: matches.filter(m => m.status === '1H' || m.status === '2H').length,
            halfTime: matches.filter(m => m.status === 'HT').length,
        };
    }
}
