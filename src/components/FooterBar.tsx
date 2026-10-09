import React, { useState, useRef, useEffect } from 'react';
import { Sliders, Check, Layers, ChevronUp } from 'lucide-react';
import { HONESTY_STRINGS, APP_INFO } from '../lib/constants';
import { useScanContext } from '../context/ScanContext';
import { ScanState } from '../types';

interface FooterBarProps {
  scanId?: string;
  timestamp?: string;
  modelVersion?: string;
}

export const FooterBar: React.FC<FooterBarProps> = ({
  scanId = APP_INFO.defaultScanId,
  timestamp = '2026-10-09 05:28:14 UTC',
  modelVersion = HONESTY_STRINGS.modelVersion,
}) => {
  const { scanState, setScanState, loadDemoPile } = useScanContext();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popoverOpen]);

  const scanStates: { key: ScanState; label: string; color: string }[] = [
    { key: 'results', label: 'Results (Default)', color: 'text-emerald-400' },
    { key: 'analysing', label: 'Analysing (Sweeping)', color: 'text-sky-400' },
    { key: 'idle', label: 'Idle Viewfinder', color: 'text-slate-300' },
    { key: 'low_confidence', label: 'Low Confidence', color: 'text-amber-400' },
    { key: 'permission_denied', label: 'Permission Denied', color: 'text-orange-400' },
    { key: 'error', label: 'Error / Failed', color: 'text-red-400' },
  ];

  return (
    <footer className="h-8 w-full bg-slate-900 border-t border-slate-800/80 px-3 sm:px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none z-30 relative">
      {/* Left: Model and Telemetry */}
      <div className="flex items-center gap-3 truncate">
        <span className="text-slate-300 font-medium">{modelVersion}</span>
        <span className="text-slate-600 hidden sm:inline">•</span>
        <span className="hidden sm:inline text-slate-400">ID: {scanId}</span>
        <span className="text-slate-600 hidden md:inline">•</span>
        <span className="hidden md:inline text-slate-500">{timestamp}</span>
      </div>

      {/* Right: Demo Controls Popover & Notice */}
      <div className="shrink-0 flex items-center gap-2 relative" ref={popoverRef}>
        {/* Demo Controls Popover Trigger */}
        <button
          type="button"
          onClick={() => setPopoverOpen((prev) => !prev)}
          aria-label="Toggle demo state controls popover"
          aria-expanded={popoverOpen}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
            popoverOpen
              ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
              : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-300'
          }`}
        >
          <Sliders className="w-3 h-3 text-emerald-400" />
          <span>Demo controls</span>
          <ChevronUp className={`w-3 h-3 transition-transform ${popoverOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Demo Controls Floating Menu */}
        {popoverOpen && (
          <div className="absolute bottom-9 right-0 w-64 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-semibold text-white text-[11px] font-mono flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulate Scan States</span>
              </span>
              <span className="font-mono text-[9px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            <div className="flex flex-col gap-1">
              {scanStates.map((st) => {
                const isActive = scanState === st.key;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => {
                      setScanState(st.key);
                      setPopoverOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 border border-slate-700 font-semibold'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <span className={st.color}>{st.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-1.5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  loadDemoPile();
                  setPopoverOpen(false);
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Load demo pile (12 items)</span>
              </button>
            </div>
          </div>
        )}

        <span className="text-emerald-500/80 hidden xs:inline">●</span>
        <span className="text-slate-400 text-[10px] sm:text-[11px] hidden sm:inline">
          {HONESTY_STRINGS.visibleTopLayerNotice}
        </span>
      </div>
    </footer>
  );
};

export default FooterBar;
