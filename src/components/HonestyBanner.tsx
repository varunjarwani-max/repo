import React from 'react';
import { Info } from 'lucide-react';
import { HONESTY_STRINGS } from '../lib/constants';
import { Link, useLocation } from 'react-router-dom';
import { useScanContext } from '../context/ScanContext';

export const HonestyBanner: React.FC = () => {
  const { backendStatus } = useScanContext();
  const { pathname } = useLocation();
  const sourceLabel = pathname === '/sites' ? HONESTY_STRINGS.demoTag : backendStatus === 'connected' ? HONESTY_STRINGS.liveTag : backendStatus === 'fallback' ? HONESTY_STRINGS.fallbackTag : HONESTY_STRINGS.demoTag;
  return (
    <aside
      aria-label="System operational disclaimer"
      className="eco-disclaimer w-full border-b text-slate-400 text-xs flex flex-wrap items-center justify-between gap-3 select-none z-30"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
        <span className="text-[11px] sm:text-xs">
          {HONESTY_STRINGS.surfaceNotice}
        </span>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
          {sourceLabel}
        </span>
        <Link to="/about" className="text-[11px] underline underline-offset-4 hover:text-white">What&apos;s real?</Link>
      </div>
    </aside>
  );
};

export default HonestyBanner;
