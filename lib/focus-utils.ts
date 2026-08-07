export interface FocusBlock {
  id: string;
  start: string; // 'HH:MM' 24h
  end: string; // 'HH:MM' 24h
  days: number[]; // 0 = Sunday ... 6 = Saturday
}

export interface FocusSettings {
  enabled: boolean;
  timezone: string;
  blocks: FocusBlock[];
  allow_critical: boolean;
}

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  enabled: true,
  timezone: 'UTC',
  blocks: [],
  allow_critical: true,
};

// Notification types that should still be delivered during a focus block
// when the user opts to allow critical alerts.
const CRITICAL_TYPES = new Set([
  'CRITICAL',
  'SECURITY',
  'SECURITY_ALERT',
  'ALERT',
  'SYSTEM_ALERT',
]);

export function isCriticalType(type?: string): boolean {
  if (!type) return false;
  return CRITICAL_TYPES.has(String(type).toUpperCase());
}

export function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

export function nowInTime(tz: string, date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz || 'UTC',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';

  let hour = Number(get('hour')) || 0;
  const dayPeriod = get('dayPeriod');
  if (dayPeriod === 'PM' && hour < 12) hour += 12;
  if (dayPeriod === 'AM' && hour === 12) hour = 0;

  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = weekdayMap[get('weekday')] ?? -1;

  return { minutes: hour * 60 + (Number(get('minute')) || 0), weekday };
}

export function isNowInBlock(
  blocks: FocusBlock[] | null | undefined,
  tz: string,
  date: Date = new Date()
): boolean {
  if (!Array.isArray(blocks) || blocks.length === 0) return false;
  const { minutes, weekday } = nowInTime(tz, date);
  return blocks.some((b) => {
    const days = Array.isArray(b.days) ? b.days : [];
    if (days.length > 0 && !days.includes(weekday)) return false;
    const s = minutesSinceMidnight(b.start);
    const e = minutesSinceMidnight(b.end);
    if (s === -1 || e === -1 || s === e) return false;
    // Normal day block (09:00 -> 17:00) or overnight block (22:00 -> 06:00).
    if (s < e) return minutes >= s && minutes < e;
    return minutes >= s || minutes < e;
  });
}

export function normalizeFocusSettings(row: any): FocusSettings {
  if (!row) return { ...DEFAULT_FOCUS_SETTINGS };
  const blocks = Array.isArray(row.blocks) ? row.blocks : [];
  return {
    enabled: row.enabled !== false,
    timezone: row.timezone || DEFAULT_FOCUS_SETTINGS.timezone,
    blocks,
    allow_critical: row.allow_critical !== false,
  };
}
