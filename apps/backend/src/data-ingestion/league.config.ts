/**
 * Tournament & League Configuration
 *
 * Phase 1: Core leagues + Big tournaments
 * Phase 2: Add more leagues, cups, international tournaments
 * Phase 3: Player stats, manager profiles, expert reports
 */

export interface LeagueConfig {
    key: string;
    name: string;
    country: string;
    sport: 'soccer' | 'rugby' | 'tennis' | 'basketball';
    category: 'THREE_WAY' | 'TWO_WAY' | 'HEAD_TO_HEAD';
    priority: 'core' | 'major' | 'cup' | 'international';
    espnEndpoint?: string;
    footballDataId?: string;
}

export const ALL_LEAGUES: LeagueConfig[] = [
    // ═══════════════════════════════════════════════════════
    //  SOCCER — Core Leagues (Phase 1)
    // ═══════════════════════════════════════════════════════
    { key: 'soccer_epl', name: 'Premier League', country: 'England', sport: 'soccer', category: 'THREE_WAY', priority: 'core', espnEndpoint: 'soccer/eng.1/teams', footballDataId: 'PL' },
    { key: 'soccer_spain_la_liga', name: 'La Liga', country: 'Spain', sport: 'soccer', category: 'THREE_WAY', priority: 'core', espnEndpoint: 'soccer/esp.1/teams', footballDataId: 'PD' },
    { key: 'soccer_italy_serie_a', name: 'Serie A', country: 'Italy', sport: 'soccer', category: 'THREE_WAY', priority: 'core', espnEndpoint: 'soccer/ita.1/teams', footballDataId: 'SA' },
    { key: 'soccer_france_ligue_one', name: 'Ligue 1', country: 'France', sport: 'soccer', category: 'THREE_WAY', priority: 'core', espnEndpoint: 'soccer/fra.1/teams', footballDataId: 'FL1' },
    { key: 'soccer_germany_bundesliga', name: 'Bundesliga', country: 'Germany', sport: 'soccer', category: 'THREE_WAY', priority: 'core', espnEndpoint: 'soccer/ger.1/teams', footballDataId: 'BL1' },
    { key: 'soccer_netherlands_eredivisie', name: 'Eredivisie', country: 'Netherlands', sport: 'soccer', category: 'THREE_WAY', priority: 'core', espnEndpoint: 'soccer/ned.1/teams', footballDataId: 'DED' },
    { key: 'soccer_brazil_campeonato', name: 'Brasileirão', country: 'Brazil', sport: 'soccer', category: 'THREE_WAY', priority: 'core', espnEndpoint: 'soccer/bra.1/teams' },
    { key: 'soccer_south_africa_psl', name: 'PSL', country: 'South Africa', sport: 'soccer', category: 'THREE_WAY', priority: 'core', espnEndpoint: 'soccer/rsa.1/teams' },

    // ═══════════════════════════════════════════════════════
    //  SOCCER — European Cups (Phase 1)
    // ═══════════════════════════════════════════════════════
    { key: 'soccer_uefa_champions_league', name: 'Champions League', country: 'Europe', sport: 'soccer', category: 'THREE_WAY', priority: 'cup', espnEndpoint: 'soccer/uefa.champions/teams', footballDataId: 'CL' },
    { key: 'soccer_uefa_europa_league', name: 'Europa League', country: 'Europe', sport: 'soccer', category: 'THREE_WAY', priority: 'cup', espnEndpoint: 'soccer/uefa.europa/teams', footballDataId: 'EL' },
    { key: 'soccar_uefa_conference_league', name: 'Conference League', country: 'Europe', sport: 'soccer', category: 'THREE_WAY', priority: 'cup', espnEndpoint: 'soccer/uefa.europa.conf/teams', footballDataId: 'EC' },

    // ═══════════════════════════════════════════════════════
    //  SOCCER — More Leagues (Phase 2)
    // ═══════════════════════════════════════════════════════
    { key: 'soccer_efl_champ', name: 'EFL Championship', country: 'England', sport: 'soccer', category: 'THREE_WAY', priority: 'major', espnEndpoint: 'soccer/eng.2/teams', footballDataId: 'ELC' },
    { key: 'soccer_argentina_primera_division', name: 'Liga Profesional', country: 'Argentina', sport: 'soccer', category: 'THREE_WAY', priority: 'major', espnEndpoint: 'soccer/arg.1/teams' },
    { key: 'soccer_mexico_ligamx', name: 'Liga MX', country: 'Mexico', sport: 'soccer', category: 'THREE_WAY', priority: 'major', espnEndpoint: 'soccer/mex.1/teams' },
    { key: 'soccer_usa_mls', name: 'MLS', country: 'USA', sport: 'soccer', category: 'THREE_WAY', priority: 'major', espnEndpoint: 'soccer/usa.1/teams' },
    { key: 'soccer_portugal_primeira_liga', name: 'Primeira Liga', country: 'Portugal', sport: 'soccer', category: 'THREE_WAY', priority: 'major', footballDataId: 'PPL' },
    { key: 'soccer_belgium_first_div', name: 'Pro League', country: 'Belgium', sport: 'soccer', category: 'THREE_WAY', priority: 'major', footballDataId: 'BSA' },
    { key: 'soccer_turkey_super_league', name: 'Süper Lig', country: 'Turkey', sport: 'soccer', category: 'THREE_WAY', priority: 'major', footballDataId: 'TSL' },
    { key: 'soccer_russia_premier_league', name: 'Premier League', country: 'Russia', sport: 'soccer', category: 'THREE_WAY', priority: 'major', footballDataId: 'RPL' },
    { key: 'soccer_scotland_premiership', name: 'Premiership', country: 'Scotland', sport: 'soccer', category: 'THREE_WAY', priority: 'major', footballDataId: 'SPL' },
    { key: 'soccer_austria_bundesliga', name: 'Bundesliga', country: 'Austria', sport: 'soccer', category: 'THREE_WAY', priority: 'major', footballDataId: 'AUT' },
    { key: 'soccer_switzerland_superleague', name: 'Super League', country: 'Switzerland', sport: 'soccer', category: 'THREE_WAY', priority: 'major', footballDataId: 'ASL' },
    { key: 'soccer_greece_super_league', name: 'Super League', country: 'Greece', sport: 'soccer', category: 'THREE_WAY', priority: 'major', footballDataId: 'GSL' },
    { key: 'soccer_poland_ekstraklasa', name: 'Ekstraklasa', country: 'Poland', sport: 'soccer', category: 'THREE_WAY', priority: 'major', footballDataId: 'Ekstraklasa' },

    // ═══════════════════════════════════════════════════════
    //  SOCCER — International Tournaments (Phase 2)
    // ═══════════════════════════════════════════════════════
    { key: 'soccer_fifa_world_cup', name: 'World Cup', country: 'International', sport: 'soccer', category: 'THREE_WAY', priority: 'international' },
    { key: 'soccer_fifa_world_cup_qualifiers_uefa', name: 'World Cup Qualifiers (UEFA)', country: 'Europe', sport: 'soccer', category: 'THREE_WAY', priority: 'international' },
    { key: 'soccer_africa_cup_of_nations', name: 'AFCON', country: 'Africa', sport: 'soccer', category: 'THREE_WAY', priority: 'international' },
    { key: 'soccer_conmebol_copa_america', name: 'Copa América', country: 'South America', sport: 'soccer', category: 'THREE_WAY', priority: 'international' },
    { key: 'soccer_uefa_euro_championship', name: 'European Championship', country: 'Europe', sport: 'soccer', category: 'THREE_WAY', priority: 'international' },

    // ═══════════════════════════════════════════════════════
    //  RUGBY (Phase 1)
    // ═══════════════════════════════════════════════════════
    { key: 'rugby_six_nations', name: 'Six Nations', country: 'Europe', sport: 'rugby', category: 'TWO_WAY', priority: 'major' },
    { key: 'rugby_nrl', name: 'NRL', country: 'Australia', sport: 'rugby', category: 'TWO_WAY', priority: 'core' },
    { key: 'rugby_championship', name: 'Rugby Championship', country: 'International', sport: 'rugby', category: 'TWO_WAY', priority: 'major' },
    { key: 'rugby_premiership', name: 'Premiership Rugby', country: 'England', sport: 'rugby', category: 'TWO_WAY', priority: 'major' },
    { key: 'rugby_top_14', name: 'Top 14', country: 'France', sport: 'rugby', category: 'TWO_WAY', priority: 'major' },
    { key: 'rugby_united_rugby_championship', name: 'United Rugby Championship', country: 'Multi', sport: 'rugby', category: 'TWO_WAY', priority: 'major' },

    // ═══════════════════════════════════════════════════════
    //  TENNIS (Phase 1)
    // ═══════════════════════════════════════════════════════
    { key: 'tennis_atp_masters', name: 'ATP Masters 1000', country: 'International', sport: 'tennis', category: 'HEAD_TO_HEAD', priority: 'major' },
    { key: 'tennis_wta_1000', name: 'WTA 1000', country: 'International', sport: 'tennis', category: 'HEAD_TO_HEAD', priority: 'major' },
    { key: 'tennis_grand_slams', name: 'Grand Slams', country: 'International', sport: 'tennis', category: 'HEAD_TO_HEAD', priority: 'international' },
    { key: 'tennis_atp_500', name: 'ATP 500', country: 'International', sport: 'tennis', category: 'HEAD_TO_HEAD', priority: 'major' },
    { key: 'tennis_wta_500', name: 'WTA 500', country: 'International', sport: 'tennis', category: 'HEAD_TO_HEAD', priority: 'major' },
    { key: 'tennis_atp_finals', name: 'ATP Finals', country: 'International', sport: 'tennis', category: 'HEAD_TO_HEAD', priority: 'major' },
    { key: 'tennis_wta_finals', name: 'WTA Finals', country: 'International', sport: 'tennis', category: 'HEAD_TO_HEAD', priority: 'major' },

    // ═══════════════════════════════════════════════════════
    //  BASKETBALL (Phase 2)
    // ═══════════════════════════════════════════════════════
    { key: 'basketball_nba', name: 'NBA', country: 'USA', sport: 'basketball', category: 'TWO_WAY', priority: 'major', espnEndpoint: 'basketball/nba/teams' },
    { key: 'basketball_euroleague', name: 'EuroLeague', country: 'Europe', sport: 'basketball', category: 'TWO_WAY', priority: 'major' },
];

/** Leagues with ESPN team data */
export const ESPN_LEAGUES = ALL_LEAGUES.filter(l => l.espnEndpoint);

/** Leagues with Football-Data.org data */
export const FOOTBALL_DATA_LEAGUES = ALL_LEAGUES.filter(l => l.footballDataId);

/**
 * Extract ESPN scoreboard slug from espnEndpoint.
 * e.g. 'soccer/eng.1/teams' → 'soccer/eng.1'
 */
export function getEspnScoreboardSlug(league: LeagueConfig): string | null {
    if (!league.espnEndpoint) return null;
    // Remove trailing '/teams' to get the scoreboard path
    return league.espnEndpoint.replace(/\/teams$/, '');
}
