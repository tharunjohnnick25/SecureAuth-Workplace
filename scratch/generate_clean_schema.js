const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort(); 

let combined = `-- ==========================================
-- COMPLETE SCHEMA RESET AND MIGRATION SCRIPT
-- ==========================================

-- WARNING: THIS WILL DROP ALL EXISTING TABLES IN PUBLIC SCHEMA AND DELETE ALL AUTH USERS
DELETE FROM auth.users;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Restore Default Supabase Permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

`;

for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  combined += `\n\n-- ==========================================\n-- MIGRATION: ${file}\n-- ==========================================\n\n`;
  combined += content;
}

fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'clean_schema_combined.sql'), combined);
console.log('clean_schema_combined.sql created with auth.users wipe!');
