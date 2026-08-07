import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notify';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, progress, status, notes } = body;
    
    if (!id) return NextResponse.json({ success: false, error: 'Task ID required' }, { status: 400 });

    // Validate the task belongs to the user
    const { data: taskCheck, error: checkError } = await supabase
      .from('tasks')
      .select('assigned_to, assigned_by, title')
      .eq('id', id)
      .single();

    if (checkError || taskCheck.assigned_to !== user.id) {
       return NextResponse.json({ success: false, error: 'Task not found or forbidden' }, { status: 403 });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (progress !== undefined) updates.progress = progress;
    if (status) updates.status = status;
    if (notes) updates.notes = notes;

    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Optional: Notify Admin if completed (suppressed if admin is in a focus block)
    if (status === 'Completed' && taskCheck.assigned_by) {
      await sendNotification(supabase, {
         user_id: taskCheck.assigned_by,
         type: 'TASK_COMPLETED',
         title: 'Task Completed',
         message: `Employee finished task: ${taskCheck.title}`,
         action_url: `/admin/tasks`
      });
    }

    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
