import { query } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function GET(req) {
  const { error } = await requireRole(); if (error) return error;
  const sp = new URL(req.url).searchParams;
  const q = `%${sp.get('q') || ''}%`;
  const gene = sp.get('gene') || '';
  const rows = await query(
    `SELECT v.variant_id, g.gene_symbol, v.hgvs_notation, v.variant_type, v.variant_class,
            COALESCE(GROUP_CONCAT(DISTINCT CONCAT(c.condition_name,' (',vc.confidence_level,')') SEPARATOR '; '),'-') AS conditions
     FROM Variant v
     JOIN Gene g ON g.gene_id = v.gene_id
     LEFT JOIN VariantCondition vc ON vc.variant_id = v.variant_id
     LEFT JOIN Condition_ c ON c.condition_id = vc.condition_id
     WHERE (v.hgvs_notation LIKE ? OR g.gene_symbol LIKE ?) AND (? = '' OR g.gene_symbol = ?)
     GROUP BY v.variant_id, g.gene_symbol, v.hgvs_notation, v.variant_type, v.variant_class
     ORDER BY g.gene_symbol, v.hgvs_notation`, [q, q, gene, gene]);
  const genes = await query('SELECT gene_symbol FROM Gene ORDER BY gene_symbol');
  return Response.json({ rows, genes: genes.map(g => g.gene_symbol) });
}
