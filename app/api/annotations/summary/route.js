import { mongoDb } from '@/lib/mongo';
import { requireRole } from '@/lib/auth';

// MongoDB aggregation pipeline: per gene -> annotated variants, mean population frequency, papers cited
export async function GET() {
  const { error } = await requireRole(); if (error) return error;
  try {
    const db = await mongoDb();
    const rows = await db.collection('variant_annotations').aggregate([
      { $group: { _id: '$gene', variants: { $sum: 1 }, avg_gnomad_af: { $avg: '$population_frequency.gnomad' },
                  papers: { $sum: { $size: '$literature' } } } },
      { $project: { _id: 0, gene: '$_id', variants: 1, papers: 1, avg_gnomad_af: { $round: ['$avg_gnomad_af', 6] } } },
      { $sort: { variants: -1 } },
    ]).toArray();
    return Response.json({ rows });
  } catch (e) { return Response.json({ error: 'MongoDB unavailable: ' + e.message }, { status: 503 }); }
}
