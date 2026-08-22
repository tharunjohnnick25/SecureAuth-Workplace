import { NextRequest, NextResponse } from 'next/server';
import { isMockMode } from '@/lib/mock-employees';
import { ChatStore } from '@/lib/mock-chat';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;

    // Force universal use of ChatStore since Postgres tables don't exist yet
    const conversation = ChatStore.getConversation(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found', success: false }, { status: 404 });
    }
    return NextResponse.json({ data: ChatStore.getMessages(conversationId), success: true });
    
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

    // Force universal use of ChatStore since Postgres tables don't exist yet
    const message = ChatStore.sendMessage(
      conversationId,
      { employee_id: body.sender_employee_id, full_name: body.sender_name || body.sender_employee_id },
      String(body.content).trim()
    );
    if (!message) {
      return NextResponse.json({ error: 'Conversation not found or sender is not a participant', success: false }, { status: 403 });
    }
    return NextResponse.json({ data: message, success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to send message', success: false }, { status: 500 });
  }
}
