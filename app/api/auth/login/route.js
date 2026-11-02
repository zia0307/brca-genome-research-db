import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signSession, COOKIE } from '@/lib/auth';

export async function POST(req) {
  const { username, password } = await req.json();
  if (!username || !password) return Response.json({ error: 'Username and password required' }, { status: 400 });
  const [u] = await query('SELECT user_id, username, password_hash, role FROM AppUser WHERE username = ?', [username]);
  if (!u || !(await bcrypt.compare(password, u.password_hash)))
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  const token = await signSession({ uid: u.user_id, username: u.username, role: u.role });
  const res = Response.json({ username: u.username, role: u.role });
  res.headers.append('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800`);
  return res;
}
