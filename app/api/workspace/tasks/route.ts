import { NextRequest, NextResponse } from 'next/server';
import { MockWorkspace } from '@/lib/mock-workspace';

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assignee = searchParams.get('assignee');
  const role = searchParams.get('role');
  
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    const DATA_FILE = join(process.cwd(), '.data', 'mock-workspace.json');
    if (existsSync(DATA_FILE)) {
      const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
      return NextResponse.json({ tasks: parsed.tasks || [] });
    }
    return NextResponse.json({ tasks: [] });
  }

  if (!assignee) {
    return NextResponse.json({ error: 'Assignee is required' }, { status: 400 });
  }

  const tasks = MockWorkspace.getTasksForUser(assignee);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.title || !data.status || !data.assignee || !data.priority) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newTask = MockWorkspace.addTask({
      title: data.title,
      description: data.description,
      status: data.status,
      assignee: data.assignee,
      assignee_name: data.assignee_name,
      created_by: data.created_by,
      priority: data.priority,
    });

    return NextResponse.json({ task: newTask }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updated = MockWorkspace.updateTask(data.id, data);
    if (!updated) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const success = MockWorkspace.deleteTask(id);
    if (!success) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
