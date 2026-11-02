import { query } from '@/lib/db';
import { requireRole } from '@/lib/auth';

// Admins see identified records; researchers see only the consent-filtered view.
export async function GET(req) {
  const { session, error } = await requireRole();
  if (error) return error;
  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (session.role === 'admin') {
    const like = `%${q}%`;
    const rows = await query(
      `SELECT patient_id, first_name, last_name, dob, sex, consent_status, fn_patient_age(patient_id) AS age
       FROM Patient WHERE first_name LIKE ? OR last_name LIKE ? ORDER BY patient_id LIMIT 200`, [like, like]);
    return Response.json({ mode: 'identified', rows });
  }
  const rows = await query(`SELECT * FROM v_deidentified_patient ORDER BY patient_id LIMIT 200`);
  return Response.json({ mode: 'de-identified (consent-filtered view)', rows });
}

// Patient creation is restricted to administrators and uses parameterised SQL.
export async function POST(req) {
  const { error } = await requireRole('admin');
  if (error) return error;

  let body;
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }

  const first_name = typeof body.first_name === 'string' ? body.first_name.trim() : '';
  const last_name = typeof body.last_name === 'string' ? body.last_name.trim() : '';
  const dob = typeof body.dob === 'string' ? body.dob : '';
  const sex = body.sex;
  const consent_status = body.consent_status;

  if (!first_name || first_name.length > 50 || !last_name || last_name.length > 50) {
    return Response.json({ error: 'First and last names are required and must be at most 50 characters.' }, { status: 400 });
  }
  const parsedDob = new Date(`${dob}T00:00:00Z`);
  const validDob = /^\d{4}-\d{2}-\d{2}$/.test(dob) && !Number.isNaN(parsedDob.getTime()) && parsedDob.toISOString().slice(0, 10) === dob;
  if (!validDob || dob > new Date().toISOString().slice(0, 10)) {
    return Response.json({ error: 'Enter a valid date of birth that is not in the future.' }, { status: 400 });
  }
  if (!['Male', 'Female', 'Other'].includes(sex)) {
    return Response.json({ error: 'Select a valid sex value.' }, { status: 400 });
  }
  if (!['full', 'deidentified_only', 'withdrawn'].includes(consent_status)) {
    return Response.json({ error: 'Select a valid consent status.' }, { status: 400 });
  }

  try {
    const result = await query(
      'INSERT INTO Patient (first_name, last_name, dob, sex, consent_status) VALUES (?, ?, ?, ?, ?)',
      [first_name, last_name, dob, sex, consent_status]
    );
    return Response.json({ message: 'Patient registered', patient_id: result.insertId }, { status: 201 });
  } catch (err) {
    console.error('Patient creation failed:', err);
    return Response.json({ error: 'The database could not save this patient record.' }, { status: 500 });
  }
}
