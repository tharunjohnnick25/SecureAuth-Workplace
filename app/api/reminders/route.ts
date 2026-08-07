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
    const { userId, channel } = body as { userId: string; channel?: ReminderChannel };

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const channels: ReminderChannel[] = channel === 'email' ? ['email'] : channel === 'both' ? ['push', 'email'] : ['push'];
    const summary = computeReminders(userId);
    const reminders = [
      ...summary.certifications,
      ...summary.shifts,
      ...summary.missed_deadlines,
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
