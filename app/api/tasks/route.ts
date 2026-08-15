import { NextRequest, NextResponse } from 'next/server';
import { getMockDB, saveMockDB } from '@/lib/mock-db';
import { MockEmployees } from '@/lib/mock-employees';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const db = getMockDB();

    let tasks = db.tasks || [];

    if (role === 'EMPLOYEE' && userId) {
      tasks = tasks.filter((t: any) => t.assigned_to === userId);
    } else if (role === 'MANAGER' && userId) {
      // Manager can see tasks they assigned
      tasks = tasks.filter((t: any) => t.assigned_by === userId);
    } else if (role === 'ADMIN') {
      // Admins see all tasks
    }

    // Attach employee info
    const tasksWithDetails = tasks.map((t: any) => {
      const employee = MockEmployees.getById(t.assigned_to);
      return {
        ...t,
        assignee_name: employee?.full_name || 'Unknown',
        department: employee?.department || 'Unknown',
      };
    });

    return NextResponse.json(tasksWithDetails);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, assigned_to, assigned_by, priority, deadline } = body;

    if (!title || !assigned_to || !assigned_by) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getMockDB();
    const newTask = {
      id: `task-${Date.now()}`,
      title,
      description: description || '',
      assigned_to,
      assigned_by,
      priority: priority || 'Medium',
      deadline: deadline || new Date(Date.now() + 86400000 * 7).toISOString(),
      status: 'Pending',
      progress: 0,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!db.tasks) db.tasks = [];
    db.tasks.push(newTask);
    saveMockDB();

    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
