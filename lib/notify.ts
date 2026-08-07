import { MockDB, saveMockDB } from '@/lib/mock-db';
import { isMockMode } from '@/lib/mock-mode';
import { shouldSuppressNotification } from '@/lib/focus-mode';

export interface NotificationPayload {
  user_id: string;
  type?: string;
  title: string;
  message?: string;
  action_url?: string;
}

export interface SendNotificationResult {
  suppressed: boolean;
  data?: any;
  error?: any;
}

/**
 * Create a notification for `user_id` while honoring Focus Mode.
 *
 * When the recipient is inside an active focus block and the notification is
 * not a critical/security alert (or the user opted out of critical alerts),
 * the notification is NOT created at all — server-side suppression.
 *
 * Works in both Supabase and mock mode.
 */
export async function sendNotification(supabase: any, payload: NotificationPayload): Promise<SendNotificationResult> {
  const suppressed = await shouldSuppressNotification(supabase, payload.user_id, payload.type);
  if (suppressed) {
    return { suppressed: true };
  }

  const record = {
    user_id: payload.user_id,
    type: payload.type || 'INFO',
    title: payload.title,
    message: payload.message || '',
    action_url: payload.action_url || null,
    is_read: false,
  };

  if (isMockMode()) {
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...record,
      created_at: new Date().toISOString(),
    };
    MockDB.notifications.push(newNotif as any);
    saveMockDB();
    return { suppressed: false, data: newNotif };
  }

  try {
    const { data, error } = await supabase.from('notifications').insert([record] as any);
    return { suppressed: false, data, error };
  } catch (error: any) {
    return { suppressed: false, error };
  }
}
