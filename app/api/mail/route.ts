import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendNotification } from '@/lib/notify';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'inbox'; // inbox, sent, trash, starred

    // Starred is a flag, not a folder — query by is_starred instead
    const isStarred = folder === 'starred';

    let query = supabase
      .from('internal_emails')
      .select(`
        *,
        sender:sender_id(id, full_name, email, avatar_url),
        recipient:recipient_id(id, full_name, email, avatar_url)
      `)
      .eq('owner_id', session.user.id);

    if (isStarred) {
      query = query.eq('is_starred', true).neq('folder', 'trash');
    } else {
      query = query.eq('folder', folder);
    }

    const { data: emails, error } = await query.order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet, return empty array to prevent crashing UI before migration
        return NextResponse.json({ success: true, data: [] });
      }
      throw error;
    }

    // Format response to match frontend expectations
    const formatted = (emails || []).map(e => ({
      ...e,
      sender: e.sender ? { id: e.sender.id, name: e.sender.full_name, email: e.sender.email, avatar: e.sender.avatar_url } : null,
      recipient: e.recipient ? { id: e.recipient.id, name: e.recipient.full_name, email: e.recipient.email, avatar: e.recipient.avatar_url } : null
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { recipient_id, subject, body: emailBody } = body;

    if (!recipient_id || !subject) {
      return NextResponse.json({ success: false, error: 'Recipient and subject are required' }, { status: 400 });
    }

    // 1. Fetch sender's company_id
    const { data: senderUser, error: senderError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', session.user.id)
      .single();
    
    if (senderError || !senderUser?.company_id) {
      return NextResponse.json({ success: false, error: 'Sender company not found' }, { status: 400 });
    }

    // 2. Fetch recipient and validate they belong to the EXACT same company
    const { data: recipientUser, error: recipientError } = await supabase
      .from('users')
      .select('company_id, full_name')
      .eq('id', recipient_id)
      .single();

    if (recipientError || !recipientUser) {
      return NextResponse.json({ success: false, error: 'Recipient not found' }, { status: 404 });
    }

    if (recipientUser.company_id !== senderUser.company_id) {
      return NextResponse.json({ success: false, error: 'Forbidden: Cannot send mail outside your company' }, { status: 403 });
    }

    // Dynamic import to avoid edge runtime issues
    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    // 3. Insert dual ownership records (one for sender's Sent folder, one for recipient's Inbox)
    const { data: newEmails, error: insertError } = await (supabaseAdmin as any)
      .from('internal_emails')
      .insert([
        {
          owner_id: session.user.id,
          company_id: senderUser.company_id,
          sender_id: session.user.id,
          recipient_id: recipient_id,
          subject,
          body: emailBody || '',
          folder: 'sent',
          is_read: true, // sender already read it
        },
        {
          owner_id: recipient_id,
          company_id: senderUser.company_id,
          sender_id: session.user.id,
          recipient_id: recipient_id,
          subject,
          body: emailBody || '',
          folder: 'inbox',
          is_read: false,
        }
      ])
      .select();

    if (insertError) {
      if (insertError.code === '42P01') {
        return NextResponse.json({ success: false, error: 'Database migration required' }, { status: 500 });
      }
      throw insertError;
    }

    // 4. Send Notification to recipient
    await sendNotification(supabase, {
      user_id: recipient_id,
      title: 'New Internal Email',
      message: `You have a new email: ${subject}`,
      type: 'INFO'
    });

    // Return the sender's copy
    const sentCopy = newEmails?.find(e => e.owner_id === session.user.id);
    return NextResponse.json({ success: true, data: sentCopy }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
