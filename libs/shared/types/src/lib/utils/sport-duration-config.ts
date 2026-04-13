/**
 * Sport-specific match duration configuration.
 * Each sport has different period lengths and stoppage time behavior.
 */
export interface SportDurationConfig {
  /** Regular minutes for the full match (excluding stoppage) */
  regularMinutes: number;
  /** Whether the sport uses stoppage/added time */
  hasStoppageTime: boolean;
  /** Period structure: e.g., [{ label: '1H', end: 45 }, { label: '2H', end: 90 }] */
  periods: Array<{ label: string; end: number; breakAfter?: number }>;
  /** Display format for live minute: 'elapsed', 'period-plus', 'set', or 'quarter' */
  displayFormat: 'elapsed' | 'period-plus' | 'set' | 'quarter';
}

/** Soccer: 2×45min halves + stoppage time */
export const SOCCER_CONFIG: SportDurationConfig = {
  regularMinutes: 90,
  hasStoppageTime: true,
  periods: [
    { label: '1H', end: 45 },
    { label: 'HT', end: 45, breakAfter: 2 },
    { label: '2H', end: 90 },
  ],
  displayFormat: 'period-plus',
};

/** Esoccer GT Leagues (12-min matches): 2×6min halves */
export const ESOCCER_12_CONFIG: SportDurationConfig = {
  regularMinutes: 12,
  hasStoppageTime: false,
  periods: [
    { label: '1H', end: 6 },
    { label: 'HT', end: 6, breakAfter: 1 },
    { label: '2H', end: 12 },
  ],
  displayFormat: 'elapsed',
};

/** Esoccer GT Leagues (10-min matches): 2×5min halves */
export const ESOCCER_10_CONFIG: SportDurationConfig = {
  regularMinutes: 10,
  hasStoppageTime: false,
  periods: [
    { label: '1H', end: 5 },
    { label: 'HT', end: 5, breakAfter: 1 },
    { label: '2H', end: 10 },
  ],
  displayFormat: 'elapsed',
};

/** Basketball: 4×12min quarters (NBA), 4×10min (FIBA) */
export const BASKETBALL_CONFIG: SportDurationConfig = {
  regularMinutes: 48,
  hasStoppageTime: false,
  periods: [
    { label: 'Q1', end: 12 },
    { label: 'Q2', end: 24 },
    { label: 'Q3', end: 36 },
    { label: 'Q4', end: 48 },
  ],
  displayFormat: 'quarter',
};

/** Tennis: best-of-3 or best-of-5 sets, no time-based minute */
export const TENNIS_CONFIG: SportDurationConfig = {
  regularMinutes: 0,
  hasStoppageTime: false,
  periods: [],
  displayFormat: 'set',
};

/** American Football: 4×15min quarters */
export const AMERICAN_FOOTBALL_CONFIG: SportDurationConfig = {
  regularMinutes: 60,
  hasStoppageTime: false,
  periods: [
    { label: 'Q1', end: 15 },
    { label: 'Q2', end: 30 },
    { label: 'Q3', end: 45 },
    { label: 'Q4', end: 60 },
  ],
  displayFormat: 'quarter',
};

/** Ice Hockey: 3×20min periods */
export const ICE_HOCKEY_CONFIG: SportDurationConfig = {
  regularMinutes: 60,
  hasStoppageTime: false,
  periods: [
    { label: 'P1', end: 20 },
    { label: 'P2', end: 40 },
    { label: 'P3', end: 60 },
  ],
  displayFormat: 'quarter',
};

/** Rugby Union: 2×40min halves */
export const RUGBY_CONFIG: SportDurationConfig = {
  regularMinutes: 80,
  hasStoppageTime: true,
  periods: [
    { label: '1H', end: 40 },
    { label: 'HT', end: 40, breakAfter: 2 },
    { label: '2H', end: 80 },
  ],
  displayFormat: 'period-plus',
};

/** Handball: 2×30min halves */
export const HANDBALL_CONFIG: SportDurationConfig = {
  regularMinutes: 60,
  hasStoppageTime: true,
  periods: [
    { label: '1H', end: 30 },
    { label: 'HT', end: 30, breakAfter: 2 },
    { label: '2H', end: 60 },
  ],
  displayFormat: 'period-plus',
};

/**
 * Map sport keys to their duration configs.
 * Uses prefix matching so `soccer_epl`, `soccer_south_africa_psl`, etc. all map to SOCCER.
 */
const SPORT_CONFIG_MAP: Record<string, SportDurationConfig> = {
  soccer: SOCCER_CONFIG,
  'soccer_esoccer_gt_leagues_12': ESOCCER_12_CONFIG,
  'soccer_esoccer_gt_leagues_10': ESOCCER_10_CONFIG,
  basketball: BASKETBALL_CONFIG,
  tennis: TENNIS_CONFIG,
  americanfootball: AMERICAN_FOOTBALL_CONFIG,
  icehockey: ICE_HOCKEY_CONFIG,
  rugbyunion: RUGBY_CONFIG,
  rugby: RUGBY_CONFIG,
  handball: HANDBALL_CONFIG,
};

/**
 * Get the duration config for a given sport key.
 * Falls back to SOCCER_CONFIG for unknown soccer leagues.
 */
export function getSportDurationConfig(sportKey: string): SportDurationConfig {
  // Exact match first
  if (SPORT_CONFIG_MAP[sportKey]) return SPORT_CONFIG_MAP[sportKey];

  // Prefix match (e.g., 'soccer_epl' → 'soccer')
  const prefix = sportKey.split('_')[0];
  if (SPORT_CONFIG_MAP[prefix]) return SPORT_CONFIG_MAP[prefix];

  // Default to soccer (most common sport in the system)
  return SOCCER_CONFIG;
}

/**
 * Format elapsed minutes into a sport-specific display string.
 *
 * Examples:
 *   Soccer: "23'", "HT", "FT", "90+3'"
 *   Esoccer 12min: "8'", "HT", "FT"
 *   Basketball: "Q2 5:30" (if seconds provided), or "Q2"
 *   Tennis: "Set 2" (no minute display)
 */
export function formatSportMinute(
  sportKey: string,
  elapsedMinutes: number,
  status: string,
): string {
  const config = getSportDurationConfig(sportKey);

  // Terminal states
  if (status === 'FT' || status === 'finished' || status === 'ended') return 'FT';
  if (status === 'HT' || status === 'halftime' || status === 'break') return 'HT';
  if (status === 'AET') return 'AET'; // After extra time
  if (status === 'PEN') return 'PEN'; // Penalties
  if (status === 'ABD') return 'ABD'; // Abandoned
  if (status === 'CANC') return 'CANC'; // Cancelled
  if (status === 'SUSP') return 'SUSP'; // Suspended
  if (status === 'INT') return 'INT'; // Interrupted

  if (elapsedMinutes === null || elapsedMinutes === undefined) return '';

  // Tennis: no minute display, just show current set
  if (config.displayFormat === 'set') {
    return '';
  }

  // Basketball: show quarter
  if (config.displayFormat === 'quarter') {
    const quarter = Math.min(Math.ceil(elapsedMinutes / 12), 4);
    if (status?.startsWith('Q')) return status;
    return `Q${quarter}`;
  }

  // Esoccer / soccer with period-plus format
  if (config.displayFormat === 'period-plus') {
    if (elapsedMinutes > config.regularMinutes) {
      const added = elapsedMinutes - config.regularMinutes;
      return `${config.regularMinutes}+${added}'`;
    }
    // Check if in halftime break
    const htPeriod = config.periods.find(p => p.breakAfter);
    if (htPeriod && elapsedMinutes <= htPeriod.end + (htPeriod.breakAfter || 0)) {
      return 'HT';
    }
    return `${elapsedMinutes}'`;
  }

  // Default: elapsed minutes with apostrophe
  return `${elapsedMinutes}'`;
}

/**
 * Determine the live status string (1H, 2H, HT, Q1-Q4, etc.) based on
 * elapsed minutes and the sport's duration config.
 */
export function getSportLiveStatus(
  sportKey: string,
  elapsedMinutes: number,
): string {
  const config = getSportDurationConfig(sportKey);

  for (const period of config.periods) {
    if (period.breakAfter) {
      const breakStart = period.end;
      const breakEnd = period.end + period.breakAfter;
      if (elapsedMinutes > breakStart && elapsedMinutes <= breakEnd) {
        return 'HT';
      }
    }
    if (elapsedMinutes <= period.end) {
      return period.label;
    }
  }

  // Past regular time
  if (config.hasStoppageTime) return '2H';
  return config.periods[config.periods.length - 1]?.label || 'LIVE';
}

/**
 * Clamp the elapsed minutes to the sport's regular maximum.
 * Prevents showing "105'" for a 90-min soccer match (use 90+15 instead via formatSportMinute).
 */
export function clampSportMinutes(
  sportKey: string,
  elapsedMinutes: number,
): number {
  const config = getSportDurationConfig(sportKey);
  // Allow stoppage time to show (formatSportMinute handles the 90+X display)
  // But cap at a reasonable maximum (regular + 15 min stoppage)
  const maxMinutes = config.regularMinutes + 15;
  return Math.min(Math.max(0, elapsedMinutes), maxMinutes);
}
