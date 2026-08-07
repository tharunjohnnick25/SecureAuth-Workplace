import { MockDB, saveMockDB } from '@/lib/mock-db';
import { isMockMode } from '@/lib/mock-mode';
import {
  DEFAULT_FOCUS_SETTINGS,
  FocusSettings,
  isCriticalType,
  isNowInBlock,
  normalizeFocusSettings,
} from '@/lib/focus-utils';

export { DEFAULT_FOCUS_SETTINGS, isCriticalType, isNowInBlock, normalizeFocusSettings };
export type { FocusBlock, FocusSettings } from '@/lib/focus-utils';

/**
 * Fetch the focus settings for a user. Works in both Supabase and mock mode.
 */
export async function getFocusSettings(supabase: any, userId: string): Promise<FocusSettings | null> {
  if (!userId) return null;

  if (isMockMode()) {
    const row = (MockDB.focusMode as any[] | undefined)?.find((r) => r.user_id === userId);
    return row ? normalizeFocusSettings(row) : null;
  }

  try {
    const { data } = await supabase.from('focus_mode').select('*').eq('user_id', userId).maybeSingle();
    return normalizeFocusSettings(data);
  } catch {
    return null;
  }
}

/**
 * Returns true when notifications to `userId` should be suppressed right now
 * because of an active focus block.
 */
export async function shouldSuppressNotification(supabase: any, userId: string, type?: string): Promise<boolean> {
  const settings = await getFocusSettings(supabase, userId);
  if (!settings || !settings.enabled) return false;
  if (settings.allow_critical && isCriticalType(type)) return false;
  return isNowInBlock(settings.blocks, settings.timezone);
}

export function saveFocusSettingsMock(userId: string, settings: FocusSettings) {
  const rows = (MockDB.focusMode as any[]) || [];
  const idx = rows.findIndex((r) => r.user_id === userId);
  const row = { user_id: userId, ...settings, updated_at: new Date().toISOString() };
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  MockDB.focusMode = rows;
  saveMockDB();
  return row;
}
