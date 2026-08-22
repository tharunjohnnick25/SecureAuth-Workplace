import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { ROUTE_PERMISSIONS } from './lib/roles';
import { jwtVerify } from 'jose';

async function hasCustomStepUp(request: NextRequest) {
    const cookie = request.cookies.get('secureauth_assurance_level')?.value;
    if (!cookie) return false;
    try {
        const JWT_SECRET = new TextEncoder().encode(
            process.env.SUPABASE_SERVICE_ROLE_KEY || 'default_secure_secret_for_dev_only_2026'
        );
        await jwtVerify(cookie, JWT_SECRET);
        return true;
    } catch {
        return false;
    }
}

async function getEdgeUserProfile(request: NextRequest, response: NextResponse) {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    const mockCookie = request.cookies.get('sb-qbeulfmjmmwcbxuzocdv-auth-token')?.value;
    if (!mockCookie) return null;
    try {
      const parsed = JSON.parse(mockCookie);
      const token = parsed.access_token || parsed[0];
      const JWT_SECRET = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'default_secure_secret_for_dev_only_2026');
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      return {
        role: (payload.role as string || 'employee').toLowerCase(),
        status: 'ACTIVE',
        mfa_enabled: false,
        aal: payload.aal as string || 'aal1'
      };
    } catch (e) {
      return null;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  if (!user || !session) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('role, status, mfa_enabled')
    .eq('id', user.id)
    .single();

  return profile ? { 
    role: (profile.role || 'employee').toLowerCase(),
    status: (profile.status || '').toUpperCase(),
    mfa_enabled: profile.mfa_enabled,
    aal: (session as any).aal
  } : null;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const path = request.nextUrl.pathname;

  // Skip auth checks for public routes and static assets
  if (
    path === '/' ||
    path.startsWith('/_next') ||
    path.startsWith('/login') ||
    path.startsWith('/invite') ||
    path.startsWith('/verify-mfa') ||
    path.startsWith('/mfa-setup') ||
    path.startsWith('/api/auth') || // Allow all public auth endpoints
    path === '/unauthorized' ||
    path.includes('.')
  ) {
    return response;
  }

  // GLOBAL MOCK API INTERCEPTS
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' && request.method === 'GET') {
    if (path === '/api/analytics/stats') {
      return NextResponse.json({ success: true, data: { totalUsers: 42, activeUsers: 38, riskScore: 12, compliance: 98, totalDepartments: 5, activeAlerts: 0 }});
    }
    if (path === '/api/analytics/activities') {
      return NextResponse.json({ success: true, data: []});
    }
    if (path === '/api/analytics/alerts') {
      return NextResponse.json({ success: true, data: []});
    }
    if (path === '/api/employee/attendance') {
      return NextResponse.json({ success: true, data: []});
    }
    if (path === '/api/departments') {
      return NextResponse.json({ success: true, data: [{ id: '1', name: 'Engineering' }, { id: '2', name: 'Sales' }]});
    }
    if (path === '/api/integrations') {
      return NextResponse.json({ success: true, data: []});
    }
  }

  // Authenticated Routes
  const userProfile = await getEdgeUserProfile(request, response);

  if (!userProfile) {
    // If it's an API route, return 401 JSON instead of redirecting
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { role: userRole, status, mfa_enabled, aal } = userProfile;
  const isAdmin = ['admin', 'super_admin', 'organization_owner', 'organization_admin'].includes(userRole);

  // Enforce Step-Up / MFA Security Policy has been globally disabled by admin request
  // Users will no longer be intercepted and sent to /verify-mfa even if they have enrolled factors.

  // Onboarding route guards
  const isOnboardingRoute = path.startsWith('/onboarding');
  
  if (status === 'INVITED' && !isAdmin && !isOnboardingRoute && !path.startsWith('/api/')) {
      // Employees who haven't onboarded MUST go to onboarding
      return NextResponse.redirect(new URL('/onboarding/details', request.url));
  }

  if (status !== 'INVITED' && isOnboardingRoute) {
      // Users who HAVE onboarded CANNOT go to onboarding
      return NextResponse.redirect(new URL(isAdmin ? '/admin/dashboard' : '/dashboard', request.url));
  }

  // Check RBAC Permissions
  for (const [pathPrefix, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (path.startsWith(pathPrefix)) {
      if (!allowedRoles.includes(userRole as any)) {
        if (path.startsWith('/api/')) {
           return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  // Legacy Trust Score Checks (For backward compatibility with existing features)
  if (path.startsWith('/dashboard')) {
    const trustScoreCookie = request.cookies.get('trust_score');
    const score = trustScoreCookie ? parseInt(trustScoreCookie.value, 10) : 100;
    
    if (path.startsWith('/dashboard/settings/security') && score < 80) {
      const url = request.nextUrl.clone();
      url.pathname = '/verify-mfa';
      url.searchParams.set('reason', 'step-up');
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
