'use client';
import { useEffect, useState } from 'react';
import useFetch from '@/components/useFetch';
import Table from '@/components/Table';
export default function Annotations() {
  const [q, setQ] = useState(''); const [term, setTerm] = useState(''); const [nq, setNq] = useState(''); const [nterm, setNterm] = useState('');
  const [me, setMe] = useState(null);
  useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(setMe); }, []);
  const sum = useFetch('/api/annotations/summary');
  const ann = useFetch('/api/annotations?q=' + encodeURIComponent(term));
  const notes = useFetch(me?.role === 'admin' ? '/api/notes?q=' + encodeURIComponent(nterm) : '/api/auth/me');
  return (<>
    <h1>Variant annotations <span className="badge">MongoDB</span></h1>
    <p className="sub">Schema-flexible documents (nested predictions, population frequencies, literature) that don't fit neatly into relational tables.</p>
    <h2>Aggregation pipeline: per gene</h2>
    {sum.loading ? <p>Loading…</p> : sum.error ? <p className="err">{sum.error}</p> : <Table rows={sum.data.rows} />}
    <h2>Full-text search (literature titles, tags, HGVS)</h2>
    <div className="row"><input placeholder="e.g. PARP, founder, reclassification" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && setTerm(q)} /><button onClick={() => setTerm(q)}>Search</button></div>
    {ann.loading ? <p>Loading…</p> : ann.error ? <p className="err">{ann.error}</p> : ann.data.rows.map(d => (
      <div className="doc" key={d.hgvs}><b>{d.gene}</b> {d.hgvs} <span className="badge">{d.variant_type}</span><span className="badge">{d.predicted_effect.class}</span>
        <div className="muted">gnomAD AF {d.population_frequency.gnomad} · REVEL {d.predicted_effect.tools.revel} · CADD {d.predicted_effect.tools.cadd}</div>
        <ul>{d.literature.map((l, i) => <li key={i}>{l.title} ({l.year}, PMID {l.pmid})</li>)}</ul></div>))}
    {me?.role === 'admin' && (<><h2>Clinical notes (admin only, full-text search)</h2>
      <div className="row"><input placeholder="e.g. surveillance, trial" value={nq} onChange={e => setNq(e.target.value)} onKeyDown={e => e.key === 'Enter' && setNterm(nq)} /><button onClick={() => setNterm(nq)}>Search</button></div>
      {notes.error ? <p className="err">{notes.error}</p> : notes.data?.rows && <Table rows={notes.data.rows} />}</>)}
  </>);
}
