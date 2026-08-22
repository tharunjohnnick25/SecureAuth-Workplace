import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notify';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser } = await supabase.from('users').select('company_id, role').eq('id', session.user.id).single();
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    let query = supabase
      .from('tasks')
      .select('*, assignee:users!tasks_assigned_to_fkey(id, full_name, department, company_id)')
      .order('created_at', { ascending: false });

    // Enforce org isolation
    if (currentUser.company_id) {
       query = query.eq('assignee.company_id', currentUser.company_id);
    }

    const { data: tasks, error } = await query;
    if (error) throw error;
    
    // Filter out rows where assignee org doesn't match
    const filteredTasks = (tasks || []).filter((t: any) => {
        if (currentUser.company_id && t.assignee && t.assignee.company_id !== currentUser.company_id) {
            return false;
        }
        return true;
    });

    const tasksWithDetails = filteredTasks.map((t: any) => ({
      ...t,
      assignee_name: t.assignee?.full_name || 'Unknown',
      department: t.assignee?.department || 'Unknown',
    }));

    return NextResponse.json({ success: true, data: tasksWithDetails });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser } = await supabase.from('users').select('company_id, role').eq('id', session.user.id).single();
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, assigned_to, priority, deadline } = body;

    if (!title || !assigned_to) {
       return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Verify assigned_to is in same org
    if (currentUser.company_id) {
        const { data: targetUser } = await supabase.from('users').select('company_id').eq('id', assigned_to).maybeSingle();
        if (!targetUser || targetUser.company_id !== currentUser.company_id) {
            return NextResponse.json({ error: 'Target user not found in your organization', success: false }, { status: 403 });
        }
    }

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert([{
         title,
         description,
         assigned_to,
         assigned_by: session.user.id,
         priority: priority || 'Medium',
         deadline: deadline || null,
         status: 'In Progress',
         progress: 0
      }]).select().single();

    if (error) throw error;

    // Notify employee
    await sendNotification(supabase, {
      user_id: assigned_to,
      type: 'NEW_TASK',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${title}`,
      action_url: '/tasks'
    });

    return NextResponse.json({ success: true, data: newTask });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser } = await supabase.from('users').select('company_id, role').eq('id', session.user.id).single();
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status } = body;
    
    if (!id || !status) return NextResponse.json({ success: false, error: 'ID and status required' }, { status: 400 });

    // Verify task exists and is in same org
    const { data: existingTask } = await supabase.from('tasks').select('assigned_to').eq('id', id).maybeSingle();
    if (!existingTask) {
        return NextResponse.json({ error: 'Task not found', success: false }, { status: 404 });
    }

    if (currentUser.company_id) {
        const { data: targetUser } = await supabase.from('users').select('company_id').eq('id', existingTask.assigned_to).maybeSingle();
        if (!targetUser || targetUser.company_id !== currentUser.company_id) {
            return NextResponse.json({ error: 'Task not found in your organization', success: false }, { status: 404 });
        }
    }

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
