/**
 * Seeds the live cloud Supabase database from .data/mock-employees.json.
 *
 * What it does:
 *   1. Creates (or resets) an Auth account for every entry in mock-employees.json
 *      using the Supabase Admin API. The on_auth_user_created trigger auto-creates
 *      each public.users profile row.
 *   2. Upserts each public.users profile so roles, departments, employee IDs and
 *      manager links (manager_id) are correct for the workflow testing.
 *
 * Usage:
 *   node scratch/seed.js            # run (writes to the live database)
 *   node scratch/seed.js --dry-run  # print the plan without writing anything
 *
 * Notes:
 *   - Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local.
 *   - All accounts are given the password: Welcome@123 (existing accounts are
 *     reset to this password too).
 *   - Idempotent: accounts that already exist are matched by email and updated.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const DEFAULT_PASSWORD = 'Welcome@123';
const RATE_LIMIT_DELAY_MS = 150;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const mockPath = path.resolve(process.cwd(), '.data', 'mock-employees.json');
const employees = JSON.parse(fs.readFileSync(mockPath, 'utf8'));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeRole(role) {
  if (!role) return 'employee';
  const r = String(role).toLowerCase();
  if (r.includes('super')) return 'super_admin';
  if (r === 'admin') return 'admin';
  if (r === 'manager') return 'manager';
  return 'employee';
}

async function findUserIdByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  const found = (data?.users || []).find(
    (u) => u.email && u.email.toLowerCase() === email.toLowerCase()
  );
  return found?.id || null;
}

function buildProfile(employee, managerIdMap) {
  const managerId = employee.manager_id ? managerIdMap[employee.manager_id] || null : null;
  return {
    id: employee.id,
    email: employee.email,
    full_name: employee.full_name,
    role: normalizeRole(employee.role),
    department: employee.department || null,
    designation: employee.designation || null,
    employee_id: employee.employee_id || null,
    phone: employee.phone || null,
    employment_type: employee.employment_type || 'Full-time',
    status: 'active',
    date_of_joining: employee.date_of_joining || null,
    date_of_birth: employee.date_of_birth || null,
    gender: employee.gender || null,
    blood_group: employee.blood_group || null,
    salary: employee.salary || null,
    manager_id: managerId,
  };
}

async function main() {
  console.log(`Seeding ${employees.length} employee(s) from ${mockPath}`);
  console.log(`Default password for all accounts: ${DEFAULT_PASSWORD}`);
  if (DRY_RUN) {
    console.log('\n*** DRY RUN — no changes will be written ***\n');
  }

  const idMap = {}; // old mock id -> new auth user id
  const errors = [];
  let created = 0;
  let updated = 0;

  // Pass 1: create / confirm Auth users and build the id map.
  for (const employee of employees) {
    const role = normalizeRole(employee.role);
    if (DRY_RUN) {
      console.log(`[dry-run] create auth user  ${employee.email}  (role: ${role})`);
      continue;
    }

    await sleep(RATE_LIMIT_DELAY_MS);
    try {
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email: employee.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
      });

      let userId = authData?.user?.id;

      if (createError) {
        if (String(createError.message).toLowerCase().includes('already')) {
          userId = await findUserIdByEmail(employee.email);
          if (userId) {
            await supabase.auth.admin.updateUserById(userId, { password: DEFAULT_PASSWORD });
            updated += 1;
            console.log(`  exists: ${employee.email} -> ${userId} (password reset to ${DEFAULT_PASSWORD})`);
          } else {
            errors.push(`${employee.email}: auth account exists but user ID could not be resolved`);
          }
        } else {
          throw createError;
        }
      } else {
        created += 1;
        console.log(`  created: ${employee.email} -> ${userId}`);
      }

      if (userId) idMap[employee.id] = userId;
    } catch (err) {
      errors.push(`${employee.email}: ${err.message}`);
    }
  }

  // Pass 2: upsert public.users profiles (needs the complete id map for manager links).
  for (const employee of employees) {
    const newId = idMap[employee.id];
    if (!newId) continue;
    if (DRY_RUN) continue;

    await sleep(RATE_LIMIT_DELAY_MS / 2);
    try {
      const profile = buildProfile(
        { ...employee, id: newId },
        idMap
      );
      const { error: upsertError } = await supabase.from('users').upsert(profile);
      if (upsertError) throw upsertError;
      console.log(
        `  profile:   ${employee.email}  -> role=${profile.role}, manager=${profile.manager_id ? 'linked' : 'none'}`
      );
    } catch (err) {
      errors.push(`${employee.email}: profile upsert failed: ${err.message}`);
    }
  }

  console.log('\n=== Summary ===');
  if (DRY_RUN) {
    console.log(`Would create ${employees.length} account(s). No changes were made.`);
  } else {
    console.log(`Auth accounts created: ${created}, reset/updated: ${updated}`);
    console.log(`Profiles upserted: ${Object.keys(idMap).length}`);
  }
  if (errors.length) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach((e) => console.log(`  - ${e}`));
    process.exitCode = 1;
  } else {
    console.log('Seed complete. Log in with any email above and password Welcome@123.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
