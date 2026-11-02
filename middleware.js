import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Everything except the login page and login API requires a valid session cookie.
export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname === '/api/auth/login') return NextResponse.next();
  const token = req.cookies.get('brca_session')?.value;
  let ok = false;
  if (token) {
    try { await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET)); ok = true; } catch {}
  }
  if (ok) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
