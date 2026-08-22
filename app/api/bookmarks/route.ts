import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Helper to get or initialize bookmarks
async function getBookmarks(userId: string) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    const { MockEmployees } = await import('@/lib/mock-employees');
    const user = MockEmployees.getById(userId);
    return (user?.bookmarks as any[]) || [];
  } else {
    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
    return authUser?.user?.user_metadata?.bookmarks || [];
  }
}

// Helper to save bookmarks
async function saveBookmarks(userId: string, newBookmarks: any[]) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    const { MockEmployees } = await import('@/lib/mock-employees');
    MockEmployees.update(userId, { bookmarks: newBookmarks });
  } else {
    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
    const existingMetadata = authUser?.user?.user_metadata || {};
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { ...existingMetadata, bookmarks: newBookmarks }
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'user_id is required' }, { status: 400 });
    }

    const bookmarks = await getBookmarks(userId);
    return NextResponse.json({ success: true, data: bookmarks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, title, url, description, tags, is_pinned } = body;

    if (!user_id || !title || !url) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const bookmarks = await getBookmarks(user_id);
    const newBookmark = {
      id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title,
      url,
      description: description || '',
      tags: tags || [],
      is_pinned: !!is_pinned,
      created_at: new Date().toISOString()
    };

    bookmarks.unshift(newBookmark); // Add to top
    await saveBookmarks(user_id, bookmarks);

    return NextResponse.json({ success: true, data: newBookmark }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop() || new URL(req.url).searchParams.get('id'); // Will be updated correctly below
    const body = await req.json();
    const { user_id, bookmark_id, ...updates } = body;

    const bId = bookmark_id || id;
    if (!user_id || !bId) return NextResponse.json({ success: false, error: 'user_id and bookmark_id required' }, { status: 400 });

    let bookmarks = await getBookmarks(user_id);
    bookmarks = bookmarks.map(b => b.id === bId ? { ...b, ...updates } : b);
    await saveBookmarks(user_id, bookmarks);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const bookmark_id = searchParams.get('id');

    if (!user_id || !bookmark_id) {
      return NextResponse.json({ success: false, error: 'user_id and id required' }, { status: 400 });
    }

    let bookmarks = await getBookmarks(user_id);
    bookmarks = bookmarks.filter(b => b.id !== bookmark_id);
    await saveBookmarks(user_id, bookmarks);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
