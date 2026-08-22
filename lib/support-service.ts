import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export interface SupportQueryRow {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
}

export interface CreateSupportInput {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export async function createSupportQuery(
  admin: SupabaseClient,
  userId: string,
  input: CreateSupportInput
): Promise<SupportQueryRow> {
  const message = input.message?.trim();
  if (!message) {
    throw new Error('Message is required');
  }

  const { data, error } = await admin
    .from('support_queries')
    .insert({
      id: randomUUID(),
      user_id: userId,
      name: input.name?.trim() || null,
      email: input.email?.trim() || null,
      subject: input.subject?.trim() || null,
      message,
      status: 'OPEN',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as SupportQueryRow;
}

export async function fetchSupportQueries(
  admin: SupabaseClient,
  caller: { id: string; company_id: string | null; role: string }
): Promise<SupportQueryRow[]> {
  const role = (caller.role || '').toLowerCase();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const select = `
    *,
    users!support_queries_user_id_fkey (
      full_name,
      email,
      company_id
    )
  `;

  let query = admin.from('support_queries').select(select).order('created_at', { ascending: false });

  if (isAdmin && caller.company_id) {
    query = query.eq('users.company_id', caller.company_id);
  } else if (!isAdmin) {
    query = query.eq('user_id', caller.id);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []) as unknown as SupportQueryRow[];
}
