import { query } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function GET() {
  const { error } = await requireRole(); if (error) return error;
  const [counts] = await query(`SELECT
      (SELECT COUNT(*) FROM Patient) AS patients,
      (SELECT COUNT(*) FROM Sample) AS samples,
      (SELECT COUNT(*) FROM Variant) AS variants,
      (SELECT COUNT(*) FROM ClinicalTrial) AS trials`);
  // GROUP BY + HAVING + aggregates + multi-table JOIN
  const carriers = await query(`SELECT v.hgvs_notation, g.gene_symbol, COUNT(DISTINCT s.patient_id) AS carriers,
        ROUND(AVG(gr.read_depth),1) AS avg_depth
      FROM Variant v
      JOIN Gene g ON g.gene_id = v.gene_id
      JOIN GenotypeResult gr ON gr.variant_id = v.variant_id
      JOIN SequencingRun sr ON sr.run_id = gr.run_id
      JOIN Sample s ON s.sample_id = sr.sample_id
      GROUP BY v.variant_id, v.hgvs_notation, g.gene_symbol
      HAVING carriers >= 3 ORDER BY carriers DESC`);
  // subquery: patients carrying a pathogenic variant
  const [path] = await query(`SELECT COUNT(*) AS n FROM Patient WHERE patient_id IN (
      SELECT s.patient_id FROM Sample s
      JOIN SequencingRun sr ON sr.sample_id = s.sample_id
      JOIN GenotypeResult gr ON gr.run_id = sr.run_id
      JOIN VariantCondition vc ON vc.variant_id = gr.variant_id
      WHERE vc.confidence_level = 'pathogenic')`);
  const byGene = await query(`SELECT g.gene_symbol, COUNT(*) AS variants FROM Variant v JOIN Gene g ON g.gene_id=v.gene_id GROUP BY g.gene_symbol ORDER BY variants DESC`);
  return Response.json({ counts, carriers, pathogenicPatients: path.n, byGene });
}
