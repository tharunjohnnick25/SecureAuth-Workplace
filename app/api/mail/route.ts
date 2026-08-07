import { NextResponse } from 'next/server';
import { MockDB, saveMockDB } from '@/lib/mock-db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = request.headers.get('x-user-id');
    const folder = url.searchParams.get('folder') || 'inbox'; // inbox, sent, trash, starred

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let emails = MockDB.emails.filter(e => e.owner_id === userId);

    if (folder === 'starred') {
      emails = emails.filter(e => e.is_starred && e.folder !== 'trash');
    } else {
      emails = emails.filter(e => e.folder === folder);
    }

    // Sort by newest first
    emails.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Populate sender and recipient info
    const populatedEmails = emails.map(email => {
      const sender = MockDB.employees.find(e => e.id === email.sender_id);
      const recipient = MockDB.employees.find(e => e.id === email.recipient_id);
      return {
        ...email,
        sender: sender ? { id: sender.id, name: sender.full_name, email: sender.email, avatar: sender.profile_picture } : null,
        recipient: recipient ? { id: recipient.id, name: recipient.full_name, email: recipient.email, avatar: recipient.profile_picture } : null
      };
    });

    return NextResponse.json({ data: populatedEmails });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipient_id, subject, body } = await request.json();
    if (!recipient_id || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const recipient = MockDB.employees.find(e => e.id === recipient_id);
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const emailId = `email-${Date.now()}`;

    // Create copy for sender (in sent folder)
    const senderCopy = {
      id: `${emailId}-sent`,
      owner_id: userId,
      sender_id: userId,
      recipient_id,
      subject,
      body,
      folder: 'sent',
      is_read: true,
      is_starred: false,
      created_at: now
    };

    // Create copy for recipient (in inbox)
    const recipientCopy = {
      id: `${emailId}-inbox`,
      owner_id: recipient_id,
      sender_id: userId,
      recipient_id,
      subject,
      body,
      folder: 'inbox',
      is_read: false,
      is_starred: false,
      created_at: now
    };

    MockDB.emails.push(senderCopy, recipientCopy);
    saveMockDB();

    return NextResponse.json({ data: senderCopy }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
