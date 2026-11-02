import { mongoDb } from '@/lib/mongo';
import { requireRole } from '@/lib/auth';

// MongoDB: flexible per-variant annotation documents (nested, variable-shape)
export async function GET(req) {
  const { error } = await requireRole(); if (error) return error;
  const sp = new URL(req.url).searchParams;
  const q = sp.get('q'), gene = sp.get('gene');
  const filter = {};
  if (gene) filter.gene = gene;
  if (q) filter.$text = { $search: q };
  try {
    const db = await mongoDb();
    const docs = await db.collection('variant_annotations').find(filter, { projection: { _id: 0 } }).limit(50).toArray();
    return Response.json({ rows: docs });
  } catch (e) { return Response.json({ error: 'MongoDB unavailable: ' + e.message }, { status: 503 }); }
}
