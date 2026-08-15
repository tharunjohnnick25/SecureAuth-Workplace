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
    if (isMockMode()) {
      const employeeId = req.nextUrl.searchParams.get('user_id') || '';
      if (!employeeId) {
        return NextResponse.json({ error: 'user_id is required', success: false }, { status: 400 });
      }
      return NextResponse.json({ data: ChatStore.listConversations(employeeId), success: true });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const { data: rows, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const conversations = [];
    for (const row of (rows || [])) {
      const otherId = row.participant_a === user.id ? row.participant_b : row.participant_a;
      const { data: other } = await supabase
        .from('users')
        .select('id, employee_id, full_name, role')
        .eq('id', otherId)
        .maybeSingle();

      const otherP = (other as any) || { id: otherId, employee_id: otherId, full_name: 'Colleague', role: 'Employee' };
      conversations.push({
        id: row.id,
        key: row.key,
        participants: [
          { id: user.id, employee_id: user.email || user.id, full_name: user.email || 'Me', role: 'Employee' },
          {
            id: otherP.id,
            employee_id: otherP.employee_id || otherP.id,
            full_name: otherP.full_name || otherP.id,
            role: otherP.role || 'Employee',
          },
        ],
        created_at: row.created_at,
        last_message_at: row.updated_at,
        last_message_preview: row.last_message_preview || '',
      });
    }

    return NextResponse.json({ data: conversations, success: true });
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

    if (body.create_department_group) {
      if (isMockMode()) {
        const allEmployees = MockEmployees.getAll();
        const myDetails = MockEmployees.getById(self.id);
        const department = myDetails?.department || 'Department';
        
        // Find direct reports first, fallback to same department
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
      } else {
        return NextResponse.json({ error: 'Group chat creation is currently only supported in Mock Mode.', success: false }, { status: 400 });
      }
    }

    if (!body.other_employee_id) {
      return NextResponse.json({ error: 'other_employee_id is required', success: false }, { status: 400 });
    }
    if (String(body.other_employee_id).toUpperCase() === self.employee_id.toUpperCase()) {
      return NextResponse.json({ error: 'You cannot start a conversation with yourself', success: false }, { status: 400 });
    }

    if (isMockMode()) {
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
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const { data: other } = await supabase
      .from('users')
      .select('id, employee_id, full_name, role')
      .eq('employee_id', body.other_employee_id)
      .maybeSingle();
    if (!other) {
      return NextResponse.json({ error: `No co-employee found with employee ID "${body.other_employee_id}"`, success: false }, { status: 404 });
    }
    if (other.id === user.id) {
      return NextResponse.json({ error: 'You cannot start a conversation with yourself', success: false }, { status: 400 });
    }

    const ids = [user.id, other.id].sort();
    const key = ids.join('::');

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('key', key)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        data: {
          id: existing.id,
          key: existing.key,
          participants: [
            { id: user.id, employee_id: user.email || user.id, full_name: user.email || 'Me', role: 'Employee' },
            { id: other.id, employee_id: other.employee_id || other.id, full_name: other.full_name || other.id, role: other.role || 'Employee' },
          ],
          created_at: existing.created_at,
          last_message_at: existing.updated_at,
          last_message_preview: existing.last_message_preview || '',
        },
        success: true,
      });
    }

    const { data: created, error: insertError } = await supabase
      .from('conversations')
      .insert({
        key,
        participant_a: ids[0],
        participant_b: ids[1],
        last_message_preview: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (insertError) throw insertError;

    return NextResponse.json({
      data: {
        id: created.id,
        key: created.key,
        participants: [
          { id: user.id, employee_id: user.email || user.id, full_name: user.email || 'Me', role: 'Employee' },
          { id: other.id, employee_id: other.employee_id || other.id, full_name: other.full_name || other.id, role: other.role || 'Employee' },
        ],
        created_at: created.created_at,
        last_message_at: created.updated_at,
        last_message_preview: '',
      },
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to start conversation', success: false }, { status: 500 });
  }
}
