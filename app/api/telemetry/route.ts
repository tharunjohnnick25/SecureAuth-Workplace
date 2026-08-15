import { NextRequest, NextResponse } from 'next/server';
import { getMockDB } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');

    if (!table) {
      return NextResponse.json({ error: 'Table parameter is required' }, { status: 400 });
    }

    const db = getMockDB();
    const data = (db as any)[table] || [];

    // Apply sorting logic similar to supabase if needed (we can do a simple order by created_at or last_active desc)
    let sortedData = [...data];
    if (table === 'devices') {
      sortedData.sort((a, b) => new Date(b.last_active || b.last_used || 0).getTime() - new Date(a.last_active || a.last_used || 0).getTime());
    } else {
      // General sort by created_at desc
      sortedData.sort((a, b) => new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime());
    }

    return NextResponse.json({ data: sortedData });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
