import { NextRequest, NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    
    const noteIdx = MockDB.notes.findIndex((n: any) => n.id === id);
    if (noteIdx === -1) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Merge updates
    MockDB.notes[noteIdx] = {
      ...MockDB.notes[noteIdx],
      ...body,
      updated_at: new Date().toISOString()
    };

    saveMockDB();

    return NextResponse.json({ data: MockDB.notes[noteIdx], success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    const noteIdx = MockDB.notes.findIndex((n: any) => n.id === id);
    if (noteIdx === -1) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    MockDB.notes.splice(noteIdx, 1);
    saveMockDB();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
