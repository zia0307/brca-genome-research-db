import { mongoDb } from '@/lib/mongo';
import { requireRole } from '@/lib/auth';

// Clinical free-text notes (MongoDB full-text search). Admin only: notes are linked to patient IDs.
export async function GET(req) {
  const { error } = await requireRole('admin'); if (error) return error;
  const q = new URL(req.url).searchParams.get('q');
  try {
    const db = await mongoDb();
    const rows = await db.collection('clinical_notes')
      .find(q ? { $text: { $search: q } } : {}, { projection: { _id: 0 } }).limit(30).toArray();
    return Response.json({ rows });
  } catch (e) { return Response.json({ error: 'MongoDB unavailable: ' + e.message }, { status: 503 }); }
}
