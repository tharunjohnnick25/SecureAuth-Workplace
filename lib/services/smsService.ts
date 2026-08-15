import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), '.data');
const INBOX_FILE = join(DATA_DIR, 'mock-sms-inbox.json');

interface MockSmsMessage {
  id: string;
  to: string;
  body: string;
  sentAt: string;
}

function loadInbox(): MockSmsMessage[] {
  try {
    if (existsSync(INBOX_FILE)) {
      const parsed = JSON.parse(readFileSync(INBOX_FILE, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fall through to empty inbox.
  }
  return [];
}

function persistInbox(inbox: MockSmsMessage[]) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(INBOX_FILE, JSON.stringify(inbox, null, 2), 'utf-8');
  } catch {
    // Never crash the request because persistence failed.
  }
}

export type SmsDelivery = { provider: 'mock'; inboxId: string };

export const SmsService = {
  isConfigured: () => true,

  async send(to: string, body: string): Promise<SmsDelivery> {
    const inbox = loadInbox();
    const record: MockSmsMessage = {
      id: crypto.randomUUID(),
      to,
      body,
      sentAt: new Date().toISOString(),
    };
    inbox.push(record);
    persistInbox(inbox);

    console.log(`[SMS:MOCK] -> ${to} : ${body}`);

    return { provider: 'mock', inboxId: record.id };
  },

  getInbox(): MockSmsMessage[] {
    return loadInbox();
  },
};
