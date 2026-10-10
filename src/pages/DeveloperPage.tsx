import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Code2, LockKeyhole, ArrowUpRight } from 'lucide-react';
import { ApiKeyManager } from '../components/developer/ApiKeyManager';
import { ApiPlayground } from '../components/developer/ApiPlayground';

export default function DeveloperPage() {
  const [adminDraft, setAdminDraft] = useState('');
  const [admin, setAdmin] = useState('');
  const [apiKey, setApiKey] = useState('');
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== '#api-keys' && hash !== '#api-playground') return;
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [hash]);
  return <div className="w-full max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
      <div><div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 uppercase tracking-widest mb-3"><Code2 size={15} />Build with EcoScan</div><h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Developer & API Hub</h1><p className="text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">One endpoint. From a waste photo to sorting intelligence.<br />Connect your robot, prototype, or next hackathon idea.</p></div>
      <span className="self-start inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/5 text-emerald-300 px-3 py-1.5 font-mono text-[11px]"><LockKeyhole size={12} />Server-side vision proxy</span>
    </header>
    <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-slate-400"><span><span className="text-slate-200 font-medium">01</span> Issue an API key</span><span><span className="text-slate-200 font-medium">02</span> Send a photo</span><span className="flex items-center gap-1"><span className="text-slate-200 font-medium">03</span> Get structured detections <ArrowUpRight size={13} /></span></div>
    <details className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"><summary className="cursor-pointer text-xs text-slate-300">Operator access & local setup</summary><div className="pt-4 space-y-3 text-xs text-slate-400 leading-relaxed"><p>Local Windows setup: copy <code>.env.example</code> to <code>.env</code>, set <code>GEMINI_API_KEY</code>, then use <code>npm install</code> and <code>npm run dev</code>. For a standalone Node server, run <code>npm run build</code> then <code>npm start</code>. Keys persist in <code>data/api_keys.json</code>; keep this directory private and backed up. Run one server process per store.</p><p>Direct localhost key management needs no operator secret. Remote access requires the server&apos;s <code>ECO_ADMIN_SECRET</code>. This secret is separate from developer API keys, and is kept only in page memory.</p><p className="text-amber-300/90">File-backed keys require a persistent local/server disk. Vercel serverless deployments cannot retain this store and will return 503 rather than issue unusable keys.</p><form onSubmit={event => { event.preventDefault(); setAdmin(adminDraft); }} className="flex flex-wrap items-end gap-2"><div className="flex-1 min-w-48"><label htmlFor="operator-secret" className="block mb-2">Operator secret</label><input id="operator-secret" type="password" autoComplete="off" value={adminDraft} onChange={event => setAdminDraft(event.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" /></div><button className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200">Apply access</button><button type="button" onClick={() => { setAdmin(''); setAdminDraft(''); }} className="px-3 py-2.5 text-slate-400">Clear</button></form></div></details>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start"><ApiKeyManager key={admin} admin={admin} onIssue={setApiKey} /><ApiPlayground apiKey={apiKey} setApiKey={setApiKey} admin={admin} /></div>
    <p className="text-xs text-slate-500 flex items-start gap-2"><LockKeyhole size={14} className="shrink-0" />Your Google credential and system prompt stay on the server. Image coordinates are normalized to 0–1000; detections require human review before physical actuation.</p>
  </div>;
}
