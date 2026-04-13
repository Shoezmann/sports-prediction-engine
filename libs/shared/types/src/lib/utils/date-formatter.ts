/**
 * Timezone-aware date formatting utilities.
 *
 * All dates are stored as UTC ISO strings in the database.
 * These functions format them consistently for display in the user's local timezone.
 */

/**
 * Format a Date or UTC string to a localized time string (e.g., "15:30").
 * Always uses the browser's local timezone for display.
 *
 * @param dateOrUtc - Date object or UTC ISO string
 * @returns Localized time string (24h format, e.g., "15:30")
 */
export function formatLocalTime(dateOrUtc: Date | string): string {
  const date = typeof dateOrUtc === 'string' ? new Date(dateOrUtc) : dateOrUtc;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Format a Date or UTC string to a localized 12-hour time string (e.g., "3:30 PM").
 *
 * @param dateOrUtc - Date object or UTC ISO string
 * @returns Localized time string (12h format, e.g., "3:30 PM")
 */
export function formatLocalTime12h(dateOrUtc: Date | string): string {
  const date = typeof dateOrUtc === 'string' ? new Date(dateOrUtc) : dateOrUtc;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format a Date or UTC string to a short date string (e.g., "Apr 13, 2026").
 *
 * @param dateOrUtc - Date object or UTC ISO string
 * @returns Localized short date string
 */
export function formatShortDate(dateOrUtc: Date | string): string {
  const date = typeof dateOrUtc === 'string' ? new Date(dateOrUtc) : dateOrUtc;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

/**
 * Format a Date or UTC string to a weekday name (e.g., "MON").
 *
 * @param dateOrUtc - Date object or UTC ISO string
 * @returns Localized weekday string
 */
export function formatWeekday(dateOrUtc: Date | string): string {
  const date = typeof dateOrUtc === 'string' ? new Date(dateOrUtc) : dateOrUtc;
  return date.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
}

/**
 * Format a Date or UTC string with relative time awareness.
 * Returns context-aware labels: "SOON", "TOMORROW", weekday name, or time.
 *
 * @param dateOrUtc - Date object or UTC ISO string
 * @param now - Current timestamp (defaults to Date.now())
 * @returns Context-aware time label
 */
export function formatRelativeTime(
  dateOrUtc: Date | string,
  now: number = Date.now(),
): string {
  const date = typeof dateOrUtc === 'string' ? new Date(dateOrUtc) : dateOrUtc;
  const diff = now - date.getTime();
  const minutesDiff = Math.floor(diff / 60000);

  // Already started within last 60 minutes
  if (minutesDiff > 0 && minutesDiff <= 60) return 'SOON';

  // Future: tomorrow
  const daysDiff = Math.floor(-diff / 86400000);
  if (daysDiff === 1) return 'TOMORROW';

  // Future: today or within a few days — show time
  if (diff < 0 && daysDiff < 3) {
    return formatLocalTime(date);
  }

  // Past or further future: weekday name
  return formatWeekday(date);
}

/**
 * Calculate elapsed minutes since the match commence time.
 * Both timestamps are in UTC, so this is timezone-safe.
 *
 * @param commenceTimeUtc - UTC ISO string or Date of match start
 * @param now - Current timestamp (defaults to Date.now())
 * @returns Elapsed minutes (can be negative if match hasn't started)
 */
export function getElapsedMinutes(commenceTimeUtc: string | Date, now: number = Date.now()): number {
  const start = typeof commenceTimeUtc === 'string' ? new Date(commenceTimeUtc).getTime() : commenceTimeUtc.getTime();
  return Math.floor((now - start) / 60000);
}

/**
 * Check if a match is currently live based on commence time.
 *
 * @param commenceTimeUtc - UTC ISO string or Date of match start
 * @param now - Current timestamp (defaults to Date.now())
 * @param windowMinutes - How many minutes after start to consider "live" (default: 120)
 * @returns True if the match is in progress
 */
export function isMatchLive(
  commenceTimeUtc: string | Date,
  now: number = Date.now(),
  windowMinutes: number = 120,
): boolean {
  const elapsed = getElapsedMinutes(commenceTimeUtc, now);
  return elapsed > 0 && elapsed < windowMinutes;
}

/**
 * Format a timestamp for "last updated" display.
 *
 * @param dateOrUtc - Date object or UTC ISO string
 * @returns Localized time string (e.g., "15:30")
 */
export function formatLastUpdated(dateOrUtc: Date | string): string {
  return formatLocalTime12h(dateOrUtc);
}
