/**
 * Backend sport duration configuration.
 * Mirrors the frontend config — kept here to avoid importing shared libs into NestJS.
 * When the shared lib is properly imported, this can be removed.
 */
interface PeriodDef {
  label: string;
  end: number;
  status?: string;
  breakAfter?: number;
}

interface SportDurationConfig {
  regularMinutes: number;
  hasStoppageTime: boolean;
  periods: PeriodDef[];
}

const SOCCER_CONFIG: SportDurationConfig = {
  regularMinutes: 90,
  hasStoppageTime: true,
  periods: [
    { label: '1H', end: 45, status: '1H' },
    { label: 'HT', end: 45, status: 'HT', breakAfter: 2 },
    { label: '2H', end: 90, status: '2H' },
  ],
};

const ESOCCER_12_CONFIG: SportDurationConfig = {
  regularMinutes: 12,
  hasStoppageTime: false,
  periods: [
    { label: '1H', end: 6, status: '1H' },
    { label: 'HT', end: 6, status: 'HT', breakAfter: 1 },
    { label: '2H', end: 12, status: '2H' },
  ],
};

const BASKETBALL_CONFIG: SportDurationConfig = {
  regularMinutes: 48,
  hasStoppageTime: false,
  periods: [
    { label: 'Q1', end: 12, status: 'Q1' },
    { label: 'Q2', end: 24, status: 'Q2' },
    { label: 'Q3', end: 36, status: 'Q3' },
    { label: 'Q4', end: 48, status: 'Q4' },
  ],
};

const TENNIS_CONFIG: SportDurationConfig = {
  regularMinutes: 0,
  hasStoppageTime: false,
  periods: [],
};

const SPORT_CONFIG_MAP: Record<string, SportDurationConfig> = {
  soccer: SOCCER_CONFIG,
  'soccer_esoccer_gt_leagues_12': ESOCCER_12_CONFIG,
  'soccer_esoccer_gt_leagues_10': ESOCCER_12_CONFIG,
  basketball: BASKETBALL_CONFIG,
  tennis: TENNIS_CONFIG,
  'basketball_nba': BASKETBALL_CONFIG,
};

function getSportConfig(sportKey: string): SportDurationConfig {
  if (SPORT_CONFIG_MAP[sportKey]) return SPORT_CONFIG_MAP[sportKey];
  const prefix = sportKey.split('_')[0];
  if (SPORT_CONFIG_MAP[prefix]) return SPORT_CONFIG_MAP[prefix];
  return SOCCER_CONFIG;
}

/**
 * Compute the elapsed minute and live status for a match,
 * using the sport-specific duration config.
 */
export function computeSportMinute(
  sportKey: string,
  commenceTimestamp: number, // ms since epoch
  now: number = Date.now(),
): { minute: number | null; status: string } {
  const config = getSportConfig(sportKey);
  const elapsedMin = Math.floor((now - commenceTimestamp) / 60000);

  // Not started yet
  if (elapsedMin < 0) {
    return { minute: null, status: 'LIVE' };
  }

  // Past reasonable window — consider finished
  if (elapsedMin > config.regularMinutes + 15) {
    return { minute: config.regularMinutes, status: 'FT' };
  }

  // Tennis: no minute tracking
  if (config.regularMinutes === 0) {
    return { minute: null, status: 'LIVE' };
  }

  // Find current period
  for (const period of config.periods) {
    if (period.breakAfter) {
      const breakStart = period.end;
      const breakEnd = period.end + (period.breakAfter || 0);
      // Halftime window: from period end to end of break (+ small buffer)
      if (elapsedMin >= breakStart && elapsedMin <= breakEnd + 2) {
        return { minute: period.end, status: 'HT' };
      }
    }
    if (elapsedMin <= period.end) {
      return { minute: Math.max(1, elapsedMin), status: period.status || period.label };
    }
  }

  // Past regular time — second half / stoppage time
  if (config.hasStoppageTime) {
    return { minute: elapsedMin, status: '2H' };
  }

  // For multi-period sports, clamp to last period
  const lastPeriod = config.periods[config.periods.length - 1];
  return {
    minute: Math.min(elapsedMin, lastPeriod?.end ?? elapsedMin),
    status: lastPeriod?.status || lastPeriod?.label || 'LIVE',
  };
}
