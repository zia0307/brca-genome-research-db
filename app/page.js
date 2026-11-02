'use client';
import useFetch from '@/components/useFetch';
import Table from '@/components/Table';

export default function Dashboard() {
  const { data, error, loading } = useFetch('/api/stats');
  if (loading) return <div className="state-panel">Loading research overview…</div>;
  if (error) return <div className="state-panel err">Could not load dashboard: {error}</div>;
  const c = data.counts;
  const metrics = [
    { label: 'Registered patients', value: c.patients, note: 'Patient records' },
    { label: 'Biological samples', value: c.samples, note: 'Collected samples' },
    { label: 'Genetic variants', value: c.variants, note: 'Catalogued variants' },
    { label: 'Clinical trials', value: c.trials, note: 'Research studies' },
    { label: 'Pathogenic carriers', value: data.pathogenicPatients, note: 'Patients with a pathogenic finding' },
  ];
  return <>
    <section className="page-heading">
      <div>
        <p className="eyebrow">GENOMIC RESEARCH / OVERVIEW</p>
        <h1>Research dashboard</h1>
        <p className="sub">A consolidated view of patient cohorts, genetic findings and clinical research activity.</p>
      </div>
      <span className="data-source"><span className="live-dot" /> Connected to research database</span>
    </section>
    <section className="metric-grid" aria-label="Database summary">
      {metrics.map((m, i) => <article className="metric-card" key={m.label}>
        <span className="metric-index">0{i + 1}</span>
        <p className="metric-label">{m.label}</p>
        <p className="metric-value">{Number(m.value).toLocaleString()}</p>
        <p className="metric-note">{m.note}</p>
      </article>)}
    </section>
    <section className="data-section">
      <div className="section-heading"><div><p className="eyebrow">VARIANT DISTRIBUTION</p><h2>Frequently observed variants</h2></div><p className="section-note">Variants detected across three or more patients</p></div>
      <Table rows={data.carriers} />
    </section>
    <section className="data-section">
      <div className="section-heading"><div><p className="eyebrow">GENE CATALOGUE</p><h2>Variants by gene</h2></div><p className="section-note">Count of catalogued variants per gene</p></div>
      <Table rows={data.byGene} />
    </section>
  </>;
}

