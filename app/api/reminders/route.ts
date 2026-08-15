import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';
import { computeReminders, totalReminders, ReminderChannel } from '@/lib/reminders';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const data = computeReminders(userId);
    return NextResponse.json({ data, total: totalReminders(data), success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, channel, reminderId, days, title, message, priority, due_date } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (action === 'create_custom') {
      if (!title || !due_date) {
        return NextResponse.json({ error: 'Missing reminder details' }, { status: 400 });
      }
      
      const newReminder = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        title,
        message,
        priority: priority || 'medium',
        due_date: due_date || new Date().toISOString(),
        action_url: '#',
      };
      if (!MockDB.custom_reminders) MockDB.custom_reminders = [];
      MockDB.custom_reminders.push(newReminder);
      saveMockDB();
      return NextResponse.json({ success: true, reminder: newReminder });
    }

    if (action === 'snooze') {
      if (!MockDB.reminder_states) MockDB.reminder_states = {};
      if (!MockDB.reminder_states[reminderId]) MockDB.reminder_states[reminderId] = {};
      const snoozeUntil = new Date(Date.now() + (days || 1) * 86400000).toISOString();
      MockDB.reminder_states[reminderId].snoozed_until = snoozeUntil;
      saveMockDB();
      return NextResponse.json({ success: true, snoozed_until: snoozeUntil });
    }

    if (action === 'dismiss') {
      if (!MockDB.reminder_states) MockDB.reminder_states = {};
      if (!MockDB.reminder_states[reminderId]) MockDB.reminder_states[reminderId] = {};
      MockDB.reminder_states[reminderId].dismissed = true;
      saveMockDB();
      return NextResponse.json({ success: true });
    }

    // Default: send notifications
    const channels: ReminderChannel[] = channel === 'email' ? ['email'] : channel === 'both' ? ['push', 'email'] : ['push'];
    const summary = computeReminders(userId);
    const reminders = [
      ...summary.certifications,
      ...summary.shifts,
      ...summary.missed_deadlines,
      ...summary.custom,
    ];

    const now = new Date().toISOString();
    for (const r of reminders) {
      for (const ch of channels) {
        MockDB.notifications.push({
          id: `notif-${Date.now()}-${Math.random()}`,
          user_id: userId,
          type: 'REMINDER',
          channel: ch,
          title: r.title,
          message: r.message,
          is_read: false,
          action_url: r.action_url,
          created_at: now,
        } as any);
      }
    }

    saveMockDB();

    return NextResponse.json({
      success: true,
      delivered: reminders.length * channels.length,
      reminders: reminders.length,
      channels,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { reminderId, action, days } = body as { reminderId: string; action: 'dismiss' | 'snooze'; days?: number };

    if (!reminderId || !action) {
      return NextResponse.json({ error: 'Missing reminderId or action' }, { status: 400 });
    }

    if (!MockDB.reminder_states) {
      MockDB.reminder_states = {};
    }

    if (action === 'dismiss') {
      MockDB.reminder_states[reminderId] = { dismissed: true };
    } else if (action === 'snooze' && days) {
      const snoozeUntil = new Date(Date.now() + 86400000 * days).toISOString();
      MockDB.reminder_states[reminderId] = { snoozed_until: snoozeUntil };
    }

    saveMockDB();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
