import { pool } from '@/lib/db';
import { requireRole } from '@/lib/auth';

// Admin only. Calls the stored procedure (transaction); the trigger blocks withdrawn patients.
export async function POST(req) {
  const { error } = await requireRole('admin'); if (error) return error;
  const { trial_id, patient_id, arm } = await req.json();
  if (!Number.isInteger(+trial_id) || !Number.isInteger(+patient_id))
    return Response.json({ error: 'trial_id and patient_id must be integers' }, { status: 400 });
  try {
    await pool.query('CALL sp_enroll_patient(?, ?, ?)', [+trial_id, +patient_id, (arm || 'experimental').slice(0, 50)]);
    return Response.json({ ok: true, message: `Patient ${patient_id} enrolled in trial ${trial_id}; baseline result recorded.` });
  } catch (e) {
    // Database-level validation messages (trigger / procedure / constraints) are shown to the user
    return Response.json({ error: e.sqlMessage || 'Enrollment failed' }, { status: 409 });
  }
}
