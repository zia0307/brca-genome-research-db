'use client';
import { useState } from 'react';
import useFetch from '@/components/useFetch';
import Table from '@/components/Table';

const initialForm = { first_name: '', last_name: '', dob: '', sex: 'Female', consent_status: 'deidentified_only' };

export default function Patients() {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const { data, error, loading, reload } = useFetch('/api/patients?q=' + encodeURIComponent(term));
  const isAdmin = data?.mode === 'identified';

  async function createPatient(e) {
    e.preventDefault(); setSaving(true); setMessage(''); setFormError('');
    try {
      const response = await fetch('/api/patients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not register patient');
      setMessage(`Patient registered successfully. Record ID: ${result.patient_id}`);
      setForm(initialForm); setShowForm(false); setTerm(''); setQ(''); await reload();
    } catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  return <>
    <section className="page-heading">
      <div><p className="eyebrow">RESEARCH RECORDS / COHORT</p><h1>Patients</h1>
        <p className="sub">Manage patient records while respecting consent and role-based access.</p></div>
      {isAdmin && <button className="primary-button" onClick={() => { setShowForm(v => !v); setFormError(''); }}>{showForm ? 'Close form' : '+ Register patient'}</button>}
    </section>
    <div className="access-note"><strong>{isAdmin ? 'Administrator view' : 'Researcher view'}</strong><span>{isAdmin ? 'Identified patient records are visible to administrators.' : 'You are viewing the consent-filtered, de-identified patient dataset.'}</span></div>
    {message && <p className="notice-success" role="status">{message}</p>}
    {formError && <p className="notice-error" role="alert">{formError}</p>}
    {isAdmin && showForm && <section className="form-panel">
      <div className="section-heading"><div><p className="eyebrow">NEW RECORD</p><h2>Register a patient</h2></div><p className="section-note">Fields marked * are required</p></div>
      <form onSubmit={createPatient} className="patient-form">
        <label>First name *<input required maxLength={50} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></label>
        <label>Last name *<input required maxLength={50} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></label>
        <label>Date of birth *<input required type="date" max={new Date().toISOString().slice(0, 10)} value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} /></label>
        <label>Sex *<select value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })}><option>Female</option><option>Male</option><option>Other</option></select></label>
        <label className="wide-field">Consent status *<select value={form.consent_status} onChange={e => setForm({ ...form, consent_status: e.target.value })}><option value="deidentified_only">De-identified access only</option><option value="full">Full consent</option><option value="withdrawn">Withdrawn</option></select><small>Choose the consent status documented for this synthetic/demo record.</small></label>
        <div className="form-actions"><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save patient record'}</button><button type="button" className="secondary-button" onClick={() => { setShowForm(false); setForm(initialForm); }}>Cancel</button></div>
      </form>
    </section>}
    {isAdmin && <div className="search-row"><input aria-label="Search patients" placeholder="Search by first or last name" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setTerm(q)} /><button className="secondary-button" onClick={() => setTerm(q)}>Search records</button>{term && <button className="text-button" onClick={() => { setQ(''); setTerm(''); }}>Clear</button>}</div>}
    <section className="data-section"><div className="section-heading"><div><p className="eyebrow">PATIENT REGISTER</p><h2>Patient records</h2></div>{data?.rows && <p className="section-note">{data.rows.length} records shown (maximum 200)</p>}</div>
      {loading ? <div className="state-panel">Loading patient records…</div> : error ? <div className="state-panel err">{error}</div> : <Table rows={data?.rows || []} />}
    </section>
  </>;
}
