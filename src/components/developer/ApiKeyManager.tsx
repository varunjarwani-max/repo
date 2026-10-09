import { useState } from 'react';
import { KeyRound, Plus, ShieldCheck, RefreshCw } from 'lucide-react';
import useSWR from 'swr';
import { ApiCode, CopyButton } from './ApiCode';

export interface DeveloperKey { id: string; label: string; maskedKey: string; createdAt: string; expiresAt: string | null; requestCount: number; status: string; }
export const keysCacheKey = (admin: string) => ['/api/keys', admin] as const;
export function ApiKeyManager({ admin, onIssue }: { admin: string; onIssue: (key: string) => void }) {
  const [label, setLabel] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [issued, setIssued] = useState<{ id: string; key: string } | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const headers = admin ? { 'x-admin-key': admin } : undefined;
  const { data, error, isLoading, mutate } = useSWR<{ keys: DeveloperKey[] }>(keysCacheKey(admin), async ([url, secret]: readonly [string, string]) => {
    const response = await fetch(url, { headers: secret ? { 'x-admin-key': secret } : undefined });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not load API keys.');
    return body;
  }, { shouldRetryOnError: false, revalidateOnFocus: false });
  async function generate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setActionError('');
    try {
      const response = await fetch('/api/keys/generate', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label.trim() || 'Default Robotics Key', expiresAt: expiry ? new Date(expiry).toISOString() : null }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not issue key.');
      setIssued({ id: body.id, key: body.key }); onIssue(body.key); setLabel(''); await mutate();
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Could not issue key.'); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setActionError('');
    try {
      const response = await fetch(`/api/keys/${id}/revoke`, { method: 'POST', headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not revoke key.');
      if (issued?.id === id) setIssued(null);
      setRevokeId(null); await mutate();
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Could not revoke key.'); }
    finally { setBusy(false); }
  }
  const curl = `curl.exe -X POST "${window.location.origin}/api/v1/classify-external" -H "x-api-key: YOUR_ECO_API_KEY" -F "image=@waste.jpg"`;
  return <section id="api-keys" style={{ scrollMarginTop: 100 }} aria-labelledby="key-manager-title" className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 min-w-0">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><KeyRound size={19} /></div><div><h2 id="key-manager-title" className="font-semibold text-white">API key manager</h2><p className="text-xs text-slate-400 mt-1">Issue access. Stay in control.</p></div></div><button type="button" aria-label="Refresh API keys" onClick={() => void mutate()} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"><RefreshCw size={15} /></button></div>
    <form onSubmit={generate} className="space-y-3">
      <div><label htmlFor="key-label" className="block text-xs text-slate-300 mb-2">Key name <span className="text-slate-500">(optional)</span></label><input id="key-label" maxLength={80} value={label} onChange={event => setLabel(event.target.value)} placeholder="Default Robotics Key" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500" /></div>
      <div className="flex flex-wrap items-end gap-3"><div className="flex-1 min-w-40"><label htmlFor="key-expiry" className="block text-xs text-slate-300 mb-2">Expires on <span className="text-slate-500">(optional)</span></label><input id="key-expiry" type="date" value={expiry} onChange={event => setExpiry(event.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 [color-scheme:dark]" /></div><button disabled={busy} className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg px-4 py-3 text-xs font-semibold disabled:opacity-50"><Plus size={15} />{busy ? 'Working…' : 'Generate New API Key'}</button></div>
    </form>
    {(actionError || error) && <p role="alert" className="text-sm text-amber-300 border border-amber-500/25 rounded-lg bg-amber-500/5 p-3">{actionError || error.message}</p>}
    {issued && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2"><div className="flex items-center gap-2 text-xs text-emerald-300"><ShieldCheck size={15} />Key issued — save it now</div><p className="text-xs text-slate-400">Shown only in this session. The server stores a hash, not the secret.</p><div className="flex flex-wrap gap-2 items-center"><code className="text-xs text-emerald-200 break-all select-all">{issued.key}</code><CopyButton value={issued.key} label="Copy new API key" /></div></div>}
    <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full text-left text-xs"><caption className="sr-only">Issued API keys and successful request counts</caption><thead className="bg-slate-950 text-slate-400"><tr>{['Name / key', 'Requests', 'Status', 'Action'].map(title => <th key={title} scope="col" className="px-3 py-3 font-medium">{title}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{data?.keys.map(key => <tr key={key.id}><td className="p-3"><div className="text-slate-200 break-words max-w-44">{key.label}</div><div className="font-mono text-slate-400 mt-1 whitespace-nowrap">{key.maskedKey}</div><div className="text-[10px] text-slate-500 mt-1">{new Date(key.createdAt).toLocaleDateString()}{key.expiresAt ? ` · expires ${new Date(key.expiresAt).toLocaleDateString()}` : ''}</div>{issued?.id === key.id && key.status === 'active' && <CopyButton value={issued.key} label="Copy key" />}</td><td className="p-3"><span className="rounded bg-slate-800 px-2 py-1 font-mono text-slate-200">{key.requestCount}</span></td><td className={`p-3 ${key.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>{key.status}</td><td className="p-3">{key.status === 'active' && (revokeId === key.id ? <div className="flex flex-col gap-2"><button type="button" disabled={busy} onClick={() => void revoke(key.id)} className="text-red-300">Confirm revoke</button><button type="button" onClick={() => setRevokeId(null)} className="text-slate-400">Cancel</button></div> : <button type="button" disabled={busy} onClick={() => setRevokeId(key.id)} className="text-slate-400 hover:text-red-300">Revoke</button>)}</td></tr>)}</tbody></table>{!data?.keys.length && <p className="p-5 text-center text-xs text-slate-500">{isLoading ? 'Loading keys…' : error ? 'Key manager locked' : 'No keys yet. Issue your first key above.'}</p>}</div>
    <p className="text-[11px] text-slate-500">Usage counts successful classifications only. Copy is available when a key is issued; lost secrets must be replaced.</p>
    <ApiCode title="Quick start · Windows cURL" value={curl} />
    <p className="text-xs text-slate-400">On macOS/Linux, use <code>curl</code> instead of <code>curl.exe</code>. JSON accepts <code>imageBase64</code> and optional <code>mimeType</code>. Bearer authentication is also supported.</p>
  </section>;
}
