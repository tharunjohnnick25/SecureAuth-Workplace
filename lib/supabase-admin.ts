import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

let _adminClient: ReturnType<typeof createClient<Database>> | null = null;

function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return _adminClient;
}

// Admin client with service_role key to bypass RLS
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_, prop) {
    return getAdminClient()[prop as keyof ReturnType<typeof createClient<Database>>];
  },
});
