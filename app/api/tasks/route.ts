import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface TaskRow {
  id?: string;
  assignee?: {
    company_id?: string | null;
    full_name?: string | null;
    department?: string | null;
  };
}

interface TaskAttachmentInput {
  file_url?: string;
  file_name?: string;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser } = await supabase.from('users').select('id, company_id, role').eq('id', session.user.id).single();
    if (!currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId'); // The UI might pass this, but we should rely on session or validate
    const role = currentUser.role?.toUpperCase() || 'EMPLOYEE';
    const effectiveUserId = (role === 'ADMIN' || role === 'SUPER_ADMIN') && userId ? userId : currentUser.id;

    let query = supabase.from('tasks').select(`
      *,
      assignee:users!tasks_assigned_to_fkey(id, full_name, department, company_id)
    `);

    if (currentUser.company_id) {
       query = query.eq('assignee.company_id', currentUser.company_id);
    }

    if (role === 'EMPLOYEE') {
      query = query.eq('assigned_to', effectiveUserId);
    } else if (role === 'MANAGER') {
      // Manager can see tasks they assigned, or tasks assigned to them
      query = query.or(`assigned_by.eq.${effectiveUserId},assigned_to.eq.${effectiveUserId}`);
    } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      // Admins see all tasks in their org (handled by inner join filter if company_id matches)
      if (userId) {
         query = query.eq('assigned_to', userId);
      }
    }

    // Sort by created_at desc
    query = query.order('created_at', { ascending: false });

    const { data: tasks, error } = await query;
    if (error) throw error;

    // Filter out null assignees (which happens if inner join fails company_id check, but supabase does left join by default)
    // Actually Supabase left joins unless we use !inner. We used left join, so filter locally for org isolation:
    const filteredTasks = (tasks || []).filter((t: TaskRow) => {
        if (currentUser.company_id && t.assignee && t.assignee.company_id !== currentUser.company_id) {
            return false;
        }
        return true;
    });

    const tasksWithDetails = filteredTasks.map((t: TaskRow) => ({
      ...t,
      assignee_name: t.assignee?.full_name || 'Unknown',
      department: t.assignee?.department || 'Unknown',
    }));

    return NextResponse.json(tasksWithDetails);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser } = await supabase.from('users').select('id, company_id, role').eq('id', session.user.id).single();
    if (!currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only managers and admins can create tasks
    const role = currentUser.role?.toUpperCase() || '';
    if (!['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
       return NextResponse.json({ error: 'Forbidden: Only managers and admins can assign tasks' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, assigned_to, assigned_by, priority, deadline, attachments } = body;

    if (!title || !assigned_to) {
      return NextResponse.json({ error: 'Missing required fields (title, assigned_to)' }, { status: 400 });
    }

    // Verify assigned_to is in same org
    if (currentUser.company_id) {
        const { data: targetUser } = await supabase.from('users').select('company_id').eq('id', assigned_to).maybeSingle();
        if (!targetUser || targetUser.company_id !== currentUser.company_id) {
            return NextResponse.json({ error: 'Target user not found in your organization' }, { status: 403 });
        }
    }

    const newTask = {
      title,
      description: description || '',
      assigned_to,
      assigned_by: assigned_by || currentUser.id,
      priority: priority || 'Medium',
      deadline: deadline || null,
      status: 'Pending',
      progress: 0,
      notes: ''
    };

    const { data, error } = await supabase.from('tasks').insert([newTask]).select().single();
    if (error) throw error;

    if (Array.isArray(attachments) && attachments.length > 0) {
      const rows = attachments
        .filter((a: TaskAttachmentInput) => a.file_url && a.file_name)
        .map((a: TaskAttachmentInput) => ({
          task_id: data.id,
          file_url: a.file_url,
          file_name: a.file_name,
          uploaded_by: currentUser.id,
        }));
      if (rows.length > 0) {
        await supabase.from('task_attachments').insert(rows);
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
