import { NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Ensure bookmarks array exists in case of old DB
  if (!MockDB.bookmarks) {
    MockDB.bookmarks = [];
  }

  const userBookmarks = MockDB.bookmarks
    .filter((b: any) => b.user_id === userId)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ success: true, data: userBookmarks });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { user_id, title, url, description, favicon } = data;

    if (!user_id || !url) {
      return NextResponse.json({ error: 'User ID and URL are required' }, { status: 400 });
    }

    if (!MockDB.bookmarks) {
      MockDB.bookmarks = [];
    }

    // Check for duplicates
    if (MockDB.bookmarks.some((b: any) => b.url === url && b.user_id === user_id)) {
      return NextResponse.json({ error: 'Bookmark already exists' }, { status: 400 });
    }

    const newBookmark = {
      id: `bm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id,
      title: title || url,
      url,
      description: description || '',
      favicon: favicon || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`,
      created_at: new Date().toISOString()
    };

    MockDB.bookmarks.push(newBookmark);
    saveMockDB();

    return NextResponse.json({ success: true, data: newBookmark }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
