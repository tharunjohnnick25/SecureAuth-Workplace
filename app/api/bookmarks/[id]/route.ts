import { NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!MockDB.bookmarks) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const index = MockDB.bookmarks.findIndex((b: any) => b.id === id && b.user_id === userId);
    if (index === -1) {
      return NextResponse.json({ error: 'Bookmark not found or unauthorized' }, { status: 404 });
    }

    MockDB.bookmarks.splice(index, 1);
    saveMockDB();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
