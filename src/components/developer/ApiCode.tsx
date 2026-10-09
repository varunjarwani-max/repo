import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(value); setMessage('Copied'); }
    catch { setMessage('Copy failed; select the text'); }
  }
  return <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white rounded p-1.5" aria-label={label}>
    {message === 'Copied' ? <Check size={14} /> : <Copy size={14} />}<span role="status">{message || label}</span>
  </button>;
}

export function ApiCode({ value, title, json = false }: { value: string; title: string; json?: boolean }) {
  const tokens = json ? value.split(/("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?)/g) : [value];
  return <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
    <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-2"><span className="text-xs font-mono text-slate-400">{title}</span><CopyButton value={value} label={`Copy ${title}`} /></div>
    <pre tabIndex={0} className="p-4 text-xs leading-6 font-mono overflow-auto max-h-96 text-slate-300"><code>{tokens.map((token, index) => <span key={index} className={json ? /^".*:\s*$/.test(token) ? 'text-sky-300' : token.startsWith('"') ? 'text-emerald-300' : /^(true|false|null|-?\d)/.test(token) ? 'text-amber-300' : '' : ''}>{token}</span>)}</code></pre>
  </div>;
}
