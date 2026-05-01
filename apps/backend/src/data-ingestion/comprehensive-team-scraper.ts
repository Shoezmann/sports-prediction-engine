import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TeamEntity } from '../infrastructure/persistence/entities/team.orm-entity';
import { SportEntity } from '../infrastructure/persistence/entities/sport.orm-entity';
import { ALL_LEAGUES, ESPN_LEAGUES, FOOTBALL_DATA_LEAGUES, LeagueConfig } from './league.config';

/**
 * Known team name variants → canonical name
 * Prevents duplicates across sources
 */
const TEAM_ALIASES: Record<string, string> = {
    // EPL
    'AFC Bournemouth': 'Bournemouth',
    'Brighton & Hove Albion': 'Brighton',
    'Tottenham Hotspur': 'Tottenham',
    'West Ham United': 'West Ham',
    'Wolverhampton Wanderers': 'Wolves',
    'Manchester City': 'Manchester City',
    'Manchester United': 'Manchester United',
    'Newcastle United': 'Newcastle United',
    'Nottm Forest': 'Nottingham Forest',
    // La Liga
    'Athletic Club': 'Athletic Bilbao',
    'Atlético Madrid': 'Atletico Madrid',
    'Club Atletico de Madrid': 'Atletico Madrid',
    'FC Barcelona': 'Barcelona',
    'Real Madrid': 'Real Madrid',
    'Sevilla FC': 'Sevilla',
    'Valencia CF': 'Valencia',
    'Villarreal CF': 'Villarreal',
    'Deportivo Alavés': 'Alavés',
    'Girona FC': 'Girona',
    'Rayo Vallecano': 'Rayo Vallecano',
    'Real Betis Balompié': 'Real Betis',
    'Real Sociedad de Fútbol': 'Real Sociedad',
    'RCD Mallorca': 'Mallorca',
    'UD Las Palmas': 'Las Palmas',
    'CA Osasuna': 'Osasuna',
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
    // Ligue 1
    'Paris Saint-Germain': 'Paris Saint Germain',
    'Olympique de Marseille': 'Marseille',
    'Olympique Lyonnais': 'Lyon',
    'AS Monaco': 'Monaco',
    'LOSC Lille': 'Lille',
    'RC Lens': 'Lens',
    'Stade Rennais FC': 'Rennes',
    'OGC Nice': 'Nice',
    'RC Strasbourg Alsace': 'Strasbourg',
    'Stade de Reims': 'Reims',
    'Montpellier HSC': 'Montpellier',
    'FC Nantes': 'Nantes',
    'Toulouse FC': 'Toulouse',
    'FC Lorient': 'Lorient',
    'Le Havre AC': 'Le Havre',
    'AJ Auxerre': 'Auxerre',
    'Angers SCO': 'Angers',
    // Bundesliga
    'FC Bayern Munich': 'Bayern Munich',
    'Borussia Dortmund': 'Borussia Dortmund',
    'Bayer 04 Leverkusen': 'Bayer Leverkusen',
    'RB Leipzig': 'RB Leipzig',
    'Eintracht Frankfurt': 'Frankfurt',
    'VfB Stuttgart': 'Stuttgart',
    'SC Freiburg': 'Freiburg',
    '1. FC Union Berlin': 'Union Berlin',
    'Borussia Mönchengladbach': 'Mönchengladbach',
    'VfL Wolfsburg': 'Wolfsburg',
    'TSG 1899 Hoffenheim': 'Hoffenheim',
    'FC Augsburg': 'Augsburg',
    '1. FSV Mainz 05': 'Mainz 05',
    'SV Werder Bremen': 'Werder Bremen',
    '1. FC Heidenheim 1846': 'Heidenheim',
    'FC St. Pauli': 'St. Pauli',
    'Holstein Kiel': 'Holstein Kiel',
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
    'Willem II': 'Willem II',
    'RKC Waalwijk': 'RKC Waalwijk',
    'Almere City FC': 'Almere City',
    // Brasileirão
    'CR Flamengo': 'Flamengo',
    'SE Palmeiras': 'Palmeiras',
    'São Paulo FC': 'São Paulo',
    'Sao Paulo': 'São Paulo',
    'Atletico Mineiro': 'Atlético Mineiro',
    'Atletico-MG': 'Atlético Mineiro',
    'SC Internacional': 'Internacional',
    'EC Bahia': 'Bahia',
    'Red Bull Bragantino': 'Bragantino',
    'Corinthians': 'Corinthians',
    'Cruzeiro': 'Cruzeiro',
    'Grêmio': 'Grêmio',
    'Gremio': 'Grêmio',
    'Botafogo': 'Botafogo',
    'Santos': 'Santos',
    'Fluminense': 'Fluminense',
    'Fortaleza': 'Fortaleza',
    'Coritiba': 'Coritiba',
    'Cuiabá': 'Cuiabá',
    'Cuiaba': 'Cuiabá',
    'EC Vitória': 'Vitória',
    'Vitoria': 'Vitória',
    'CR Vasco da Gama': 'Vasco da Gama',
};

@Injectable()
export class ComprehensiveTeamScraper {
    private readonly logger = new Logger(ComprehensiveTeamScraper.name);
    private readonly ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports';
    private readonly FD_URL = 'https://api.football-data.org/v4';

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(TeamEntity)
        private readonly teamRepo: Repository<TeamEntity>,
        @InjectRepository(SportEntity)
        private readonly sportRepo: Repository<SportEntity>,
    ) { }

    /**
     * Full sync: fetch teams from ALL available sources
     * ESPN + Football-Data.org = maximum coverage
     */
    async syncAll(): Promise<{ added: number; removed: number; total: number; leagues: number }> {
        let added = 0;
        let removed = 0;
        let leaguesSynced = 0;

        // Phase 1: ESPN (free, no auth) — 8 leagues
        for (const league of ESPN_LEAGUES) {
            try {
                const teams = await this.fetchESPN(league.espnEndpoint!);
                if (teams.length > 0) {
                    const result = await this.syncLeague(league, teams);
                    added += result.added;
                    removed += result.removed;
                    leaguesSynced++;
                    this.logger.log(`ESPN ${league.name}: ${teams.length} teams (${result.added} new, ${result.removed} removed)`);
                }
            } catch (error) {
                this.logger.warn(`ESPN failed for ${league.name}: ${error.message}`);
            }
        }

        // Phase 2: Football-Data.org (free, 10 req/min) — 12 leagues + cups
        for (const league of FOOTBALL_DATA_LEAGUES) {
            try {
                const teams = await this.fetchFootballData(league.footballDataId!);
                if (teams.length > 0) {
                    const result = await this.syncLeague(league, teams);
                    added += result.added;
                    removed += result.removed;
                    leaguesSynced++;
                    this.logger.log(`FD.org ${league.name}: ${teams.length} teams (${result.added} new, ${result.removed} removed)`);
                }
            } catch (error) {
                this.logger.warn(`FD.org failed for ${league.name}: ${error.message}`);
            }
        }

        // Deduplicate
        const deduped = await this.deduplicate();

        const total = await this.teamRepo.count();
        this.logger.log(`Sync complete: ${total} teams, ${leaguesSynced} leagues, ${added} added, ${removed} removed, ${deduped} deduped`);
        return { added, removed, total, leagues: leaguesSynced };
    }

    /**
     * Fetch teams from ESPN API
     */
    private async fetchESPN(endpoint: string): Promise<string[]> {
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

    /**
     * Fetch teams from Football-Data.org
     * Covers: EPL, La Liga, Serie A, Ligue 1, Bundesliga, Eredivisie,
     *         Champions League, Europa League, Conference League, etc.
     */
    private async fetchFootballData(competitionId: string): Promise<string[]> {
        const url = `${this.FD_URL}/competitions/${competitionId}/teams`;
        const response = await firstValueFrom(
            this.httpService.get(url, {
                headers: { 'X-Auth-Token': 'demo' }, // Free tier works without key for some leagues
                timeout: 10_000,
            }),
        );
        const data = response.data as any;
        const teams = data.teams || [];
        return teams.map((t: any) => t.name || t.shortName || '').filter((n: string) => n.length > 0);
    }

    /**
     * Sync teams for a single league
     */
    private async syncLeague(
        league: LeagueConfig,
        scrapedNames: string[],
    ): Promise<{ added: number; removed: number }> {
        const existing = await this.teamRepo.find({ where: { sportKey: league.key } });
        const existingNames = new Set(existing.map(t => t.name.toLowerCase()));

        // Normalize scraped names
        const normalized = scrapedNames.map(n => this.normalize(n));
        const scrapedSet = new Set(normalized);

        let added = 0;
        for (const name of scrapedNames) {
            const canonical = this.resolveName(name);
            if (!existingNames.has(canonical.toLowerCase())) {
                await this.teamRepo.save({
                    id: uuidv4(),
                    name: canonical,
                    sportKey: league.key,
                    shortName: null,
                    eloRating: 1500,
                });
                added++;
                this.logger.debug(`  + ${canonical} (${league.name})`);
            }
        }

        // Remove teams no longer in league (only if no data)
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
     * Resolve team name to canonical form
     */
    private resolveName(name: string): string {
        return TEAM_ALIASES[name] || name;
    }

    /**
     * Normalize for comparison
     */
    private normalize(name: string): string {
        return this.resolveName(name).toLowerCase().trim();
    }

    /**
     * Remove duplicates
     */
    private async deduplicate(): Promise<number> {
        let count = 0;
        for (const [variant, canonical] of Object.entries(TEAM_ALIASES)) {
            const teams = await this.teamRepo.find({
                where: [{ name: variant }, { name: canonical }],
            });
            if (teams.length > 1) {
                for (const team of teams) {
                    if (team.name === canonical) continue;
                    const hasData = await this.hasData(team.id);
                    if (!hasData) {
                        await this.teamRepo.delete(team.id);
                        count++;
                    }
                }
            }
        }
        return count;
    }

    /**
     * Check if team has associated data
     */
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
