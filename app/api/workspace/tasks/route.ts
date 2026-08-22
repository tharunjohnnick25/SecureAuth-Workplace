import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { MockWorkspace } from '@/lib/mock-workspace';

import { createServerSupabaseClient } from '@/lib/supabase/server';

// Helper to authenticate request
async function getAuthAndProfile(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
     const mockCookie = req.cookies.get('sb-qbeulfmjmmwcbxuzocdv-auth-token')?.value;
     if (!mockCookie) return { error: 'Unauthorized', status: 401 };
     try {
       const parsed = JSON.parse(mockCookie);
       const userId = parsed.user?.id || 'mock-user';
       const role = parsed.user?.role?.toLowerCase() || 'employee';
       return { 
         session: { user: { id: userId } },
         profile: { id: userId, company_id: 'mock-company', role },
         adminClient: null as any
       };
     } catch {
       return { error: 'Unauthorized', status: 401 };
     }
  }

  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) return { error: 'Unauthorized', status: 401 };

  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: profile } = await adminClient
    .from('users')
    .select('id, company_id, role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !profile.company_id) return { error: 'Company association required', status: 403 };

  return { session, profile, adminClient };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthAndProfile(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const assignee = searchParams.get('assignee');
    const assignedBy = searchParams.get('assigned_by');
    const { profile, adminClient } = auth;
    const isAdmin = ['admin', 'super_admin'].includes(profile.role);

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      const allEmp = require('@/lib/mock-employees').MockEmployees.getAll();
      let allTasks: any[] = [];
      for (const emp of allEmp) {
         allTasks = [...allTasks, ...MockWorkspace.getTasksByAssignee(emp.id)];
      }
      // Add tasks assigned to the current mock user
      const userTasks = MockWorkspace.getTasksForUser(profile.id);
      const uniqueTasks = new Map();
      [...allTasks, ...userTasks].forEach(t => uniqueTasks.set(t.id, t));
      let tasks = Array.from(uniqueTasks.values());

      // If NOT admin, restrict the pool of tasks to their scope
      if (!isAdmin) {
         if (profile.role?.toLowerCase() === 'manager') {
            tasks = tasks.filter(t => t.assignee === profile.id || t.assigned_to === profile.id || t.created_by === profile.id);
         } else {
            tasks = tasks.filter(t => t.assignee === profile.id || t.assigned_to === profile.id);
         }
      }

      // Apply explicit query filters
      if (assignee) {
         tasks = tasks.filter(t => t.assignee === assignee || t.assigned_to === assignee);
      }
      if (assignedBy) {
         tasks = tasks.filter(t => t.created_by === assignedBy);
      }

      return NextResponse.json({ tasks: tasks.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) });
    }

    let query = adminClient.from('tasks').select('*').eq('company_id', profile.company_id);

    if (!isAdmin) {
      if (profile.role?.toLowerCase() === 'manager') {
        // Managers can see their own tasks AND tasks they assigned to their team
        query = query.or(`assigned_to.eq.${profile.id},assigned_by.eq.${profile.id}`);
      } else {
        // Employees can only see their own tasks
        query = query.eq('assigned_to', profile.id);
      }
    }

    // Apply explicit filters within the authorized scope
    if (assignee) {
      query = query.eq('assigned_to', assignee);
    }
    if (assignedBy) {
      query = query.eq('assigned_by', assignedBy);
    }

    const { data: tasks, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthAndProfile(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { profile, adminClient } = auth;
    const data = await req.json();

    if (!data.title || !data.status || !data.assignee || !data.priority) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      const newTask = MockWorkspace.addTask({
        title: data.title,
        description: data.description,
        status: data.status,
        assignee: data.assignee,
        priority: data.priority,
        created_by: profile.id
      });
      return NextResponse.json({ task: newTask }, { status: 201 });
    }

    const { data: newTask, error } = await adminClient.from('tasks').insert({
      company_id: profile.company_id,
      title: data.title,
      description: data.description,
      status: data.status,
      assigned_to: data.assignee,
      assigned_by: profile.id,
      priority: data.priority,
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthAndProfile(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { profile, adminClient } = auth;
    const data = await req.json();

    if (!data.id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      const updatedTask = MockWorkspace.updateTask(data.id, {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
      });
      if (!updatedTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      return NextResponse.json({ task: updatedTask });
    }

    // Verify task belongs to company
    const { data: existingTask } = await adminClient.from('tasks').select('id, assigned_to').eq('id', data.id).eq('company_id', profile.company_id).single();
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only assignee or admin can update
    const isAdmin = ['admin', 'super_admin'].includes(profile.role);
    if (!isAdmin && existingTask.assigned_to !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: updatedTask, error } = await adminClient.from('tasks').update({
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
    }).eq('id', data.id).select().single();

    if (error) throw error;

    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthAndProfile(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { profile, adminClient } = auth;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
      const success = MockWorkspace.deleteTask(id);
      if (!success) return NextResponse.json({ error: 'Task not found or could not be deleted' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    // Only admin can delete tasks
    const isAdmin = ['admin', 'super_admin'].includes(profile.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await adminClient.from('tasks').delete().eq('id', id).eq('company_id', profile.company_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
