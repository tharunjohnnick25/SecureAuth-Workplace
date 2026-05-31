import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = new Set([
  '/', '/login', '/signup', '/forgot-password', '/verify-otp',
  '/demo', '/pricing', '/unauthorized', '/reset-password',
  '/auth/callback', '/auth/error',
]);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico') || pathname.startsWith('/api') || pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)) {
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = { matcher: '/((?!_next/static|_next/image|favicon.ico).*)' };
