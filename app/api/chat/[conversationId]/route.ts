import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mock-employees';
import { ChatStore } from '@/lib/mock-chat';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;

    if (isMockMode()) {
      const conversation = ChatStore.getConversation(conversationId);
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found', success: false }, { status: 404 });
      }
      return NextResponse.json({ data: ChatStore.getMessages(conversationId), success: true });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();
    if (!conv || (conv.participant_a !== user.id && conv.participant_b !== user.id)) {
      return NextResponse.json({ error: 'Conversation not found or forbidden', success: false }, { status: 403 });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const mapped = (messages || []).map((m: any) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      sender_employee_id: m.sender_id,
      sender_name: m.sender_name || m.sender_id,
      content: m.content,
      created_at: m.created_at,
    }));
    return NextResponse.json({ data: mapped, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load messages', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const body = await req.json();

    if (!body.sender_employee_id || !body.content?.trim()) {
      return NextResponse.json({ error: 'sender_employee_id and content are required', success: false }, { status: 400 });
    }

    if (isMockMode()) {
      const message = ChatStore.sendMessage(
        conversationId,
        { employee_id: body.sender_employee_id, full_name: body.sender_name || body.sender_employee_id },
        String(body.content).trim()
      );
      if (!message) {
        return NextResponse.json({ error: 'Conversation not found or sender is not a participant', success: false }, { status: 403 });
      }
      return NextResponse.json({ data: message, success: true });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();
    if (!conv || (conv.participant_a !== user.id && conv.participant_b !== user.id)) {
      return NextResponse.json({ error: 'Conversation not found or forbidden', success: false }, { status: 403 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_name: body.sender_name || user.email,
        content: String(body.content).trim(),
        created_at: new Date().toISOString(),
        read: false,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    await supabase
      .from('conversations')
      .update({ last_message_preview: String(body.content).trim(), updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({
      data: {
        id: inserted.id,
        conversation_id: conversationId,
        sender_employee_id: user.id,
        sender_name: inserted.sender_name || user.email,
        content: inserted.content,
        created_at: inserted.created_at,
      },
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to send message', success: false }, { status: 500 });
  }
}
