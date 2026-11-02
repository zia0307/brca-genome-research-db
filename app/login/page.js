'use client';
import { useState } from 'react';
export default function Login() {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setErr('');
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
    if (r.ok) window.location.href = '/'; else setErr((await r.json()).error);
  }
  return (<form className="login" onSubmit={submit}><h1>🧬 Sign in</h1><p className="sub">BRCA1/BRCA2 Genome &amp; Medical Research DB</p>
    <input placeholder="Username" value={u} onChange={e => setU(e.target.value)} autoFocus />
    <input placeholder="Password" type="password" value={p} onChange={e => setP(e.target.value)} />
    <button>Sign in</button>{err && <span className="err">{err}</span>}</form>);
}
