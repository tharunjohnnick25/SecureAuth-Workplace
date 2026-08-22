const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const sql = `
    ALTER TABLE IF EXISTS threat_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    ALTER TABLE IF EXISTS office_access_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    
    DO $$
    DECLARE
      target_company_id UUID;
    BEGIN
      SELECT company_id INTO target_company_id FROM users WHERE role = 'super_admin' OR role = 'admin' LIMIT 1;
      
      IF target_company_id IS NOT NULL THEN
        UPDATE security_events SET company_id = target_company_id WHERE company_id IS NULL;
        UPDATE login_history SET company_id = target_company_id WHERE company_id IS NULL;
        UPDATE threat_logs SET company_id = target_company_id WHERE company_id IS NULL;
        UPDATE office_access_logs SET company_id = target_company_id WHERE company_id IS NULL;
        UPDATE risk_scores SET company_id = target_company_id WHERE company_id IS NULL;
      END IF;
    END $$;
  `;
  const { data, error } = await supabaseAdmin.rpc('admin_exec_sql', { query: sql });
  console.log('Result:', data, 'Error:', error);
}
run();
