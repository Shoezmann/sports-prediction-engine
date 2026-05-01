/**
 * Team Seed Data
 *
 * Realistic ELO ratings for all teams in our target leagues.
 * Updated for 2025/26 seasons.
 */

export interface TeamSeed {
  name: string;
  shortName?: string;
  elo: number;
  leagueKey: string;
}

export const TEAM_SEEDS: TeamSeed[] = [
  // ═══════════════════════════════════════════════════════
  //  SOCCER — Premier League (England) 2025/26
  // ═══════════════════════════════════════════════════════
  { name: 'Arsenal', elo: 1890, leagueKey: 'soccer_epl' },
  { name: 'Aston Villa', elo: 1780, leagueKey: 'soccer_epl' },
  { name: 'Bournemouth', elo: 1630, leagueKey: 'soccer_epl' },
  { name: 'Brentford', elo: 1610, leagueKey: 'soccer_epl' },
  { name: 'Brighton', elo: 1670, leagueKey: 'soccer_epl' },
  { name: 'Chelsea', elo: 1740, leagueKey: 'soccer_epl' },
  { name: 'Crystal Palace', elo: 1620, leagueKey: 'soccer_epl' },
  { name: 'Everton', elo: 1590, leagueKey: 'soccer_epl' },
  { name: 'Fulham', elo: 1640, leagueKey: 'soccer_epl' },
  { name: 'Ipswich Town', elo: 1500, leagueKey: 'soccer_epl' },
  { name: 'Leeds United', elo: 1580, leagueKey: 'soccer_epl' },
  { name: 'Leicester City', elo: 1560, leagueKey: 'soccer_epl' },
  { name: 'Liverpool', elo: 1870, leagueKey: 'soccer_epl' },
  { name: 'Manchester City', elo: 1950, leagueKey: 'soccer_epl' },
  { name: 'Manchester United', elo: 1720, leagueKey: 'soccer_epl' },
  { name: 'Newcastle United', elo: 1730, leagueKey: 'soccer_epl' },
  { name: 'Nottingham Forest', elo: 1580, leagueKey: 'soccer_epl' },
  { name: 'Tottenham', elo: 1750, leagueKey: 'soccer_epl' },
  { name: 'West Ham', elo: 1680, leagueKey: 'soccer_epl' },
  { name: 'Wolves', elo: 1650, leagueKey: 'soccer_epl' },

  // ═══════════════════════════════════════════════════════
  //  SOCCER — La Liga (Spain) 2025/26
  // ═══════════════════════════════════════════════════════
  { name: 'Alavés', elo: 1530, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Athletic Bilbao', elo: 1690, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Atletico Madrid', elo: 1820, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Barcelona', elo: 1910, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Celta Vigo', elo: 1570, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Espanyol', elo: 1540, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Getafe', elo: 1600, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Girona', elo: 1660, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Las Palmas', elo: 1540, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Leganes', elo: 1510, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Mallorca', elo: 1560, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Osasuna', elo: 1590, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Rayo Vallecano', elo: 1550, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Real Betis', elo: 1680, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Real Madrid', elo: 1940, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Real Sociedad', elo: 1720, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Real Valladolid', elo: 1490, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Sevilla', elo: 1650, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Valencia', elo: 1630, leagueKey: 'soccer_spain_la_liga' },
  { name: 'Villarreal', elo: 1670, leagueKey: 'soccer_spain_la_liga' },

  // ═══════════════════════════════════════════════════════
  //  SOCCER — Ligue 1 (France) 2025/26
  // ═══════════════════════════════════════════════════════
  { name: 'Angers', elo: 1500, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Auxerre', elo: 1490, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Brest', elo: 1570, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Le Havre', elo: 1510, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Lens', elo: 1650, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Lille', elo: 1700, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Lyon', elo: 1680, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Marseille', elo: 1690, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Monaco', elo: 1720, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Montpellier', elo: 1560, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Nantes', elo: 1540, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Nice', elo: 1660, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Paris Saint Germain', elo: 1880, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Reims', elo: 1580, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Rennes', elo: 1640, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Saint-Etienne', elo: 1520, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Strasbourg', elo: 1590, leagueKey: 'soccer_france_ligue_one' },
  { name: 'Toulouse', elo: 1550, leagueKey: 'soccer_france_ligue_one' },

  // ═══════════════════════════════════════════════════════
  //  SOCCER — Serie A (Italy) 2025/26
  // ═══════════════════════════════════════════════════════
  { name: 'Atalanta', elo: 1740, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Bologna', elo: 1650, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Cagliari', elo: 1510, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Como', elo: 1490, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Empoli', elo: 1520, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Fiorentina', elo: 1660, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Genoa', elo: 1570, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Inter', elo: 1850, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Juventus', elo: 1760, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Lazio', elo: 1710, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Lecce', elo: 1530, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Milan', elo: 1780, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Monza', elo: 1580, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Napoli', elo: 1750, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Parma', elo: 1520, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Roma', elo: 1700, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Torino', elo: 1630, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Udinese', elo: 1560, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Venezia', elo: 1480, leagueKey: 'soccer_italy_serie_a' },
  { name: 'Verona', elo: 1500, leagueKey: 'soccer_italy_serie_a' },

  // ═══════════════════════════════════════════════════════
  //  SOCCER — PSL / Betway Premiership (South Africa) 2025/26
  // ═══════════════════════════════════════════════════════
  // 16 teams. Relegated: SuperSport United, Moroka Swallows.
  // Promoted: Magesi FC, Durban City.
  { name: 'AmaZulu', elo: 1540, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Cape Town City', elo: 1570, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Chippa United', elo: 1480, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Durban City', elo: 1460, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Golden Arrows', elo: 1510, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Kaizer Chiefs', elo: 1630, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Magesi FC', elo: 1450, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Mamelodi Sundowns', elo: 1800, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Marumo Gallants', elo: 1480, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Orlando Pirates', elo: 1650, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Polokwane City', elo: 1470, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Richards Bay', elo: 1490, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Royal AM', elo: 1500, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Sekhukhune United', elo: 1520, leagueKey: 'soccer_south_africa_psl' },
  { name: 'Stellenbosch', elo: 1580, leagueKey: 'soccer_south_africa_psl' },
  { name: 'TS Galaxy', elo: 1500, leagueKey: 'soccer_south_africa_psl' },

  // ═══════════════════════════════════════════════════════
  //  SOCCER — Bundesliga (Germany) 2025/26
  // ═══════════════════════════════════════════════════════
  { name: 'Bayern Munich', elo: 1920, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'Borussia Dortmund', elo: 1800, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'Bayer Leverkusen', elo: 1850, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'RB Leipzig', elo: 1770, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'VfB Stuttgart', elo: 1720, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'Eintracht Frankfurt', elo: 1700, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'SC Freiburg', elo: 1660, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'TSG Hoffenheim', elo: 1620, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'Union Berlin', elo: 1610, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'Wolfsburg', elo: 1630, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'Borussia Monchengladbach', elo: 1600, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'Werder Bremen', elo: 1590, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'Mainz 05', elo: 1570, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'FC Augsburg', elo: 1540, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'FC Heidenheim', elo: 1510, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'Bochum', elo: 1490, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'St Pauli', elo: 1500, leagueKey: 'soccer_germany_bundesliga' },
  { name: 'Holstein Kiel', elo: 1470, leagueKey: 'soccer_germany_bundesliga' },

  // ═══════════════════════════════════════════════════════
  //  SOCCER — Eredivisie (Netherlands) 2025/26
  // ═══════════════════════════════════════════════════════
  { name: 'Ajax', elo: 1660, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'AZ Alkmaar', elo: 1650, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'FC Groningen', elo: 1500, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'FC Twente', elo: 1640, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'FC Utrecht', elo: 1590, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'Feyenoord', elo: 1670, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'Fortuna Sittard', elo: 1490, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'Go Ahead Eagles', elo: 1520, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'Heerenveen', elo: 1530, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'Heracles', elo: 1480, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'NAC Breda', elo: 1470, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'NEC Nijmegen', elo: 1550, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'PEC Zwolle', elo: 1470, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'PSV', elo: 1700, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'Sparta Rotterdam', elo: 1510, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'Willem II', elo: 1480, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'Almere City', elo: 1460, leagueKey: 'soccer_netherlands_eredivisie' },
  { name: 'RKC Waalwijk', elo: 1460, leagueKey: 'soccer_netherlands_eredivisie' },

  // ═══════════════════════════════════════════════════════
  //  SOCCER — Brasileirão (Brazil) 2025
  // ═══════════════════════════════════════════════════════
  { name: 'Athletico Paranaense', elo: 1620, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Atlético Mineiro', elo: 1680, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Bahia', elo: 1600, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Botafogo', elo: 1660, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Bragantino', elo: 1580, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Corinthians', elo: 1650, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Cruzeiro', elo: 1610, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Flamengo', elo: 1780, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Fluminense', elo: 1640, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Fortaleza', elo: 1630, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Grêmio', elo: 1670, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Internacional', elo: 1650, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Juventude', elo: 1490, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Mirassol', elo: 1480, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Palmeiras', elo: 1800, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Santos', elo: 1620, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'São Paulo', elo: 1700, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Sport Recife', elo: 1510, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Vasco da Gama', elo: 1560, leagueKey: 'soccer_brazil_campeonato' },
  { name: 'Vitória', elo: 1490, leagueKey: 'soccer_brazil_campeonato' },

  // ═══════════════════════════════════════════════════════
  //  SOCCER — Champions League 2025/26 Semi-Finalists
  //  (separate team records with UCL leagueKey)
  // ═══════════════════════════════════════════════════════
  { name: 'Barcelona', elo: 1920, leagueKey: 'soccer_uefa_champions_league' },
  { name: 'Arsenal', elo: 1890, leagueKey: 'soccer_uefa_champions_league' },
  { name: 'Bayern Munich', elo: 1930, leagueKey: 'soccer_uefa_champions_league' },
  { name: 'Inter', elo: 1850, leagueKey: 'soccer_uefa_champions_league' },

  // ═══════════════════════════════════════════════════════
  //  RUGBY — Six Nations
  // ═══════════════════════════════════════════════════════
  { name: 'England', elo: 1850, leagueKey: 'rugby_six_nations' },
  { name: 'France', elo: 1880, leagueKey: 'rugby_six_nations' },
  { name: 'Ireland', elo: 1900, leagueKey: 'rugby_six_nations' },
  { name: 'Italy', elo: 1650, leagueKey: 'rugby_six_nations' },
  { name: 'Scotland', elo: 1780, leagueKey: 'rugby_six_nations' },
  { name: 'Wales', elo: 1720, leagueKey: 'rugby_six_nations' },

  // ═══════════════════════════════════════════════════════
  //  RUGBY — NRL
  // ═══════════════════════════════════════════════════════
  { name: 'Brisbane Broncos', elo: 1750, leagueKey: 'rugby_nrl' },
  { name: 'Canberra Raiders', elo: 1680, leagueKey: 'rugby_nrl' },
  { name: 'Canterbury Bulldogs', elo: 1600, leagueKey: 'rugby_nrl' },
  { name: 'Cronulla Sharks', elo: 1700, leagueKey: 'rugby_nrl' },
  { name: 'Gold Coast Titans', elo: 1550, leagueKey: 'rugby_nrl' },
  { name: 'Manly Sea Eagles', elo: 1650, leagueKey: 'rugby_nrl' },
  { name: 'Melbourne Storm', elo: 1800, leagueKey: 'rugby_nrl' },
  { name: 'Newcastle Knights', elo: 1620, leagueKey: 'rugby_nrl' },
  { name: 'New Zealand Warriors', elo: 1720, leagueKey: 'rugby_nrl' },
  { name: 'North Queensland Cowboys', elo: 1680, leagueKey: 'rugby_nrl' },
  { name: 'Parramatta Eels', elo: 1660, leagueKey: 'rugby_nrl' },
  { name: 'Penrith Panthers', elo: 1850, leagueKey: 'rugby_nrl' },
  { name: 'South Sydney Rabbitohs', elo: 1700, leagueKey: 'rugby_nrl' },
  { name: 'St George Illawarra Dragons', elo: 1580, leagueKey: 'rugby_nrl' },
  { name: 'Sydney Roosters', elo: 1730, leagueKey: 'rugby_nrl' },
  { name: 'Wests Tigers', elo: 1520, leagueKey: 'rugby_nrl' },

  // ═══════════════════════════════════════════════════════
  //  RUGBY — Rugby Championship
  // ═══════════════════════════════════════════════════════
  { name: 'South Africa (Springboks)', elo: 1920, leagueKey: 'rugby_championship' },
  { name: 'New Zealand (All Blacks)', elo: 1900, leagueKey: 'rugby_championship' },
  { name: 'Australia (Wallabies)', elo: 1780, leagueKey: 'rugby_championship' },
  { name: 'Argentina (Pumas)', elo: 1800, leagueKey: 'rugby_championship' },

  // ═══════════════════════════════════════════════════════
  //  TENNIS — ATP Masters
  // ═══════════════════════════════════════════════════════
  { name: 'Novak Djokovic', elo: 2100, leagueKey: 'tennis_atp_masters' },
  { name: 'Carlos Alcaraz', elo: 2080, leagueKey: 'tennis_atp_masters' },
  { name: 'Jannik Sinner', elo: 2060, leagueKey: 'tennis_atp_masters' },
  { name: 'Daniil Medvedev', elo: 2020, leagueKey: 'tennis_atp_masters' },
  { name: 'Alexander Zverev', elo: 1980, leagueKey: 'tennis_atp_masters' },
  { name: 'Andrey Rublev', elo: 1950, leagueKey: 'tennis_atp_masters' },
  { name: 'Stefanos Tsitsipas', elo: 1940, leagueKey: 'tennis_atp_masters' },
  { name: 'Casper Ruud', elo: 1920, leagueKey: 'tennis_atp_masters' },
  { name: 'Holger Rune', elo: 1900, leagueKey: 'tennis_atp_masters' },
  { name: 'Taylor Fritz', elo: 1880, leagueKey: 'tennis_atp_masters' },

  // ═══════════════════════════════════════════════════════
  //  TENNIS — WTA 1000
  // ═══════════════════════════════════════════════════════
  { name: 'Iga Swiatek', elo: 2100, leagueKey: 'tennis_wta_1000' },
  { name: 'Aryna Sabalenka', elo: 2050, leagueKey: 'tennis_wta_1000' },
  { name: 'Coco Gauff', elo: 2000, leagueKey: 'tennis_wta_1000' },
  { name: 'Elena Rybakina', elo: 1980, leagueKey: 'tennis_wta_1000' },
  { name: 'Jessica Pegula', elo: 1920, leagueKey: 'tennis_wta_1000' },
  { name: 'Ons Jabeur', elo: 1900, leagueKey: 'tennis_wta_1000' },
  { name: 'Marketa Vondrousova', elo: 1880, leagueKey: 'tennis_wta_1000' },
  { name: 'Maria Sakkari', elo: 1860, leagueKey: 'tennis_wta_1000' },
  { name: 'Caroline Garcia', elo: 1840, leagueKey: 'tennis_wta_1000' },
  { name: 'Beatriz Haddad Maia', elo: 1820, leagueKey: 'tennis_wta_1000' },
];
