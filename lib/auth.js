import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET);
export const COOKIE = 'brca_session';

export async function signSession(payload) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('8h').sign(key());
}
export async function verifyToken(token) {
  try { return (await jwtVerify(token, key())).payload; } catch { return null; }
}
export async function getSession() {
  const t = cookies().get(COOKIE)?.value;
  return t ? verifyToken(t) : null;
}
// Returns session or throws a Response-able error object
export async function requireRole(...roles) {
  const s = await getSession();
  if (!s) return { error: Response.json({ error: 'Not authenticated' }, { status: 401 }) };
  if (roles.length && !roles.includes(s.role)) return { error: Response.json({ error: 'Forbidden for your role' }, { status: 403 }) };
  return { session: s };
}
