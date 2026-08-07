import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const notes = MockDB.notes.filter((n: any) => n.user_id === userId);

    // Sort by pinned first, then by updated_at descending
    notes.sort((a: any, b: any) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return NextResponse.json({ data: notes, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, title, content, color, is_pinned } = body;

    if (!user_id || (!title && !content)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newNote = {
      id: `note-${Date.now()}`,
      user_id,
      title: title || '',
      content: content || '',
      color: color || 'bg-white/5',
      is_pinned: is_pinned ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    MockDB.notes.push(newNote as any);
    saveMockDB();

    return NextResponse.json({ data: newNote, success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
