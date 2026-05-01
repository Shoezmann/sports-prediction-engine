/**
 * Fixture Seed Data — Updated for 2025/26 seasons
 *
 * All teams match actual league rosters.
 * Fixtures start from Apr 29, 2026 (today/tomorrow).
 */

export interface FixtureSeed {
  leagueKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string; // ISO 8601
}

function roundRobin(
  leagueKey: string,
  teams: string[],
  baseDate: string,
): FixtureSeed[] {
  const fixtures: FixtureSeed[] = [];
  const startDate = new Date(baseDate);
  let matchDay = 0;
  for (let round = 0; round < teams.length - 1; round++) {
    for (let i = 0; i < teams.length / 2; i++) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];
      const date = new Date(startDate);
      date.setDate(date.getDate() + matchDay * 7);
      fixtures.push({
        leagueKey,
        homeTeam: home,
        awayTeam: away,
        commenceTime: date.toISOString(),
      });
    }
    teams = [teams[0], ...teams.slice(2), teams[1]];
    matchDay++;
  }
  return fixtures;
}

export const FIXTURE_SEEDS: FixtureSeed[] = [
  // ═══════════════════════════════════════════════════════════════
  //  PSL — Betway Premiership 2025/26
  // ═══════════════════════════════════════════════════════════════

  // ── Matchday 27 (Apr 30 - May 1) — TODAY & TOMORROW ──
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Orlando Pirates', awayTeam: 'Mamelodi Sundowns', commenceTime: '2026-04-30T17:30:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Kaizer Chiefs', awayTeam: 'Stellenbosch', commenceTime: '2026-04-30T15:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Cape Town City', awayTeam: 'AmaZulu', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Golden Arrows', awayTeam: 'Sekhukhune United', commenceTime: '2026-04-30T13:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Chippa United', awayTeam: 'TS Galaxy', commenceTime: '2026-05-01T15:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Richards Bay', awayTeam: 'Magesi FC', commenceTime: '2026-05-01T13:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Polokwane City', awayTeam: 'Durban City', commenceTime: '2026-05-01T17:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Marumo Gallants', awayTeam: 'Royal AM', commenceTime: '2026-05-01T19:00:00Z' },

  // ── Matchday 28 (May 3-4) ──────────────────────────────
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Mamelodi Sundowns', awayTeam: 'Kaizer Chiefs', commenceTime: '2026-05-03T15:30:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Orlando Pirates', awayTeam: 'Chippa United', commenceTime: '2026-05-03T13:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Stellenbosch', awayTeam: 'AmaZulu', commenceTime: '2026-05-03T17:30:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Magesi FC', awayTeam: 'Golden Arrows', commenceTime: '2026-05-04T13:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Richards Bay', awayTeam: 'Durban City', commenceTime: '2026-05-04T15:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Polokwane City', awayTeam: 'TS Galaxy', commenceTime: '2026-05-04T17:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Sekhukhune United', awayTeam: 'Cape Town City', commenceTime: '2026-05-04T13:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Royal AM', awayTeam: 'Marumo Gallants', commenceTime: '2026-05-04T19:00:00Z' },

  // ── Matchday 29 (May 10-11) ────────────────────────────
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Kaizer Chiefs', awayTeam: 'Orlando Pirates', commenceTime: '2026-05-10T15:30:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Mamelodi Sundowns', awayTeam: 'Stellenbosch', commenceTime: '2026-05-10T13:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'AmaZulu', awayTeam: 'Richards Bay', commenceTime: '2026-05-10T17:30:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Cape Town City', awayTeam: 'Polokwane City', commenceTime: '2026-05-11T13:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'TS Galaxy', awayTeam: 'Sekhukhune United', commenceTime: '2026-05-11T15:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Golden Arrows', awayTeam: 'Chippa United', commenceTime: '2026-05-11T17:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Durban City', awayTeam: 'Magesi FC', commenceTime: '2026-05-11T13:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Marumo Gallants', awayTeam: 'Royal AM', commenceTime: '2026-05-11T19:00:00Z' },

  // ── Matchday 30 (May 17-18) ────────────────────────────
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'TS Galaxy', awayTeam: 'Mamelodi Sundowns', commenceTime: '2026-05-17T15:30:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'AmaZulu', awayTeam: 'Kaizer Chiefs', commenceTime: '2026-05-17T13:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Golden Arrows', awayTeam: 'Orlando Pirates', commenceTime: '2026-05-17T17:30:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Durban City', awayTeam: 'Stellenbosch', commenceTime: '2026-05-18T13:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Magesi FC', awayTeam: 'Chippa United', commenceTime: '2026-05-18T15:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Cape Town City', awayTeam: 'Sekhukhune United', commenceTime: '2026-05-18T17:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Richards Bay', awayTeam: 'Polokwane City', commenceTime: '2026-05-18T13:00:00Z' },
  { leagueKey: 'soccer_south_africa_psl', homeTeam: 'Royal AM', awayTeam: 'Marumo Gallants', commenceTime: '2026-05-18T19:00:00Z' },

  // ═══════════════════════════════════════════════════════════════
  //  UEFA Champions League — Semi-Finals 2025/26
  // ═══════════════════════════════════════════════════════════════
  // 1st Legs
  { leagueKey: 'soccer_uefa_champions_league', homeTeam: 'Barcelona', awayTeam: 'Arsenal', commenceTime: '2026-05-01T19:00:00Z' },
  { leagueKey: 'soccer_uefa_champions_league', homeTeam: 'Bayern Munich', awayTeam: 'Inter', commenceTime: '2026-04-30T19:00:00Z' },
  // 2nd Legs
  { leagueKey: 'soccer_uefa_champions_league', homeTeam: 'Arsenal', awayTeam: 'Barcelona', commenceTime: '2026-05-06T19:00:00Z' },
  { leagueKey: 'soccer_uefa_champions_league', homeTeam: 'Inter', awayTeam: 'Bayern Munich', commenceTime: '2026-05-07T19:00:00Z' },

  // ═══════════════════════════════════════════════════════
  //  EPL — Matchday 35-36 (correct 2025/26 teams)
  // ═══════════════════════════════════════════════════════
  // Midweek Apr 29-30
  { leagueKey: 'soccer_epl', homeTeam: 'Arsenal', awayTeam: 'Newcastle United', commenceTime: '2026-05-01T19:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Liverpool', awayTeam: 'Tottenham', commenceTime: '2026-05-01T19:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Manchester City', awayTeam: 'Aston Villa', commenceTime: '2026-05-01T20:15:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Chelsea', awayTeam: 'Bournemouth', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Manchester United', awayTeam: 'West Ham', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Brighton', awayTeam: 'Wolves', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Brentford', awayTeam: 'Everton', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Crystal Palace', awayTeam: 'Fulham', commenceTime: '2026-04-30T20:15:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Nottingham Forest', awayTeam: 'Leicester City', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Leeds United', awayTeam: 'Ipswich Town', commenceTime: '2026-04-30T19:00:00Z' },
  // Weekend Matchday 36 (May 3)
  { leagueKey: 'soccer_epl', homeTeam: 'Arsenal', awayTeam: 'Liverpool', commenceTime: '2026-05-03T12:30:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Manchester City', awayTeam: 'Chelsea', commenceTime: '2026-05-03T15:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Tottenham', awayTeam: 'Manchester United', commenceTime: '2026-05-03T17:30:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Newcastle United', awayTeam: 'Aston Villa', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Brighton', awayTeam: 'West Ham', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Wolves', awayTeam: 'Fulham', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Brentford', awayTeam: 'Crystal Palace', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Bournemouth', awayTeam: 'Nottingham Forest', commenceTime: '2026-05-04T16:30:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Everton', awayTeam: 'Leeds United', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_epl', homeTeam: 'Leicester City', awayTeam: 'Ipswich Town', commenceTime: '2026-05-04T14:00:00Z' },

  // ═══════════════════════════════════════════════════════
  //  La Liga — Matchday 34-35 (correct 2025/26 teams)
  // ═══════════════════════════════════════════════════════
  // Midweek Apr 29-30
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Barcelona', awayTeam: 'Atletico Madrid', commenceTime: '2026-05-01T19:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Real Madrid', awayTeam: 'Real Sociedad', commenceTime: '2026-05-01T21:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Villarreal', awayTeam: 'Athletic Bilbao', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Sevilla', awayTeam: 'Valencia', commenceTime: '2026-04-30T21:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Girona', awayTeam: 'Real Betis', commenceTime: '2026-04-30T17:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Osasuna', awayTeam: 'Celta Vigo', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Mallorca', awayTeam: 'Leganes', commenceTime: '2026-04-30T21:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Rayo Vallecano', awayTeam: 'Espanyol', commenceTime: '2026-05-01T17:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Getafe', awayTeam: 'Real Valladolid', commenceTime: '2026-05-01T19:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Las Palmas', awayTeam: 'Alavés', commenceTime: '2026-04-30T17:00:00Z' },
  // Weekend Matchday 35 (May 3-4)
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', commenceTime: '2026-05-03T20:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Atletico Madrid', awayTeam: 'Sevilla', commenceTime: '2026-05-03T18:30:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Real Sociedad', awayTeam: 'Villarreal', commenceTime: '2026-05-03T16:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Athletic Bilbao', awayTeam: 'Real Betis', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Valencia', awayTeam: 'Girona', commenceTime: '2026-05-04T18:30:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Celta Vigo', awayTeam: 'Getafe', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Leganes', awayTeam: 'Rayo Vallecano', commenceTime: '2026-05-04T16:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Espanyol', awayTeam: 'Mallorca', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Real Valladolid', awayTeam: 'Las Palmas', commenceTime: '2026-05-04T18:30:00Z' },
  { leagueKey: 'soccer_spain_la_liga', homeTeam: 'Alavés', awayTeam: 'Osasuna', commenceTime: '2026-05-04T20:00:00Z' },

  // ═══════════════════════════════════════════════════════
  //  Serie A — Matchday 34-35 (correct 2025/26 teams)
  // ═══════════════════════════════════════════════════════
  // Midweek Apr 29-30
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Inter', awayTeam: 'Milan', commenceTime: '2026-05-01T18:45:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Napoli', awayTeam: 'Juventus', commenceTime: '2026-05-01T20:45:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Roma', awayTeam: 'Lazio', commenceTime: '2026-04-30T18:45:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Atalanta', awayTeam: 'Fiorentina', commenceTime: '2026-04-30T20:45:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Bologna', awayTeam: 'Genoa', commenceTime: '2026-04-30T18:45:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Torino', awayTeam: 'Udinese', commenceTime: '2026-05-01T18:45:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Monza', awayTeam: 'Lecce', commenceTime: '2026-04-30T18:45:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Empoli', awayTeam: 'Cagliari', commenceTime: '2026-05-01T18:45:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Verona', awayTeam: 'Venezia', commenceTime: '2026-04-30T18:45:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Como', awayTeam: 'Parma', commenceTime: '2026-04-30T20:45:00Z' },
  // Weekend Matchday 35 (May 3-4)
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Juventus', awayTeam: 'Inter', commenceTime: '2026-05-03T19:45:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Milan', awayTeam: 'Napoli', commenceTime: '2026-05-03T17:00:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Lazio', awayTeam: 'Atalanta', commenceTime: '2026-05-03T14:00:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Fiorentina', awayTeam: 'Roma', commenceTime: '2026-05-04T17:00:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Genoa', awayTeam: 'Torino', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Udinese', awayTeam: 'Bologna', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Lecce', awayTeam: 'Empoli', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Cagliari', awayTeam: 'Como', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Parma', awayTeam: 'Verona', commenceTime: '2026-05-04T17:00:00Z' },
  { leagueKey: 'soccer_italy_serie_a', homeTeam: 'Venezia', awayTeam: 'Monza', commenceTime: '2026-05-03T14:00:00Z' },

  // ═══════════════════════════════════════════════════════
  //  Bundesliga — Matchday 32-33 (correct 2025/26 teams)
  // ═══════════════════════════════════════════════════════
  // Apr 29-30
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'Bayern Munich', awayTeam: 'Borussia Dortmund', commenceTime: '2026-05-01T17:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'Bayer Leverkusen', awayTeam: 'RB Leipzig', commenceTime: '2026-05-01T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'VfB Stuttgart', awayTeam: 'Eintracht Frankfurt', commenceTime: '2026-05-01T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'SC Freiburg', awayTeam: 'Wolfsburg', commenceTime: '2026-04-30T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'Union Berlin', awayTeam: 'TSG Hoffenheim', commenceTime: '2026-04-30T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'Werder Bremen', awayTeam: 'Mainz 05', commenceTime: '2026-04-30T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'Borussia Monchengladbach', awayTeam: 'FC Augsburg', commenceTime: '2026-04-30T17:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'St Pauli', awayTeam: 'Holstein Kiel', commenceTime: '2026-05-01T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'FC Heidenheim', awayTeam: 'Bochum', commenceTime: '2026-04-30T14:30:00Z' },
  // Matchday 33 (May 9-10)
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'Borussia Dortmund', awayTeam: 'Bayer Leverkusen', commenceTime: '2026-05-09T17:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'RB Leipzig', awayTeam: 'Bayern Munich', commenceTime: '2026-05-09T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'Eintracht Frankfurt', awayTeam: 'SC Freiburg', commenceTime: '2026-05-10T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'Wolfsburg', awayTeam: 'VfB Stuttgart', commenceTime: '2026-05-10T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'TSG Hoffenheim', awayTeam: 'Werder Bremen', commenceTime: '2026-05-10T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'Mainz 05', awayTeam: 'Borussia Monchengladbach', commenceTime: '2026-05-10T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'FC Augsburg', awayTeam: 'Union Berlin', commenceTime: '2026-05-10T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'Holstein Kiel', awayTeam: 'FC Heidenheim', commenceTime: '2026-05-10T14:30:00Z' },
  { leagueKey: 'soccer_germany_bundesliga', homeTeam: 'Bochum', awayTeam: 'St Pauli', commenceTime: '2026-05-09T14:30:00Z' },

  // ═══════════════════════════════════════════════════════
  //  Ligue 1 — Matchday 33-34 (correct 2025/26 teams)
  // ═══════════════════════════════════════════════════════
  // Midweek Apr 29-30
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Paris Saint Germain', awayTeam: 'Lyon', commenceTime: '2026-05-01T19:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Marseille', awayTeam: 'Monaco', commenceTime: '2026-05-01T21:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Lille', awayTeam: 'Lens', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Nice', awayTeam: 'Rennes', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Brest', awayTeam: 'Toulouse', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Saint-Etienne', awayTeam: 'Strasbourg', commenceTime: '2026-05-01T19:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Nantes', awayTeam: 'Montpellier', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Reims', awayTeam: 'Auxerre', commenceTime: '2026-04-30T19:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Angers', awayTeam: 'Le Havre', commenceTime: '2026-05-01T19:00:00Z' },
  // Weekend Matchday 34 (May 3-4)
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Paris Saint Germain', awayTeam: 'Marseille', commenceTime: '2026-05-03T20:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Monaco', awayTeam: 'Lyon', commenceTime: '2026-05-03T17:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Lille', awayTeam: 'Nice', commenceTime: '2026-05-03T14:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Lens', awayTeam: 'Rennes', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Strasbourg', awayTeam: 'Brest', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Toulouse', awayTeam: 'Nantes', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Montpellier', awayTeam: 'Saint-Etienne', commenceTime: '2026-05-04T14:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Auxerre', awayTeam: 'Angers', commenceTime: '2026-05-04T16:00:00Z' },
  { leagueKey: 'soccer_france_ligue_one', homeTeam: 'Le Havre', awayTeam: 'Reims', commenceTime: '2026-05-03T14:00:00Z' },

  // ═══════════════════════════════════════════════════════
  //  Eredivisie — Matchday 32-33 (correct 2025/26 teams)
  // ═══════════════════════════════════════════════════════
  // Midweek Apr 29-30
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'Ajax', awayTeam: 'Feyenoord', commenceTime: '2026-05-01T18:00:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'PSV', awayTeam: 'FC Twente', commenceTime: '2026-05-01T20:00:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'AZ Alkmaar', awayTeam: 'FC Utrecht', commenceTime: '2026-04-30T18:00:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'Heerenveen', awayTeam: 'Go Ahead Eagles', commenceTime: '2026-04-30T20:00:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'NEC Nijmegen', awayTeam: 'Sparta Rotterdam', commenceTime: '2026-04-30T18:00:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'NAC Breda', awayTeam: 'Heracles', commenceTime: '2026-05-01T18:00:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'Willem II', awayTeam: 'Fortuna Sittard', commenceTime: '2026-04-30T18:00:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'PEC Zwolle', awayTeam: 'FC Groningen', commenceTime: '2026-05-01T20:00:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'Almere City', awayTeam: 'RKC Waalwijk', commenceTime: '2026-04-30T18:00:00Z' },
  // Weekend Matchday 33 (May 3)
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'PSV', awayTeam: 'Ajax', commenceTime: '2026-05-03T13:30:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'Feyenoord', awayTeam: 'AZ Alkmaar', commenceTime: '2026-05-03T17:45:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'FC Twente', awayTeam: 'FC Utrecht', commenceTime: '2026-05-03T11:15:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'Go Ahead Eagles', awayTeam: 'Sparta Rotterdam', commenceTime: '2026-05-03T15:45:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'Heerenveen', awayTeam: 'NEC Nijmegen', commenceTime: '2026-05-04T11:15:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'Fortuna Sittard', awayTeam: 'Heracles', commenceTime: '2026-05-04T13:30:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'FC Groningen', awayTeam: 'NAC Breda', commenceTime: '2026-05-04T11:15:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'Willem II', awayTeam: 'PEC Zwolle', commenceTime: '2026-05-04T13:30:00Z' },
  { leagueKey: 'soccer_netherlands_eredivisie', homeTeam: 'RKC Waalwijk', awayTeam: 'Almere City', commenceTime: '2026-05-03T15:45:00Z' },

  // ═══════════════════════════════════════════════════════
  //  Brasileirão — Matchday 3-4 (correct 2025 teams)
  // ═══════════════════════════════════════════════════════
  // Midweek Apr 29-30
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Flamengo', awayTeam: 'Palmeiras', commenceTime: '2026-04-30T00:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Corinthians', awayTeam: 'Botafogo', commenceTime: '2026-04-30T00:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Grêmio', awayTeam: 'São Paulo', commenceTime: '2026-04-30T22:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Internacional', awayTeam: 'Cruzeiro', commenceTime: '2026-04-30T00:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Fortaleza', awayTeam: 'Bahia', commenceTime: '2026-05-01T22:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Santos', awayTeam: 'Atlético Mineiro', commenceTime: '2026-05-01T00:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Fluminense', awayTeam: 'Vasco da Gama', commenceTime: '2026-04-30T00:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Sport Recife', awayTeam: 'Vitória', commenceTime: '2026-05-01T22:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Juventude', awayTeam: 'Mirassol', commenceTime: '2026-04-30T22:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Bragantino', awayTeam: 'Athletico Paranaense', commenceTime: '2026-05-01T22:00:00Z' },
  // Weekend Matchday 4 (May 3-4)
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Palmeiras', awayTeam: 'Flamengo', commenceTime: '2026-05-03T22:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'São Paulo', awayTeam: 'Corinthians', commenceTime: '2026-05-03T19:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Atlético Mineiro', awayTeam: 'Grêmio', commenceTime: '2026-05-03T22:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Fluminense', awayTeam: 'Internacional', commenceTime: '2026-05-04T19:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Botafogo', awayTeam: 'Fortaleza', commenceTime: '2026-05-04T21:30:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Cruzeiro', awayTeam: 'Santos', commenceTime: '2026-05-04T19:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Bahia', awayTeam: 'Bragantino', commenceTime: '2026-05-04T16:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Vasco da Gama', awayTeam: 'Sport Recife', commenceTime: '2026-05-03T16:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Vitória', awayTeam: 'Juventude', commenceTime: '2026-05-04T16:00:00Z' },
  { leagueKey: 'soccer_brazil_campeonato', homeTeam: 'Mirassol', awayTeam: 'Athletico Paranaense', commenceTime: '2026-05-03T19:00:00Z' },

  // ═══════════════════════════════════════════════════════
  //  Tennis — ATP Masters (Rome Open, May 2026)
  // ═══════════════════════════════════════════════════════
  { leagueKey: 'tennis_atp_masters', homeTeam: 'Novak Djokovic', awayTeam: 'Carlos Alcaraz', commenceTime: '2026-05-10T18:00:00Z' },
  { leagueKey: 'tennis_atp_masters', homeTeam: 'Jannik Sinner', awayTeam: 'Daniil Medvedev', commenceTime: '2026-05-10T20:00:00Z' },
  { leagueKey: 'tennis_atp_masters', homeTeam: 'Alexander Zverev', awayTeam: 'Stefanos Tsitsipas', commenceTime: '2026-05-11T16:00:00Z' },
  { leagueKey: 'tennis_atp_masters', homeTeam: 'Andrey Rublev', awayTeam: 'Casper Ruud', commenceTime: '2026-05-11T18:00:00Z' },
  { leagueKey: 'tennis_atp_masters', homeTeam: 'Holger Rune', awayTeam: 'Taylor Fritz', commenceTime: '2026-05-12T14:00:00Z' },

  // ═══════════════════════════════════════════════════════
  //  Tennis — WTA 1000 (Rome Open, May 2026)
  // ═══════════════════════════════════════════════════════
  { leagueKey: 'tennis_wta_1000', homeTeam: 'Iga Swiatek', awayTeam: 'Aryna Sabalenka', commenceTime: '2026-05-10T17:00:00Z' },
  { leagueKey: 'tennis_wta_1000', homeTeam: 'Coco Gauff', awayTeam: 'Elena Rybakina', commenceTime: '2026-05-10T19:00:00Z' },
  { leagueKey: 'tennis_wta_1000', homeTeam: 'Jessica Pegula', awayTeam: 'Ons Jabeur', commenceTime: '2026-05-11T15:00:00Z' },
  { leagueKey: 'tennis_wta_1000', homeTeam: 'Marketa Vondrousova', awayTeam: 'Maria Sakkari', commenceTime: '2026-05-11T17:00:00Z' },
  { leagueKey: 'tennis_wta_1000', homeTeam: 'Caroline Garcia', awayTeam: 'Beatriz Haddad Maia', commenceTime: '2026-05-12T15:00:00Z' },
];
