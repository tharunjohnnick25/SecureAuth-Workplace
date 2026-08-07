import { MockDB } from '@/lib/mock-db';

export type ReminderType = 'CERTIFICATION' | 'SHIFT_CHANGE' | 'DEADLINE';
export type ReminderChannel = 'push' | 'email' | 'both';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  message: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  action_url: string;
}

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export interface ReminderSummary {
  certifications: Reminder[];
  shifts: Reminder[];
  missed_deadlines: Reminder[];
}

export function computeReminders(userId: string): ReminderSummary {
  const now = Date.now();

  const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';

  let rawCertifications = MockDB.certifications || [];
  if (isMock && rawCertifications.length === 0) {
    rawCertifications = [{
      id: 'cert-1',
      user_id: userId,
      name: 'Cybersecurity Fundamentals 2026',
      expires_on: new Date(Date.now() + 86400000 * 5).toISOString()
    }];
  }

  const certifications: Reminder[] = rawCertifications
    .filter((c: any) => isMock || c.user_id === userId)
    .map((c: any) => {
      const d = daysUntil(c.expires_on);
      return {
        id: c.id,
        type: 'CERTIFICATION' as const,
        title: c.name,
        message:
          d < 0
            ? `${c.name} expired ${Math.abs(d)} day(s) ago. Renew immediately to remain compliant.`
            : `${c.name} expires in ${d} day(s). Renew before ${new Date(c.expires_on).toLocaleDateString()}.`,
        due_date: c.expires_on,
        priority: (d < 14 ? 'high' : 'medium') as Reminder['priority'],
        action_url: '/profile',
      };
    })
    .filter((r: Reminder) => daysUntil(r.due_date) <= 30);

  let rawShifts = MockDB.shifts || [];
  if (isMock && rawShifts.length === 0) {
    rawShifts = [{
      id: 'shift-1',
      user_id: userId,
      role: 'Security Operations',
      current_shift: '09:00 AM - 05:00 PM',
      new_shift: '11:00 AM - 07:00 PM',
      effective_from: new Date(Date.now() + 86400000 * 2).toISOString()
    }];
  }

  const shifts: Reminder[] = rawShifts
    .filter((s: any) => isMock || s.user_id === userId)
    .map((s: any) => ({
      id: s.id,
      type: 'SHIFT_CHANGE' as const,
      title: `${s.role} shift change`,
      message: `Your shift changes from ${s.current_shift} to ${s.new_shift} on ${new Date(s.effective_from).toLocaleDateString()}.`,
      due_date: s.effective_from,
      priority: 'medium' as Reminder['priority'],
      action_url: '/attendance',
    }))
    .filter((r: Reminder) => {
      const d = daysUntil(r.due_date);
      return d >= -1 && d <= 7;
    });

  let rawTasks = MockDB.tasks || [];
  if (isMock && rawTasks.filter((t: any) => t.status !== 'Completed' && new Date(t.deadline).getTime() < now).length === 0) {
    rawTasks = [...rawTasks, {
      id: 'task-missed-1',
      title: 'Submit Annual Compliance Report',
      description: 'The report was due last week.',
      assigned_to: userId,
      status: 'Pending',
      priority: 'High',
      deadline: new Date(Date.now() - 86400000 * 7).toISOString()
    }];
  }

  const missed_deadlines: Reminder[] = rawTasks
    .filter(
      (t: any) =>
        (isMock || t.assigned_to === userId) &&
        t.status !== 'Completed' &&
        new Date(t.deadline).getTime() < now
    )
    .map((t: any) => ({
      id: t.id,
      type: 'DEADLINE' as const,
      title: t.title,
      message: `Missed deadline - was due ${new Date(t.deadline).toLocaleDateString()}. ${t.description || ''}`.trim(),
      due_date: t.deadline,
      priority: (t.priority === 'High' ? 'high' : t.priority === 'Medium' ? 'medium' : 'low') as Reminder['priority'],
      action_url: '/tasks',
    }));

  return { certifications, shifts, missed_deadlines };
}

export function totalReminders(summary: ReminderSummary): number {
  return summary.certifications.length + summary.shifts.length + summary.missed_deadlines.length;
}
