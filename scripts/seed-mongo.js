// Builds the MongoDB collections from the MySQL data (synthetic annotations + notes, deterministic).
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

let seed = 42;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = a => a[Math.floor(rnd() * a.length)];

const TITLES = ['Functional assay of {v} in {g}', 'Population frequency of {g} variant {v}', 'Clinical outcomes in carriers of {g} {v}',
  'Reclassification of {g} {v} using multifactorial analysis', 'PARP-inhibitor response in {g} {v} carriers'];
const EFFECTS = ['loss_of_function', 'reduced_function', 'no_functional_change', 'uncertain'];
const NOTE_TPL = ['Patient reports family history of breast cancer; counselled about {g} testing.',
  'Follow-up visit: tolerating treatment, mild fatigue. Discussed surveillance MRI schedule.',
  'Pathology review: invasive ductal carcinoma, grade {n}. Hormone receptor negative.',
  'Genetic counselling completed; patient understands implications of carrying a {g} variant for relatives.',
  'Post-surgery recovery uneventful. Considering risk-reducing salpingo-oophorectomy.',
  'Discussed enrolment in clinical trial; patient asked about side effects and placebo arm.'];

(async () => {
  const my = await mysql.createConnection({ host: process.env.MYSQL_HOST, port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE });
  const [variants] = await my.query('SELECT v.variant_id, v.hgvs_notation, v.variant_type, g.gene_symbol FROM Variant v JOIN Gene g ON g.gene_id=v.gene_id');
  const [pats] = await my.query('SELECT patient_id FROM Patient WHERE consent_status <> "withdrawn"');
  await my.end();

  const mc = await new MongoClient(process.env.MONGODB_URI).connect();
  const db = mc.db(process.env.MONGODB_DB);
  await db.collection('variant_annotations').drop().catch(() => {});
  await db.collection('clinical_notes').drop().catch(() => {});

  const ann = variants.map(v => {
    const n = 1 + Math.floor(rnd() * 3);
    return {
      variant_id: v.variant_id, gene: v.gene_symbol, hgvs: v.hgvs_notation, variant_type: v.variant_type,
      predicted_effect: { class: pick(EFFECTS), tools: { revel: +rnd().toFixed(3), cadd: +(10 + rnd() * 30).toFixed(1) } },
      population_frequency: { gnomad: +(rnd() * 0.001).toFixed(6), source: 'gnomAD (synthetic)' },
      literature: Array.from({ length: n }, () => ({
        title: pick(TITLES).replace('{v}', v.hgvs_notation).replace('{g}', v.gene_symbol),
        year: 2008 + Math.floor(rnd() * 17), pmid: String(10000000 + Math.floor(rnd() * 9000000)) })),
      tags: [v.gene_symbol, v.variant_type, pick(['hereditary', 'sporadic', 'founder'])],
    };
  });
  await db.collection('variant_annotations').insertMany(ann);
  await db.collection('variant_annotations').createIndex({ hgvs: 1 }, { unique: true });
  await db.collection('variant_annotations').createIndex({ gene: 1 });
  await db.collection('variant_annotations').createIndex({ 'literature.title': 'text', tags: 'text', hgvs: 'text' });

  const notes = [];
  for (const p of pats) {
    const k = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < k; i++)
      notes.push({ patient_id: p.patient_id, date: `2026-0${1 + Math.floor(rnd() * 9)}-${10 + Math.floor(rnd() * 18)}`,
        text: pick(NOTE_TPL).replace('{g}', pick(['BRCA1', 'BRCA2'])).replace('{n}', String(1 + Math.floor(rnd() * 3))) });
  }
  await db.collection('clinical_notes').insertMany(notes);
  await db.collection('clinical_notes').createIndex({ text: 'text' });
  await db.collection('clinical_notes').createIndex({ patient_id: 1 });
  console.log(`Mongo seeded: ${ann.length} variant_annotations, ${notes.length} clinical_notes`);
  await mc.close();
})().catch(e => { console.error(e.message); process.exit(1); });
