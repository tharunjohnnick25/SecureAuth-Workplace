import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notify';
import { isMockMode } from '@/lib/mock-employees';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function GET(req: Request) {
  try {
    if (isMockMode()) {
      const tasks = (MockDB.tasks || [])
        .slice()
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return NextResponse.json({ success: true, data: tasks });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'super_admin') {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, assigned_to, priority, deadline } = body;

    if (!title || !assigned_to) {
       return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (isMockMode()) {
      const now = new Date().toISOString();
      const newTask = {
        id: `task-${Date.now()}`,
        title,
        description: description || '',
        assigned_to,
        assigned_by: 'admin-1',
        priority: priority || 'Medium',
        deadline: deadline || null,
        status: 'In Progress',
        progress: 0,
        notes: '',
        created_at: now,
        updated_at: now,
      };
      MockDB.tasks = MockDB.tasks || [];
      MockDB.tasks.push(newTask as any);
      saveMockDB();
      return NextResponse.json({ success: true, data: newTask });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'super_admin') {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert([{
         title,
         description,
         assigned_to,
         assigned_by: user.id,
         priority: priority || 'Medium',
         deadline,
         status: 'In Progress',
         progress: 0
      }]).select().single();

    if (error) throw error;

    // Optionally notify the employee (suppressed while they're in a focus block)
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

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;
    
    if (!id || !status) return NextResponse.json({ success: false, error: 'ID and status required' }, { status: 400 });

    if (isMockMode()) {
      const taskIdx = (MockDB.tasks || []).findIndex((t: any) => t.id === id);
      if (taskIdx === -1) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
      MockDB.tasks[taskIdx].status = status;
      MockDB.tasks[taskIdx].updated_at = new Date().toISOString();
      saveMockDB();
      return NextResponse.json({ success: true, data: MockDB.tasks[taskIdx] });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'super_admin') {
       return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
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
