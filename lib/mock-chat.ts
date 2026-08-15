import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface ChatParticipant {
  id: string;
  employee_id: string;
  full_name: string;
  role: string;
}

export interface Conversation {
  id: string;
  key: string;
  participants: ChatParticipant[];
  created_at: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count?: number;
  is_favorite?: boolean;
  has_mention?: boolean;
  is_invite?: boolean;
  is_group?: boolean;
  group_name?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_employee_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

const DATA_DIR = join(process.cwd(), '.data');
const DATA_FILE = join(DATA_DIR, 'mock-chat.json');

interface ChatStoreFile {
  conversations: Conversation[];
  messages: ChatMessage[];
}

const EMPTY: ChatStoreFile = { conversations: [], messages: [] };

function load(): ChatStoreFile {
  try {
    if (existsSync(DATA_FILE)) {
      const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
      if (parsed && Array.isArray(parsed.conversations) && Array.isArray(parsed.messages)) {
        return parsed as ChatStoreFile;
      }
    }
  } catch {
    // Corrupted or unreadable file — fall back to empty store.
  }
  return { conversations: [], messages: [] };
}

let store: ChatStoreFile = load();

function persist() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Never crash a request because persistence failed.
  }
}

export function sortedKey(a: string, b: string): string {
  return [a, b].sort().join('::');
}

export const ChatStore = {
  listConversations(employeeId: string): Conversation[] {
    return store.conversations
      .filter((c) => c.participants.some((p) => p.employee_id === employeeId))
      .map(c => ({
        ...c,
        // Mock data to demonstrate filters
        unread_count: c.unread_count ?? (Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0),
        is_favorite: c.is_favorite ?? (Math.random() > 0.8),
        has_mention: c.has_mention ?? (Math.random() > 0.8),
        is_invite: c.is_invite ?? false
      }))
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  },

  getConversation(id: string): Conversation | undefined {
    return store.conversations.find((c) => c.id === id);
  },

  getOrCreateConversation(self: ChatParticipant, other: ChatParticipant): Conversation {
    const key = sortedKey(self.employee_id, other.employee_id);
    const existing = store.conversations.find((c) => c.key === key);
    if (existing) return existing;

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      key,
      participants: [self, other],
      created_at: now,
      last_message_at: now,
      last_message_preview: '',
    };
    store.conversations.push(conversation);
    persist();
    return conversation;
  },

  createGroupConversation(participants: ChatParticipant[], groupName: string): Conversation {
    const key = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: key,
      key,
      participants,
      created_at: now,
      last_message_at: now,
      last_message_preview: `Group '${groupName}' created`,
      is_group: true,
      group_name: groupName,
    };
    store.conversations.push(conversation);
    persist();
    return conversation;
  },

  getMessages(conversationId: string): ChatMessage[] {
    return store.messages
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  sendMessage(conversationId: string, sender: { employee_id: string; full_name: string }, content: string): ChatMessage | undefined {
    const conversation = store.conversations.find((c) => c.id === conversationId);
    if (!conversation) return undefined;
    if (!conversation.participants.some((p) => p.employee_id === sender.employee_id)) return undefined;

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conversation_id: conversationId,
      sender_employee_id: sender.employee_id,
      sender_name: sender.full_name,
      content,
      created_at: new Date().toISOString(),
    };
    store.messages.push(message);
    conversation.last_message_at = message.created_at;
    conversation.last_message_preview = content;
    persist();
    return message;
  },
};
