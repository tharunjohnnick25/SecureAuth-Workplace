import { NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { is_read, is_starred, folder } = await request.json();

    const emailIndex = MockDB.emails.findIndex(e => e.id === params.id && e.owner_id === userId);
    if (emailIndex === -1) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const email = MockDB.emails[emailIndex];

    if (is_read !== undefined) email.is_read = is_read;
    if (is_starred !== undefined) email.is_starred = is_starred;
    if (folder !== undefined) email.folder = folder;

    saveMockDB();

    return NextResponse.json({ data: email });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailIndex = MockDB.emails.findIndex(e => e.id === params.id && e.owner_id === userId);
    if (emailIndex === -1) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Permanently remove
    MockDB.emails.splice(emailIndex, 1);
    saveMockDB();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
