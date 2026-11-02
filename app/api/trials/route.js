import { query } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function GET() {
  const { error } = await requireRole(); if (error) return error;
  const trials = await query(
    `SELECT t.trial_id, t.title, t.phase, t.status, c.condition_name,
            (SELECT COUNT(*) FROM TrialParticipant tp WHERE tp.trial_id = t.trial_id) AS participants
     FROM ClinicalTrial t JOIN Condition_ c ON c.condition_id = t.condition_id ORDER BY t.trial_id`);
  const outcomes = await query(
    `SELECT trial_id, response, COUNT(*) AS n FROM TrialResult WHERE timepoint <> 'baseline'
     GROUP BY trial_id, response ORDER BY trial_id, n DESC`);
  return Response.json({ trials, outcomes });
}
