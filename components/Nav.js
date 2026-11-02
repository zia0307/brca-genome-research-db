'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
export default function Nav() {
  const [me, setMe] = useState(null); const path = usePathname();
  useEffect(() => { fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(setMe); }, [path]);
  if (path === '/login') return null;
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }
  return (<nav><span className="brand">🧬 BRCA Research DB</span>
    <Link href="/">Dashboard</Link><Link href="/patients">Patients</Link><Link href="/variants">Variants</Link>
    <Link href="/trials">Trials</Link><Link href="/annotations">Annotations (MongoDB)</Link><span className="sp" />
    {me && <span className="muted">{me.username} · <span className="badge">{me.role}</span></span>}
    <button className="ghost" onClick={logout}>Log out</button></nav>);
}
