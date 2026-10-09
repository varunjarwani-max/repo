import { useState } from 'react';
import { Upload, Play, Terminal, ImagePlus } from 'lucide-react';
import { useSWRConfig } from 'swr';
import { keysCacheKey } from './ApiKeyManager';
import { ApiCode } from './ApiCode';

interface Detection { id: number; item_name: string; category: string; bbox: { ymin: number; xmin: number; ymax: number; xmax: number }; }
interface ApiResult { success?: boolean; error?: string; result?: { detectedItems: Detection[]; operationalSummary: string }; }
export function ApiPlayground({ apiKey, setApiKey, admin }: { apiKey: string; setApiKey: (value: string) => void; admin: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState<{ status: number; statusText: string; latency: number; body: ApiResult; raw: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { mutate } = useSWRConfig();
  async function selectFile(selected?: File) {
    if (!selected || busy) return;
    setError(''); setResult(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 8 * 1024 * 1024) { setError('Choose a JPG, PNG, or WebP image up to 8 MB.'); return; }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read image.')); reader.readAsDataURL(selected); });
      setFile(selected); setPreview(dataUrl);
    } catch { setError('Could not read that image. Try another file.'); }
  }
  async function sample() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/images/ghazipur-workers-2013.jpg');
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      setBusy(false);
      await selectFile(new File([blob], 'landfill-sample.jpg', { type: 'image/jpeg' }));
    } catch { setError('Could not load sample image. Upload a photo instead.'); }
    finally { setBusy(false); }
  }
  async function execute(event: React.FormEvent) {
    event.preventDefault(); if (!file || busy) return;
    setBusy(true); setError(''); setResult(null);
    const started = performance.now();
    try {
      const form = new FormData(); form.append('image', file);
      const response = await fetch('/api/v1/classify-external', { method: 'POST', headers: { 'x-api-key': apiKey.trim() }, body: form, signal: AbortSignal.timeout(55000) });
      const raw = await response.text();
      let body: ApiResult;
      try { body = JSON.parse(raw); } catch { body = { error: 'Server returned a non-JSON response.' }; }
      setResult({ status: response.status, statusText: response.statusText || (response.ok ? 'OK' : 'Error'), latency: Math.round(performance.now() - started), body, raw: JSON.stringify(body, null, 2) });
      if (response.ok) await mutate(keysCacheKey(admin));
    } catch (error) { setError(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'Request timed out. Try again with a smaller photo.' : 'Could not reach the API. Check that the local server is running.'); }
    finally { setBusy(false); }
  }
  const detections = result?.status === 200 ? result.body.result?.detectedItems || [] : [];
  return <section aria-labelledby="playground-title" className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 min-w-0">
    <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-sky-500/10 text-sky-300"><Terminal size={19} /></div><div><h2 id="playground-title" className="font-semibold text-white">API playground</h2><p className="text-xs text-slate-400 mt-1">Real requests. Inspect every response.</p></div></div>
    <form onSubmit={execute} className="space-y-4">
      <div><label htmlFor="test-api-key" className="block text-xs text-slate-300 mb-2">Enter Your API Key <code className="text-slate-500">(x-api-key)</code></label><input id="test-api-key" type="password" autoComplete="off" spellCheck={false} value={apiKey} onChange={event => { setApiKey(event.target.value); setResult(null); }} placeholder="eco_live_…" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono text-white" /></div>
      <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void selectFile(event.dataTransfer.files[0]); }} className="relative rounded-xl border border-dashed border-slate-700 bg-slate-950/60 text-center p-6">
        <Upload size={24} className="mx-auto text-slate-500 mb-3" /><label htmlFor="playground-image" className="text-sm text-slate-200 cursor-pointer">Drop an image or <span className="text-emerald-400 underline underline-offset-4">browse files</span></label><input id="playground-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { void selectFile(event.target.files?.[0]); event.target.value = ''; }} className="block w-full text-xs text-slate-400 mt-3 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:text-slate-200 file:px-3 file:py-2" /><p className="text-[11px] text-slate-500 mt-3">JPG, PNG, WebP · max 8 MB · sent to Gemini on execution, not saved by EcoScan</p>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap"><button type="button" disabled={busy} onClick={() => void sample()} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-50"><ImagePlus size={14} />Use landfill sample photo</button><span className="font-mono text-[10px] text-slate-500">POST /api/v1/classify-external</span></div>
      <button disabled={busy || !file} className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed"><Play size={15} />{busy ? 'Executing request…' : 'Execute API Request'}</button>
      <p className="text-[11px] text-slate-500">Leave the key blank to verify a 401 response. Limit: 10 requests per key per minute; 3 simultaneous model calls per server.</p>
    </form>
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    {preview && <figure className="space-y-2"><div className="relative w-full overflow-hidden rounded-xl border border-slate-700"><img src={preview} alt="Selected waste photo for API testing" className="block w-full h-auto" />{detections.map(item => <div key={item.id} className={`absolute border-2 ${item.category === 'Hazardous' ? 'border-amber-400' : 'border-emerald-400'}`} style={{ top: `${item.bbox.ymin / 10}%`, left: `${item.bbox.xmin / 10}%`, height: `${(item.bbox.ymax - item.bbox.ymin) / 10}%`, width: `${(item.bbox.xmax - item.bbox.xmin) / 10}%` }}><span className="block bg-slate-950/90 text-white text-[10px] px-1 truncate">{item.id}. {item.item_name}</span></div>)}</div><figcaption className="text-xs text-slate-400 break-all">{file?.name}{result?.status === 200 ? ` · ${detections.length} detected items · visual estimates, not robot calibration` : ' · awaiting successful classification'}</figcaption></figure>}
    <div aria-live="polite">{result ? <div className="space-y-3"><div className={`inline-flex rounded-md border px-2.5 py-1.5 text-xs font-mono ${result.status < 300 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'}`}>{result.status} {result.statusText} · {result.latency} ms</div>{result.body.result?.operationalSummary && <p className="text-sm text-slate-300 leading-relaxed">{result.body.result.operationalSummary}</p>}<ApiCode title="JSON response" value={result.raw} json /></div> : <div className="rounded-xl border border-slate-800 p-6 text-center"><Terminal size={22} className="mx-auto text-slate-600 mb-2" /><p className="text-xs text-slate-500">Your response will appear here.</p><p className="text-[11px] text-slate-600 mt-1">Status, round-trip latency, JSON, and detection overlays.</p></div>}</div>
  </section>;
}
