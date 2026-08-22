import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { hasPermission, UserRole, isHigherRole } from '@/lib/rbac';
import { getUserSession } from '@/lib/auth';

/**
 * Checks if a user has access to a specific permission.
 * First checks their static RBAC role.
 * If not granted via role, checks for active JIT Access Grants in `user_permissions`.
 */
export async function hasAccess(req: NextRequest, permissionId: string): Promise<boolean> {
  const session = await getUserSession();
  if (!session) return false;

  const { user } = session;
  const companyId = (user as any)?.company_id;
  if (!user || !companyId) return false;

  const roleId = user.role;
  if (!roleId) return false;

  // 1. Static RBAC Check
  const isAdmin = roleId === 'ADMIN' || roleId === 'ORGANIZATION_ADMIN' || roleId === 'ORGANIZATION_OWNER';
  if (isAdmin) return true;
  if (hasPermission(roleId, permissionId)) return true;

  // 2. JIT Access Grant Check (user_permissions)
  try {
    const supabase = await createServerSupabaseClient();
    
    // We check if a valid grant exists where expires_at is either null (permanent) or in the future
    const { count, error } = await supabase
      .from('user_permissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .eq('permission', permissionId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    if (error) {
      console.error('[IAM Access Helper] Error checking grants:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (err) {
    console.error('[IAM Access Helper] Fatal error:', err);
    return false;
  }
}
