'use client';
import { useState } from 'react';
import useFetch from '@/components/useFetch';
import Table from '@/components/Table';
export default function Variants() {
  const [q, setQ] = useState(''); const [gene, setGene] = useState(''); const [applied, setApplied] = useState({ q: '', gene: '' });
  const { data, error, loading } = useFetch(`/api/variants?q=${encodeURIComponent(applied.q)}&gene=${applied.gene}`);
  return (<>
    <h1>Variants</h1><p className="sub">Search by HGVS notation or gene; shows linked conditions and classification.</p>
    <div className="row"><input placeholder="e.g. c.5946del" value={q} onChange={e => setQ(e.target.value)} />
      <select value={gene} onChange={e => setGene(e.target.value)}><option value="">All genes</option>{data?.genes.map(g => <option key={g}>{g}</option>)}</select>
      <button onClick={() => setApplied({ q, gene })}>Filter</button></div>
    {loading ? <p>Loading…</p> : error ? <p className="err">{error}</p> : <Table rows={data.rows} />}
  </>);
}
