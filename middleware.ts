import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { ROUTE_PERMISSIONS } from './lib/roles';

// Helper to get role in Edge runtime
async function getEdgeUserRole(request: NextRequest): Promise<string | null> {
  // 1. Mock Mode Check
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true' || request.cookies.has('mock_session')) {
    const mockCookie = request.cookies.get('mock_session')?.value;
    if (!mockCookie) return null;
    try {
      let decoded = mockCookie;
      try { decoded = decodeURIComponent(mockCookie); } catch (e) {}
      const parsed = JSON.parse(decoded);
      return parsed.role ? parsed.role.toLowerCase() : 'employee';
    } catch (e) {
      console.error('Failed to parse mock_session cookie:', e, 'Raw value:', mockCookie);
      return null;
    }
  }

  // 2. Supabase Check
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // middleware shouldn't set cookies for this simple check
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role ? profile.role.toLowerCase() : 'employee';
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip auth checks for public routes and static assets
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/login') ||
    path.startsWith('/invite') ||
    path.startsWith('/verify-mfa') ||
    path === '/unauthorized' ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  // Authenticated Routes
  const userRole = await getEdgeUserRole(request);

  if (!userRole) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check RBAC Permissions
  for (const [pathPrefix, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (path.startsWith(pathPrefix)) {
      if (!allowedRoles.includes(userRole as any)) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
