'use client';
import { useEffect, useState } from 'react';
import useFetch from '@/components/useFetch';
import Table from '@/components/Table';
export default function Trials() {
  const { data, error, loading, reload } = useFetch('/api/trials');
  const [me, setMe] = useState(null); const [f, setF] = useState({ trial_id: '', patient_id: '', arm: 'experimental' }); const [msg, setMsg] = useState(null);
  useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(setMe); }, []);
  async function enroll(e) {
    e.preventDefault(); setMsg(null);
    const r = await fetch('/api/trials/enroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    const j = await r.json(); setMsg(r.ok ? { ok: true, t: j.message } : { ok: false, t: j.error }); if (r.ok) reload();
  }
  return (<>
    <h1>Clinical trials</h1><p className="sub">Enrolment calls the <code>sp_enroll_patient</code> stored procedure (transaction); the DB trigger rejects withdrawn patients.</p>
    {loading ? <p>Loading…</p> : error ? <p className="err">{error}</p> : <><Table rows={data.trials} /><h2>Follow-up responses (excluding baseline)</h2><Table rows={data.outcomes} /></>}
    <h2>Enrol a patient</h2>
    {me?.role === 'admin' ? (<form className="row" onSubmit={enroll}>
      <input placeholder="Trial ID" value={f.trial_id} onChange={e => setF({ ...f, trial_id: e.target.value })} />
      <input placeholder="Patient ID" value={f.patient_id} onChange={e => setF({ ...f, patient_id: e.target.value })} />
      <input placeholder="Arm" value={f.arm} onChange={e => setF({ ...f, arm: e.target.value })} /><button>Enrol</button>
      {msg && <span className={msg.ok ? 'okm' : 'err'}>{msg.t}</span>}</form>) : <p className="muted">Only admins can enrol patients.</p>}
  </>);
}
