export default function Table({ rows }) {
  if (!rows || rows.length === 0) return <p className="muted">No rows.</p>;
  const cols = Object.keys(rows[0]);
  return (<div className="tw"><table><thead><tr>{cols.map(c => <th key={c}>{c.replace(/_/g, ' ')}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{cols.map(c => <td key={c}>{String(r[c] ?? '-')}</td>)}</tr>)}</tbody></table></div>);
}
