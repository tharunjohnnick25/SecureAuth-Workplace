import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';
import crypto from 'crypto';
import { MockWorkspace } from '@/lib/mock-workspace';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const managerId = searchParams.get('manager_id');
  const employeeId = searchParams.get('employee_id');

  if (!managerId) return NextResponse.json({ error: 'Missing manager_id' }, { status: 400 });

  let notes = (MockDB as any).one_on_ones || [];
  
  if (employeeId) {
    notes = notes.filter((n: any) => n.employee_id === employeeId && n.manager_id === managerId);
  } else {
    notes = notes.filter((n: any) => n.manager_id === managerId);
  }

  return NextResponse.json({ data: notes });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { manager_id, employee_id, notes, goals, date } = data;

    if (!manager_id || !employee_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newNote = {
      id: crypto.randomUUID(),
      manager_id,
      employee_id,
      notes: notes || '',
      goals: goals || '',
      date: date || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (!(MockDB as any).one_on_ones) (MockDB as any).one_on_ones = [];
    (MockDB as any).one_on_ones.push(newNote);
    saveMockDB();

    // Sync Goals to Tasks
    if (goals && goals.trim().length > 0) {
      const goalLines = goals.split('\n').filter((g: string) => g.trim().length > 0);
      goalLines.forEach((goalText: string) => {
        MockWorkspace.addTask({
          title: `[1-on-1 Goal] ${goalText.trim()}`,
          description: `Goal discussed during 1-on-1 on ${new Date().toLocaleDateString()}`,
          status: 'TODO',
          assignee: employee_id,
          created_by: manager_id,
          priority: 'MEDIUM',
        });
      });
    }

    return NextResponse.json({ data: newNote }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
