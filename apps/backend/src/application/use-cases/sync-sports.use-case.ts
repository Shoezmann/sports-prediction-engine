import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SportsDataPort, SportRepositoryPort } from '../../domain/ports/output';
import { SPORTS_DATA_PORT, SPORT_REPOSITORY_PORT } from '../../domain/ports/output';


/**
 * Use Case: Sync Sports
 *
 * Fetches the latest sport list from The Odds API and updates
 * the local database with active/inactive status changes.
 */
@Injectable()
export class SyncSportsUseCase {
    private readonly logger = new Logger(SyncSportsUseCase.name);

    constructor(
        @Inject(SPORTS_DATA_PORT)
        private readonly sportsData: SportsDataPort,
        @Inject(SPORT_REPOSITORY_PORT)
        private readonly sportRepo: SportRepositoryPort,
    ) { }

    async execute(): Promise<{ total: number; active: number; new: number }> {
        this.logger.log('Syncing sports from The Odds API...');

        // Fetch all sports (free endpoint — no quota cost)
        const apiSports = await this.sportsData.fetchSports();

        // Get existing sports from DB
        const existingSports = await this.sportRepo.findAll();
        const existingKeys = new Set(existingSports.map((s) => s.key));

        // Upsert all sports
        let newCount = 0;
        for (const sport of apiSports) {
            if (!existingKeys.has(sport.key)) {
                newCount++;
            }
        }

        await this.sportRepo.saveMany(apiSports);

        // Filter to only useful leagues with betting value
        const ALLOWED_KEYS = new Set([
            // Top tier soccer (quality leagues with good data)
            'soccer_epl',
            'soccer_efl_champ',
            'soccer_england_league1',
            'soccer_england_league2',
            'soccer_fa_cup',
            'soccer_england_efl_cup',
            'soccer_spain_la_liga',
            'soccer_spain_segunda_division',
            'soccer_spain_copa_del_rey',
            'soccer_germany_bundesliga',
            'soccer_germany_bundesliga2',
            'soccer_germany_liga3',
            'soccer_germany_dfb_pokal',
            'soccer_italy_serie_a',
            'soccer_italy_serie_b',
            'soccer_italy_coppa_italia',
            'soccer_france_ligue_one',
            'soccer_france_ligue_two',
            'soccer_france_coupe_de_france',
            'soccer_netherlands_eredivisie',
            'soccer_portugal_primeira_liga',
            'soccer_belgium_first_div',
            'soccer_turkey_super_league',
            'soccer_brazil_campeonato',
            'soccer_brazil_serie_b',
            'soccer_argentina_primera_division',
            'soccer_mexico_ligamx',
            'soccer_usa_mls',
            'soccer_australia_aleague',
            'soccer_japan_j_league',
            'soccer_korea_kleague1',
            'soccer_china_superleague',
            'soccer_saudi_arabia_pro_league',
            'soccer_south_africa_psl',
            'soccer_poland_ekstraklasa',
            'soccer_sweden_allsvenskan',
            'soccer_sweden_superettan',
            'soccer_norway_eliteserien',
            'soccer_denmark_superliga',
            'soccer_switzerland_superleague',
            'soccer_austria_bundesliga',
            'soccer_greece_super_league',
            'soccer_russia_premier_league',
            'soccer_finland_veikkausliiga',
            'soccer_league_of_ireland',
            'soccer_spl',
            'soccer_chile_campeonato',
            'soccer_uefa_champs_league',
            'soccer_uefa_europa_league',
            'soccer_uefa_europa_conference_league',
            'soccer_conmebol_copa_libertadores',
            'soccer_conmebol_copa_sudamericana',
            'soccer_fifa_world_cup',
            'soccer_fifa_world_cup_qualifiers_europe',
            'soccer_fifa_world_cup_qualifiers_south_america',
            'soccer_uefa_nations_league',
            'soccer_uefa_euro_qualification',
            'soccer_esoccer_gt_leagues_12',
            'soccer_esoccer_gt_leagues_10',
            'soccer_africa_cup_of_nations',
                        'soccer_concacaf_gold_cup',
            'soccer_concacaf_leagues_cup',
            // Basketball
            'basketball_nba',
            'basketball_euroleague',
            'basketball_ncaab',
            'basketball_wnba',
            'basketball_nbl',
            // Tennis
            'tennis_atp_french_open',
            'tennis_atp_wimbledon',
            'tennis_atp_us_open',
            'tennis_atp_australian_open',
            'tennis_atp_monte_carlo_masters',
            'tennis_atp_madrid_open',
            'tennis_atp_italian_open',
            'tennis_wta_french_open',
            'tennis_wta_wimbledon',
            'tennis_wta_us_open',
            'tennis_wta_australian_open',
            // American Football
            'americanfootball_nfl',
            'americanfootball_ncaaf',
            // Baseball
            'baseball_mlb',
            // Ice Hockey
            'icehockey_nhl',
            // MMA
            'mma_ufc',
            'mma_mixed_martial_arts',
            // Boxing
            'boxing_boxing',
            // Rugby
            'rugbyleague_nrl',
            'rugbyunion_six_nations',
        ]);

        const activeSports = apiSports.filter((s) => s.active && ALLOWED_KEYS.has(s.key));
        this.logger.log(
            `Sync complete: ${apiSports.length} total, ${activeSports.length} active (filtered), ${newCount} new`,
        );

        return {
            total: apiSports.length,
            active: activeSports.length,
            new: newCount,
        };
    }
}
