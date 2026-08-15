import { createAdminClient } from './supabase/server';
import { isMockMode, MockEmployees } from './mock-employees';
import { ROLES } from './roles';

/**
 * Maps Google Workspace/Azure AD group emails to internal RBAC roles.
 */
const GROUP_ROLE_MAPPING: Record<string, string> = {
  'tcs-admins@tcs.com': ROLES.ADMIN,
  'tcs-managers@tcs.com': ROLES.MANAGER,
  'tcs-employees@tcs.com': ROLES.EMPLOYEE,
};

/**
 * Mock representation of an external IdP API call.
 * In a real scenario, this would use the Google Admin SDK (admin.directory.users.list)
 * or Microsoft Graph API.
 */
async function fetchIdpUsersAndGroups(): Promise<{ email: string; groups: string[] }[]> {
  // Simulating an external API fetch
  return [
    { email: 'tharun@tcs.com', groups: ['tcs-admins@tcs.com'] },
    { email: 'alice@tcs.com', groups: ['tcs-managers@tcs.com'] },
    { email: 'bob@tcs.com', groups: ['tcs-employees@tcs.com'] },
  ];
}

/**
 * Determines the highest role a user has based on their IdP groups.
 */
function resolveRoleFromGroups(groups: string[]): string {
  if (groups.includes('tcs-admins@tcs.com')) return ROLES.ADMIN;
  if (groups.includes('tcs-managers@tcs.com')) return ROLES.MANAGER;
  return ROLES.EMPLOYEE;
}

/**
 * Synchronizes user roles from the Identity Provider.
 * Updates the database and logs any changes to the audit trail.
 */
export async function syncRolesFromIdP(triggeredBy: string = 'system') {
  const idpData = await fetchIdpUsersAndGroups();
  
  if (isMockMode()) {
    let changed = 0;
    for (const record of idpData) {
      const user = MockEmployees.findByEmail(record.email);
      if (!user) continue;

      const newRole = resolveRoleFromGroups(record.groups);
      if (user.role !== newRole) {
        MockEmployees.update(user.id, { role: newRole });
        console.log(`[MOCK IDP SYNC] Updated ${user.email} from ${user.role} to ${newRole}`);
        changed++;
      }
    }
    return { success: true, changed, provider: 'mock' };
  }

  const supabase = await createAdminClient();
  let changedCount = 0;

  for (const record of idpData) {
    const newRole = resolveRoleFromGroups(record.groups);

    // Fetch current user
    const { data: user } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', record.email)
      .single();

    if (!user || user.role === newRole) continue;

    // Update role
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', user.id);

    if (updateError) continue;

    // Audit log
    await supabase.from('role_change_logs').insert({
      user_id: user.id,
      changed_by: user.id, // Using the user's ID as placeholder if system, or could use a system UUID
      old_role: user.role || ROLES.EMPLOYEE,
      new_role: newRole,
      reason: 'Automatic IdP Role Sync'
    });

    changedCount++;
  }

  return { success: true, changed: changedCount, provider: 'supabase' };
}
