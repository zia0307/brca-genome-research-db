'use client';
import { useEffect, useState, useCallback } from 'react';
export default function useFetch(url) {
  const [data, setData] = useState(null); const [error, setError] = useState(null); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(url); const j = await r.json();
      if (r.status === 401) { window.location.href = '/login'; return; }
      if (!r.ok) throw new Error(j.error || 'Request failed');
      setData(j);
    } catch (e) { setError(e.message); setData(null); }
    setLoading(false);
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load };
}
