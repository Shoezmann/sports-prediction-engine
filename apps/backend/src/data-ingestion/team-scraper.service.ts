import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TeamEntity } from '../infrastructure/persistence/entities/team.orm-entity';

/** ESPN teams endpoint — free, no auth needed. */
const ESPN_ENDPOINTS: Record<string, string> = {
    soccer_epl: 'soccer/eng.1/teams',
    soccer_spain_la_liga: 'soccer/esp.1/teams',
    soccer_italy_serie_a: 'soccer/ita.1/teams',
    soccer_france_ligue_one: 'soccer/fra.1/teams',
    soccer_germany_bundesliga: 'soccer/ger.1/teams',
    soccer_netherlands_eredivisie: 'soccer/ned.1/teams',
    soccer_south_africa_psl: 'soccer/south-africa-premier-soccer-league/teams',
    soccer_brazil_campeonato: 'soccer/bra.1/teams',
};

/** Known duplicates: ESPN name → preferred name (our seeded name) */
const DUPLICATE_MAP: Record<string, string> = {
    // EPL
    'AFC Bournemouth': 'Bournemouth',
    'Brighton & Hove Albion': 'Brighton',
    'Tottenham Hotspur': 'Tottenham',
    'West Ham United': 'West Ham',
    'Wolverhampton Wanderers': 'Wolves',
    // La Liga
    'Athletic Club': 'Athletic Bilbao',
    'Atlético Madrid': 'Atletico Madrid',
    'Club Atletico de Madrid': 'Atletico Madrid',
    'FC Barcelona': 'Barcelona',
    'Real Madrid': 'Real Madrid',
    'Sevilla FC': 'Sevilla',
    'Valencia CF': 'Valencia',
    'Villarreal CF': 'Villarreal',
    // Serie A
    'AC Milan': 'Milan',
    'FC Internazionale Milano': 'Inter',
    'Internazionale': 'Inter',
    'SSC Napoli': 'Napoli',
    'AS Roma': 'Roma',
    'SS Lazio': 'Lazio',
    'ACF Fiorentina': 'Fiorentina',
    'Juventus': 'Juventus',
    'Atalanta': 'Atalanta',
    'Hellas Verona': 'Verona',
    'Bologna FC 1909': 'Bologna',
    'Cagliari Calcio': 'Cagliari',
    'Como 1907': 'Como',
    'Empoli FC': 'Empoli',
    'Genoa CFC': 'Genoa',
    'US Lecce': 'Lecce',
    'AC Monza': 'Monza',
    'Parma Calcio 1913': 'Parma',
    'US Sassuolo': 'Sassuolo',
    'Torino FC': 'Torino',
    'Udinese Calcio': 'Udinese',
    'US Cremonese': 'Cremonese',
    'AC Pisa': 'Pisa',
    // Ligue 1
    'Paris Saint-Germain': 'Paris Saint Germain',
    'Olympique de Marseille': 'Marseille',
    'Olympique Lyonnais': 'Lyon',
    'AS Monaco': 'Monaco',
    'LOSC Lille': 'Lille',
    'RC Lens': 'Lens',
    'Stade Rennais FC': 'Rennes',
    // Bundesliga
    'FC Bayern Munich': 'Bayern Munich',
    'Borussia Dortmund': 'Borussia Dortmund',
    'Bayer 04 Leverkusen': 'Bayer Leverkusen',
    'RB Leipzig': 'RB Leipzig',
    'Eintracht Frankfurt': 'Frankfurt',
    'VfB Stuttgart': 'Stuttgart',
    // Eredivisie
    'AFC Ajax': 'Ajax',
    'PSV': 'PSV',
    'Feyenoord': 'Feyenoord',
    'AZ': 'AZ Alkmaar',
    'Heracles Almelo': 'Heracles',
    'SC Heerenveen': 'Heerenveen',
    'FC Utrecht': 'FC Utrecht',
    'FC Twente': 'FC Twente',
    'FC Groningen': 'FC Groningen',
    'FC Volendam': 'FC Volendam',
    'PEC Zwolle': 'PEC Zwolle',
    'NEC': 'NEC Nijmegen',
    'Sparta Rotterdam': 'Sparta Rotterdam',
    'Fortuna Sittard': 'Fortuna Sittard',
    'Go Ahead Eagles': 'Go Ahead Eagles',
    'SBV Vitesse': 'Vitesse',
    'NAC Breda': 'NAC Breda',
    'Telstar': 'Telstar',
    'Excelsior': 'Excelsior',
    // Brasileirão
    'CR Flamengo': 'Flamengo',
    'SE Palmeiras': 'Palmeiras',
    'Sao Paulo': 'São Paulo',
    'Atletico Mineiro': 'Atlético Mineiro',
    'Atletico-MG': 'Atlético Mineiro',
    'SC Internacional': 'Internacional',
    'EC Bahia': 'Bahia',
    'Red Bull Bragantino': 'Bragantino',
    'Corinthians': 'Corinthians',
    'Cruzeiro': 'Cruzeiro',
    'Gremio': 'Grêmio',
    'Botafogo': 'Botafogo',
    'Santos': 'Santos',
    'Fluminense': 'Fluminense',
    'Fortaleza': 'Fortaleza',
    'Coritiba': 'Coritiba',
    'Cuiaba': 'Cuiabá',
    'EC Vitoria': 'Vitória',
    'CR Vasco da Gama': 'Vasco da Gama',
};

@Injectable()
export class TeamScraperService {
    private readonly logger = new Logger(TeamScraperService.name);
    private readonly ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports';

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(TeamEntity)
        private readonly teamRepo: Repository<TeamEntity>,
    ) { }

    async scrapeAndSync(): Promise<{ added: number; removed: number; deduped: number; total: number }> {
        let added = 0;
        let removed = 0;

        for (const [leagueKey, endpoint] of Object.entries(ESPN_ENDPOINTS)) {
            try {
                const teams = await this.scrapeESPN(endpoint);
                if (teams.length === 0) continue;

                const result = await this.syncLeague(leagueKey, teams);
                added += result.added;
                removed += result.removed;
                this.logger.log(`${leagueKey}: ${teams.length} teams (${result.added} added, ${result.removed} removed)`);
            } catch (error) {
                this.logger.warn(`${leagueKey} failed: ${error.message}`);
            }
        }

        // Deduplicate across all leagues
        const deduped = await this.deduplicate();

        const total = await this.teamRepo.count();
        this.logger.log(`Sync complete: ${total} teams (${added} added, ${removed} removed, ${deduped} deduped)`);
        return { added, removed, deduped, total };
    }

    private async scrapeESPN(endpoint: string): Promise<string[]> {
        const url = `${this.ESPN_URL}/${endpoint}`;
        const response = await firstValueFrom(
            this.httpService.get(url, { timeout: 10_000 }),
        );
        const data = response.data as any;
        const teams = data.sports?.[0]?.leagues?.[0]?.teams || [];
        return teams
            .map((e: any) => e.team?.name || e.team?.shortDisplayName || '')
            .filter((n: string) => n.length > 0);
    }

    private async syncLeague(leagueKey: string, scrapedNames: string[]) {
        const existing = await this.teamRepo.find({ where: { sportKey: leagueKey } });
        const existingNames = new Set(existing.map(t => t.name.toLowerCase()));
        const scrapedSet = new Set(
            scrapedNames.map(n => (DUPLICATE_MAP[n] || n).toLowerCase()),
        );

        let added = 0;
        for (const name of scrapedNames) {
            const preferred = DUPLICATE_MAP[name] || name;
            if (!existingNames.has(preferred.toLowerCase())) {
                await this.teamRepo.save({
                    id: uuidv4(),
                    name: preferred,
                    sportKey: leagueKey,
                    shortName: null,
                    eloRating: 1500,
                });
                added++;
                this.logger.debug(`  + ${preferred}`);
            }
        }

        let removed = 0;
        for (const team of existing) {
            if (!scrapedSet.has(team.name.toLowerCase())) {
                const hasData = await this.hasData(team.id);
                if (!hasData) {
                    await this.teamRepo.delete(team.id);
                    removed++;
                    this.logger.debug(`  - ${team.name}`);
                }
            }
        }

        return { added, removed };
    }

    /**
     * Find and remove duplicate teams.
     * Keeps the team with associated data (predictions/games), removes the other.
     */
    private async deduplicate(): Promise<number> {
        let count = 0;

        for (const [espnName, preferred] of Object.entries(DUPLICATE_MAP)) {
            // Find both versions in the same league
            const teams = await this.teamRepo.find({
                where: [{ name: espnName }, { name: preferred }],
            });

            if (teams.length < 2) continue;

            // Keep the one with data, remove the other
            for (const team of teams) {
                if (team.name === preferred) continue; // Always keep preferred
                const hasData = await this.hasData(team.id);
                if (!hasData) {
                    await this.teamRepo.delete(team.id);
                    count++;
                    this.logger.debug(`  dedup: removed "${team.name}" (kept "${preferred}")`);
                }
            }
        }

        return count;
    }

    private async hasData(teamId: string): Promise<boolean> {
        const result = await this.teamRepo.manager.query(
            `SELECT EXISTS(
                SELECT 1 FROM games g WHERE g.home_team_id = $1 OR g.away_team_id = $1
                UNION
                SELECT 1 FROM predictions p JOIN games g ON p.game_id = g.id
                WHERE g.home_team_id = $1 OR g.away_team_id = $1
            ) as has_data`,
            [teamId],
        );
        return result[0]?.has_data === true;
    }
}
