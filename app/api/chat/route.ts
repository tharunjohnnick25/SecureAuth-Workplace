import { NextRequest, NextResponse } from 'next/server';
import { MockEmployees, isMockMode } from '@/lib/mock-employees';
import { ChatStore, type ChatParticipant } from '@/lib/mock-chat';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function toParticipant(self: any): ChatParticipant | null {
  if (!self || !self.employee_id) return null;
  return {
    id: String(self.id || self.employee_id || ''),
    employee_id: String(self.employee_id),
    full_name: String(self.full_name || self.email || self.employee_id),
    role: String(self.role || 'Employee'),
  };
}

export async function GET(req: NextRequest) {
  try {
    // Force universal use of ChatStore since Postgres tables don't exist yet
    const employeeId = req.nextUrl.searchParams.get('user_id') || '';
    if (!employeeId) {
      return NextResponse.json({ error: 'user_id is required', success: false }, { status: 400 });
    }
    return NextResponse.json({ data: ChatStore.listConversations(employeeId), success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load conversations', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const self = toParticipant(body.self);

    if (!self) {
      return NextResponse.json({ error: 'A valid self identity with employee_id is required', success: false }, { status: 400 });
    }

    // Force universal use of ChatStore since Postgres tables don't exist yet
    if (body.create_department_group) {
      // Create group chat
      const allEmployees = MockEmployees.getAll();
      const myDetails = MockEmployees.getById(self.id);
      const department = myDetails?.department || 'Department';
      
      let team = allEmployees.filter(e => e.manager_id === self.id);
      if (team.length === 0) {
         team = allEmployees.filter(e => e.department === department && e.id !== self.id);
      }
      
      const participants: ChatParticipant[] = [self];
      for (const record of team) {
         participants.push({
           id: record.id,
           employee_id: record.employee_id || record.id,
           full_name: record.full_name || record.email,
           role: record.role || 'Employee'
         });
      }
      
      const conversation = ChatStore.createGroupConversation(participants, `${department} Team`);
      return NextResponse.json({ data: conversation, success: true });
    }

    if (!body.other_employee_id) {
      return NextResponse.json({ error: 'other_employee_id is required', success: false }, { status: 400 });
    }
    if (String(body.other_employee_id).toUpperCase() === self.employee_id.toUpperCase()) {
      return NextResponse.json({ error: 'You cannot start a conversation with yourself', success: false }, { status: 400 });
    }

    const record = MockEmployees.findByEmployeeId(body.other_employee_id) || MockEmployees.getAll().find(
      (e) => e.employee_id && e.employee_id.toLowerCase() === String(body.other_employee_id).toLowerCase()
    );
    if (!record) {
      return NextResponse.json({ error: `No co-employee found with employee ID "${body.other_employee_id}"`, success: false }, { status: 404 });
    }

    const other: ChatParticipant = {
      id: record.id,
      employee_id: record.employee_id || record.id,
      full_name: record.full_name || record.email,
      role: record.role || 'Employee',
    };

    const conversation = ChatStore.getOrCreateConversation(self, other);
    return NextResponse.json({ data: conversation, success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to start conversation', success: false }, { status: 500 });
  }
}
