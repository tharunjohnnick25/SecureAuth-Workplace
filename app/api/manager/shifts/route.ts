import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';
import { MockEmployees } from '@/lib/mock-employees';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const managerId = searchParams.get('manager_id');
  
  if (!managerId) return NextResponse.json({ error: 'Missing manager_id' }, { status: 400 });

  // Get employees for this manager
  const team = MockEmployees.getAll().filter(e => e.manager_id === managerId);
  const teamIds = team.map(e => e.id);

  let shifts = (MockDB as any).shifts || [];
  
  // Filter shifts for this manager's team
  shifts = shifts.filter((s: any) => teamIds.includes(s.user_id));

  return NextResponse.json({ data: shifts });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { user_id, current_shift, effective_from } = data;

    if (!user_id || !current_shift) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newShift = {
      id: crypto.randomUUID(),
      user_id,
      current_shift,
      effective_from: effective_from || new Date().toISOString(),
    };

    if (!(MockDB as any).shifts) (MockDB as any).shifts = [];
    
    // Remove existing shifts for the same user on the same date? 
    // For simplicity, we just push to array and the UI uses the latest one.
    (MockDB as any).shifts.push(newShift);
    
    // Update the user's shift_timing in MockEmployees so it persists
    MockEmployees.update(user_id, { shift_timing: current_shift });

    saveMockDB();

    return NextResponse.json({ data: newShift }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
