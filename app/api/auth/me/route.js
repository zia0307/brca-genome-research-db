import { getSession } from '@/lib/auth';
export async function GET() {
  const s = await getSession();
  return s ? Response.json({ username: s.username, role: s.role }) : Response.json({ error: 'Not authenticated' }, { status: 401 });
}
