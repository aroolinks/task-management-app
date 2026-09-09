import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/jwt';

/**
 * Baseline auth gate for the API surface. Every `/api/*` route requires a
 * verifiable `auth-token` cookie except the handful of public endpoints
 * below. Per-route handlers still enforce role/permission checks against the
 * live DB record - this only guarantees no route is reachable anonymously by
 * omission.
 */
const PUBLIC_API_PREFIXES = ['/api/auth/', '/api/health'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    await jwtVerify(token, getJwtSecret());
  } catch {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
