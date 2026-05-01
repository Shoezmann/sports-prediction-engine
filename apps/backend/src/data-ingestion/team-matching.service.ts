import { Injectable, Logger } from '@nestjs/common';

export interface MatchCandidate {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  sportKey: string;
}

export interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: Date;
  source: string;
}

export interface MatchResultWithConfidence {
  match: MatchResult;
  confidence: number;
  matchedTeams: { home: string; away: string };
}

export interface TeamMatchResult {
  matched: boolean;
  canonicalName: string;
  confidence: number;
}

const TEAM_ALIASES: Record<string, string> = {
  // EPL
  'Manchester City FC': 'Manchester City',
  'Man City': 'Manchester City',
  'Man. City': 'Manchester City',
  'Manchester United FC': 'Manchester United',
  'Man United': 'Manchester United',
  'Man. United': 'Manchester United',
  'Liverpool FC': 'Liverpool',
  'Chelsea FC': 'Chelsea',
  'Arsenal FC': 'Arsenal',
  'Tottenham Hotspur FC': 'Tottenham Hotspur',
  'Tottenham Hotspur': 'Tottenham Hotspur',
  Tottenham: 'Tottenham Hotspur',
  'West Ham United FC': 'West Ham United',
  'West Ham': 'West Ham United',
  'Wolverhampton Wanderers FC': 'Wolverhampton Wanderers',
  Wolverhampton: 'Wolverhampton Wanderers',
  Wolves: 'Wolverhampton Wanderers',
  'Newcastle United FC': 'Newcastle United',
  Newcastle: 'Newcastle United',
  'AFC Bournemouth': 'Bournemouth',
  Bournemouth: 'Bournemouth',
  'Brighton & Hove Albion': 'Brighton & Hove Albion',
  Brighton: 'Brighton & Hove Albion',
  'Aston Villa FC': 'Aston Villa',
  'Aston Villa': 'Aston Villa',
  'Nottingham Forest': 'Nottingham Forest',
  'Nottm Forest': 'Nottingham Forest',
  'Brentford FC': 'Brentford',
  Brentford: 'Brentford',
  'Fulham FC': 'Fulham',
  Fulham: 'Fulham',
  'Crystal Palace FC': 'Crystal Palace',
  'Crystal Palace': 'Crystal Palace',
  'Everton FC': 'Everton',
  Everton: 'Everton',
  'Leicester City FC': 'Leicester City',
  Leicester: 'Leicester City',
  'Southampton FC': 'Southampton',
  Southampton: 'Southampton',
  'Leeds United': 'Leeds United',
  Leeds: 'Leeds United',
  'West Brom': 'West Brom',
  Burnley: 'Burnley',
  Watford: 'Watford',
  'Norwich City': 'Norwich City',
  Norwich: 'Norwich City',
  // La Liga
  'Real Madrid CF': 'Real Madrid',
  'Real Madrid': 'Real Madrid',
  'FC Barcelona': 'FC Barcelona',
  Barcelona: 'FC Barcelona',
  Barça: 'FC Barcelona',
  'Atletico Madrid': 'Club Atletico de Madrid',
  'Atlético de Madrid': 'Club Atletico de Madrid',
  'Atlético Madrid': 'Club Atletico de Madrid',
  'Club Atletico de Madrid': 'Club Atletico de Madrid',
  'Athletic Club': 'Athletic Club',
  'Athletic Bilbao': 'Athletic Club',
  'Real Sociedad de Fútbol': 'Real Sociedad',
  'Real Sociedad': 'Real Sociedad',
  'Real Betis Balompié': 'Real Betis',
  'Real Betis': 'Real Betis',
  'Villarreal CF': 'Villarreal',
  Villarreal: 'Villarreal',
  'Girona FC': 'Girona',
  Girona: 'Girona',
  'Sevilla FC': 'Sevilla',
  Sevilla: 'Sevilla',
  'Valencia CF': 'Valencia',
  Valencia: 'Valencia',
  'Celta de Vigo': 'Celta Vigo',
  'Celta Vigo': 'Celta Vigo',
  'UD Las Palmas': 'Las Palmas',
  'Las Palmas': 'Las Palmas',
  'RCD Mallorca': 'RCD Mallorca',
  Mallorca: 'RCD Mallorca',
  'CA Osasuna': 'CA Osasuna',
  Osasuna: 'CA Osasuna',
  'Rayo Vallecano de Madrid': 'Rayo Vallecano',
  'Rayo Vallecano': 'Rayo Vallecano',
  'Elche CF': 'Elche',
  Elche: 'Elche',
  'RCD Espanyol de Barcelona': 'Espanyol',
  Espanyol: 'Espanyol',
  'Deportivo Alavés': 'Alavés',
  Alavés: 'Alavés',
  'Granada CF': 'Granada',
  Granada: 'Granada',
  Almería: 'Almería',
  Almeria: 'Almería',
  Cadiz: 'Cádiz',
  'Cádiz CF': 'Cádiz',
  Levante: 'Levante',
  'Levante UD': 'Levante',
  // Serie A
  'FC Internazionale Milano': 'Inter',
  'Inter Milan': 'Inter',
  Inter: 'Inter',
  'Associazione Calcio Milan': 'AC Milan',
  'AC Milan': 'AC Milan',
  Milan: 'AC Milan',
  'Juventus FC': 'Juventus',
  Juventus: 'Juventus',
  'SSC Napoli': 'Napoli',
  Napoli: 'Napoli',
  'SS Lazio': 'Lazio',
  Lazio: 'Lazio',
  'AS Roma': 'Roma',
  Roma: 'Roma',
  'ACF Fiorentina': 'Fiorentina',
  Fiorentina: 'Fiorentina',
  'Bologna FC 1909': 'Bologna',
  Bologna: 'Bologna',
  'Torino FC': 'Torino',
  Torino: 'Torino',
  'Genoa CFC': 'Genoa',
  Genoa: 'Genoa',
  'Udinese Calcio': 'Udinese',
  Udinese: 'Udinese',
  'Cagliari Calcio': 'Cagliari',
  Cagliari: 'Cagliari',
  'US Lecce': 'Lecce',
  Lecce: 'Lecce',
  'Empoli FC': 'Empoli',
  Empoli: 'Empoli',
  'Hellas Verona FC': 'Hellas Verona',
  Verona: 'Hellas Verona',
  Sampdoria: 'Sampdoria',
  'UC Sampdoria': 'Sampdoria',
  Sassuolo: 'Sassuolo',
  'US Sassuolo': 'Sassuolo',
  Parma: 'Parma',
  'Parma Calcio 1913': 'Parma',
  Atalanta: 'Atalanta',
  'Atalanta BC': 'Atalanta',
  Monza: 'Monza',
  'AC Monza': 'Monza',
  Como: 'Como',
  'Como 1907': 'Como',
  Venezia: 'Venezia',
  Frosinone: 'Frosinone',
  Salernitana: 'Salernitana',
  Spezia: 'Spezia',
  // Ligue 1
  'Paris Saint-Germain': 'Paris Saint-Germain',
  'Paris Saint Germain': 'Paris Saint-Germain',
  PSG: 'Paris Saint-Germain',
  'Olympique de Marseille': 'Olympique de Marseille',
  Marseille: 'Olympique de Marseille',
  'Olympique Lyonnais': 'Olympique Lyonnais',
  Lyon: 'Olympique Lyonnais',
  'AS Monaco': 'AS Monaco',
  Monaco: 'AS Monaco',
  'LOSC Lille': 'LOSC Lille',
  Lille: 'LOSC Lille',
  'RC Lens': 'RC Lens',
  Lens: 'RC Lens',
  'Stade Rennais FC 1901': 'Stade Rennais',
  'Stade Rennais': 'Stade Rennais',
  Rennes: 'Stade Rennais',
  'OGC Nice': 'OGC Nice',
  Nice: 'OGC Nice',
  'FC Nantes': 'FC Nantes',
  Nantes: 'FC Nantes',
  'Montpellier HSC': 'Montpellier HSC',
  Montpellier: 'Montpellier HSC',
  'RC Strasbourg Alsace': 'RC Strasbourg',
  Strasbourg: 'RC Strasbourg',
  'Stade de Reims': 'Stade de Reims',
  Reims: 'Stade de Reims',
  'Le Havre AC': 'Le Havre AC',
  'Le Havre': 'Le Havre AC',
  'FC Metz': 'FC Metz',
  Metz: 'FC Metz',
  'AJ Auxerre': 'AJ Auxerre',
  Auxerre: 'AJ Auxerre',
  'Angers SCO': 'Angers SCO',
  Angers: 'Angers SCO',
  'Toulouse FC': 'Toulouse FC',
  Toulouse: 'Toulouse FC',
  'FC Lorient': 'FC Lorient',
  Lorient: 'FC Lorient',
  Brest: 'Stade Brestois 29',
  'Stade Brestois 29': 'Stade Brestois 29',
  // Bundesliga
  'FC Bayern München': 'Bayern Munich',
  'FC Bayern Munich': 'Bayern Munich',
  'Bayern Munich': 'Bayern Munich',
  Bayern: 'Bayern Munich',
  'Bayer 04 Leverkusen': 'Bayer Leverkusen',
  'Bayer Leverkusen': 'Bayer Leverkusen',
  Leverkusen: 'Bayer Leverkusen',
  'Borussia Dortmund': 'Borussia Dortmund',
  Dortmund: 'Borussia Dortmund',
  'RB Leipzig': 'RB Leipzig',
  Leipzig: 'RB Leipzig',
  'Eintracht Frankfurt': 'Eintracht Frankfurt',
  Frankfurt: 'Eintracht Frankfurt',
  'VfL Wolfsburg': 'VfL Wolfsburg',
  Wolfsburg: 'VfL Wolfsburg',
  'SC Freiburg': 'SC Freiburg',
  Freiburg: 'SC Freiburg',
  '1. FC Union Berlin': '1. FC Union Berlin',
  'Union Berlin': '1. FC Union Berlin',
  'Borussia Mönchengladbach': 'Borussia Mönchengladbach',
  Mönchengladbach: 'Borussia Mönchengladbach',
  Monchengladbach: 'Borussia Mönchengladbach',
  'VfB Stuttgart': 'VfB Stuttgart',
  Stuttgart: 'VfB Stuttgart',
  'SV Werder Bremen': 'SV Werder Bremen',
  'Werder Bremen': 'SV Werder Bremen',
  Bremen: 'SV Werder Bremen',
  'TSG 1899 Hoffenheim': 'TSG 1899 Hoffenheim',
  Hoffenheim: 'TSG 1899 Hoffenheim',
  '1. FSV Mainz 05': '1. FSV Mainz 05',
  'Mainz 05': '1. FSV Mainz 05',
  Mainz: '1. FSV Mainz 05',
  'FC Augsburg': 'FC Augsburg',
  Augsburg: 'FC Augsburg',
  '1. FC Heidenheim 1846': '1. FC Heidenheim 1846',
  Heidenheim: '1. FC Heidenheim 1846',
  'VfL Bochum 1848': 'VfL Bochum',
  Bochum: 'VfL Bochum',
  'FC St. Pauli': 'FC St. Pauli',
  'St. Pauli': 'FC St. Pauli',
  'Holstein Kiel': 'Holstein Kiel',
  Kiel: 'Holstein Kiel',
  'Eintracht Braunschweig': 'Eintracht Braunschweig',
  Braunschweig: 'Eintracht Braunschweig',
  // Eredivisie
  PSV: 'PSV',
  'PSV Eindhoven': 'PSV',
  'Feyenoord Rotterdam': 'Feyenoord',
  Feyenoord: 'Feyenoord',
  'AFC Ajax': 'Ajax',
  Ajax: 'Ajax',
  'FC Twente': 'FC Twente',
  Twente: 'FC Twente',
  'AZ Alkmaar': 'AZ',
  AZ: 'AZ',
  'Fortuna Sittard': 'Fortuna Sittard',
  'Heracles Almelo': 'Heracles Almelo',
  Heracles: 'Heracles Almelo',
  'SC Heerenveen': 'SC Heerenveen',
  Heerenveen: 'SC Heerenveen',
  'FC Utrecht': 'FC Utrecht',
  Utrecht: 'FC Utrecht',
  'NEC Nijmegen': 'NEC Nijmegen',
  NEC: 'NEC Nijmegen',
  'Go Ahead Eagles': 'Go Ahead Eagles',
  'FC Groningen': 'FC Groningen',
  Groningen: 'FC Groningen',
  'PEC Zwolle': 'PEC Zwolle',
  Zwolle: 'PEC Zwolle',
  'Sparta Rotterdam': 'Sparta Rotterdam',
  Sparta: 'Sparta Rotterdam',
  'Willem II Tilburg': 'Willem II',
  'Willem II': 'Willem II',
  'FC Volendam': 'FC Volendam',
  Volendam: 'FC Volendam',
  'RKC Waalwijk': 'RKC Waalwijk',
  Waalwijk: 'RKC Waalwijk',
  'Almere City FC': 'Almere City',
  'Almere City': 'Almere City',
  Excelsior: 'Excelsior',
  'SBV Excelsior': 'Excelsior',
  // PSL (South Africa)
  'Mamelodi Sundowns FC': 'Mamelodi Sundowns',
  'Mamelodi Sundowns': 'Mamelodi Sundowns',
  Sundowns: 'Mamelodi Sundowns',
  'Orlando Pirates FC': 'Orlando Pirates',
  'Orlando Pirates': 'Orlando Pirates',
  Pirates: 'Orlando Pirates',
  'Kaizer Chiefs FC': 'Kaizer Chiefs',
  'Kaizer Chiefs': 'Kaizer Chiefs',
  Chiefs: 'Kaizer Chiefs',
  'Stellenbosch FC': 'Stellenbosch',
  Stellenbosch: 'Stellenbosch',
  'Cape Town City FC': 'Cape Town City',
  'Cape Town City': 'Cape Town City',
  'SuperSport United FC': 'SuperSport United',
  'SuperSport United': 'SuperSport United',
  'AmaZulu FC': 'AmaZulu',
  AmaZulu: 'AmaZulu',
  'Sekhukhune United FC': 'Sekhukhune United',
  'Sekhukhune United': 'Sekhukhune United',
  'Lamontville Golden Arrows': 'Golden Arrows',
  'Golden Arrows FC': 'Golden Arrows',
  'Golden Arrows': 'Golden Arrows',
  'Richards Bay FC': 'Richards Bay',
  'Richards Bay': 'Richards Bay',
  'Moroka Swallows FC': 'Moroka Swallows',
  'Moroka Swallows': 'Moroka Swallows',
  'Chippa United FC': 'Chippa United',
  'Chippa United': 'Chippa United',
  'Polokwane City FC': 'Polokwane City',
  'Polokwane City': 'Polokwane City',
  'TS Galaxy FC': 'TS Galaxy',
  'TS Galaxy': 'TS Galaxy',
  'Royal AM': 'Royal AM',
  'Royal AM FC': 'Royal AM',
  'Maritzburg United': 'Maritzburg United',
  'Maritzburg United FC': 'Maritzburg United',
  'Bidvest Wits': 'Bidvest Wits',
  Wits: 'Bidvest Wits',
  'Free State Stars': 'Free State Stars',
  'Highlands Park': 'Highlands Park',
  'Black Leopards': 'Black Leopards',
  'Ajax Cape Town': 'Ajax Cape Town',
  'Cape Town Spurs': 'Cape Town Spurs',
  // Brasileirao (Brazil)
  Flamengo: 'Flamengo',
  'CR Flamengo': 'Flamengo',
  Palmeiras: 'Palmeiras',
  'SE Palmeiras': 'Palmeiras',
  'São Paulo FC': 'São Paulo',
  'São Paulo': 'São Paulo',
  'Sao Paulo': 'São Paulo',
  Corinthians: 'Corinthians',
  'SC Corinthians': 'Corinthians',
  'Corinthians-SP': 'Corinthians',
  'Atlético Mineiro': 'Atlético Mineiro',
  'Atletico-MG': 'Atlético Mineiro',
  'Club Atlético Mineiro': 'Atlético Mineiro',
  Grêmio: 'Grêmio',
  Gremio: 'Grêmio',
  Internacional: 'Internacional',
  'SC Internacional': 'Internacional',
  Botafogo: 'Botafogo',
  'Botafogo FR': 'Botafogo',
  Fluminense: 'Fluminense',
  'Fluminense FC': 'Fluminense',
  Fortaleza: 'Fortaleza',
  'Fortaleza EC': 'Fortaleza',
  Cruzeiro: 'Cruzeiro',
  'Cruzeiro EC': 'Cruzeiro',
  'Athletico Paranaense': 'Athletico Paranaense',
  CAP: 'Athletico Paranaense',
  'Club Athletico Paranaense': 'Athletico Paranaense',
  Bahia: 'Bahia',
  'EC Bahia': 'Bahia',
  Bragantino: 'Bragantino',
  'RB Bragantino': 'Bragantino',
  Santos: 'Santos',
  'Santos FC': 'Santos',
  'Vasco da Gama': 'Vasco da Gama',
  'CR Vasco da Gama': 'Vasco da Gama',
  Coritiba: 'Coritiba',
  'Coritiba FC': 'Coritiba',
  Vitória: 'Vitória',
  'EC Vitória': 'Vitória',
  Cuiabá: 'Cuiabá',
  Cuiaba: 'Cuiabá',
  Goias: 'Goiás',
  Sport: 'Sport',
  'Sport Club do Recife': 'Sport',
  'Atlético Goianiense': 'Atlético Goianiense',
  'Atlético-GO': 'Atlético Goianiense',
  Juventude: 'Juventude',
  'EC Juventude': 'Juventude',
  Avaí: 'Avaí',
  'Avaí FC': 'Avaí',
  Criciúma: 'Criciúma',
  'Criciúma EC': 'Criciúma',
  Brasiliense: 'Brasiliense',
  Figueirense: 'Figueirense',
  'Ponte Preta': 'Ponte Preta',
  'Sampaio Corrêa': 'Sampaio Corrêa',
  Londrina: 'Londrina',
  Operário: 'Operário',
  CRB: 'CRB',
  'Villa Nova': 'Villa Nova',
  Náutico: 'Náutico',
  'Santa Cruz': 'Santa Cruz',
};

@Injectable()
export class TeamMatchingService {
  private readonly logger = new Logger(TeamMatchingService.name);

  normalizeTeamName(name: string): string {
    if (!name) return '';

    const trimmed = name.trim();

    if (TEAM_ALIASES[trimmed]) {
      return TEAM_ALIASES[trimmed];
    }

    const lowerName = trimmed.toLowerCase();

    for (const [alias, canonical] of Object.entries(TEAM_ALIASES)) {
      if (alias.toLowerCase() === lowerName) {
        return canonical;
      }
    }

    // For known team names that aren't aliases, return the input as-is
    // But also check if it matches a canonical name (case insensitive)
    for (const [alias, canonical] of Object.entries(TEAM_ALIASES)) {
      if (canonical.toLowerCase() === lowerName) {
        return canonical;
      }
    }

    // Unknown team - use fuzzy normalization
    return this.fuzzyNormalize(trimmed);
  }

  private fuzzyNormalize(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*(fc|sc|ac|us|rc|cf|ec|sv|vb|1\.|2\.)\s*$/gi, '')
      .replace(/\s*[-–]\s*/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  matchTeam(name: string, candidate: string): TeamMatchResult {
    // First try direct alias match - normalize both and compare
    const normalizedInput = this.normalizeTeamName(name);
    const normalizedCandidate = this.normalizeTeamName(candidate);

    if (normalizedInput === normalizedCandidate) {
      return { matched: true, canonicalName: normalizedInput, confidence: 1.0 };
    }

    // Also check if the candidate is a known alias of the input
    const inputCanonical =
      TEAM_ALIASES[name] || TEAM_ALIASES[name.toLowerCase()];
    if (inputCanonical && inputCanonical === candidate) {
      return { matched: true, canonicalName: inputCanonical, confidence: 1.0 };
    }

    // Check if candidate is an alias that maps to input
    for (const [alias, canonical] of Object.entries(TEAM_ALIASES)) {
      if (
        alias.toLowerCase() === name.toLowerCase() &&
        canonical === candidate
      ) {
        return { matched: true, canonicalName: canonical, confidence: 1.0 };
      }
    }

    // Fall back to fuzzy matching
    const similarity = this.calculateSimilarity(
      normalizedInput,
      normalizedCandidate,
    );

    if (similarity > 0.85) {
      return {
        matched: true,
        canonicalName: normalizedInput,
        confidence: similarity,
      };
    }

    return {
      matched: false,
      canonicalName: normalizedInput,
      confidence: similarity,
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    return matrix[str1.length][str2.length];
  }

  findBestMatch(
    matchResult: MatchResult,
    candidates: MatchCandidate[],
    options?: { maxDaysDiff?: number; minConfidence?: number },
  ): { candidate: MatchCandidate | null; confidence: number; reason: string } {
    const maxDaysDiff = options?.maxDaysDiff ?? 1;
    const minConfidence = options?.minConfidence ?? 0.7;

    const normalizedHome = this.normalizeTeamName(matchResult.homeTeam);
    const normalizedAway = this.normalizeTeamName(matchResult.awayTeam);

    const matchDate = new Date(matchResult.date);
    matchDate.setHours(0, 0, 0, 0);

    const matches: Array<{
      candidate: MatchCandidate;
      score: number;
      reason: string;
    }> = [];

    for (const candidate of candidates) {
      const candidateDate = new Date(candidate.commenceTime);
      candidateDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.abs(
        Math.round(
          (matchDate.getTime() - candidateDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      if (daysDiff > maxDaysDiff) {
        continue;
      }

      const homeMatch = this.matchTeam(
        matchResult.homeTeam,
        candidate.homeTeam,
      );
      const awayMatch = this.matchTeam(
        matchResult.awayTeam,
        candidate.awayTeam,
      );

      const teamScore = (homeMatch.confidence + awayMatch.confidence) / 2;
      const dateScore = 1 - daysDiff / (maxDaysDiff + 1);
      const totalScore = teamScore * 0.9 + dateScore * 0.1;

      if (totalScore >= minConfidence) {
        const isExactDate = daysDiff === 0;
        const isExactTeamMatch = homeMatch.matched && awayMatch.matched;

        let reason = '';
        if (isExactDate && isExactTeamMatch) {
          reason = `Exact match: ${homeMatch.canonicalName} vs ${awayMatch.canonicalName}`;
        } else if (isExactTeamMatch) {
          reason = `Team match (${daysDiff} day${daysDiff > 1 ? 's' : ''} diff): ${homeMatch.canonicalName} vs ${awayMatch.canonicalName}`;
        } else {
          reason = `Partial match (${(totalScore * 100).toFixed(0)}%): ${homeMatch.canonicalName} vs ${awayMatch.canonicalName}`;
        }

        matches.push({ candidate, score: totalScore, reason });
      }
    }

    if (matches.length === 0) {
      return {
        candidate: null,
        confidence: 0,
        reason: 'No matching candidates found',
      };
    }

    matches.sort((a, b) => b.score - a.score);
    const best = matches[0];

    return {
      candidate: best.candidate,
      confidence: best.score,
      reason: best.reason,
    };
  }
}
