import React from 'react';
import { TriangleAlert, ShieldAlert, AlertOctagon } from 'lucide-react';
import { Item } from '../types';

interface HazardPanelProps {
  hazardousItems: Item[];
}

export const HazardPanel: React.FC<HazardPanelProps> = ({ hazardousItems }) => {
  const totalHazWeight = hazardousItems.reduce((acc, i) => acc + i.weightGrams, 0);

  return (
    <section
      aria-label="Hazardous materials safety panel"
      className="w-full rounded-xl border border-red-500/40 bg-red-950/20 p-5 shadow-[0_0_24px_rgba(239,68,68,0.12)] space-y-4"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-900/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse-hazard">
            <TriangleAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Hazard Containment & Safety Directives</span>
            </h2>
            <p className="text-xs text-red-300/80">
              Mandatory segregation required prior to mechanical compaction or baling.
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300">
          {hazardousItems.length} {hazardousItems.length === 1 ? 'Item' : 'Items'} ({totalHazWeight} g) Flagged
        </span>
      </div>

      {/* Hazardous Items List */}
      {hazardousItems.length === 0 ? (
        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 text-center text-xs text-slate-400">
          No hazardous items detected in the current top surface scan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hazardousItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-lg bg-slate-900/90 border border-red-500/30 flex flex-col justify-between gap-2 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded font-mono text-xs font-bold bg-red-500 text-slate-950 flex items-center justify-center shrink-0">
                    {String(item.itemNumber).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white text-sm">
                      {item.label}
                    </h3>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-red-300 mt-0.5">
                      <span>{item.material}</span>
                      <span>•</span>
                      <span>{item.weightGrams} g (est.)</span>
                    </div>
                  </div>
                </div>

                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-950/80 border border-red-800/80 text-red-400">
                  {item.targetBin}
                </span>
              </div>

              <div className="text-xs text-slate-300 bg-red-950/30 p-2.5 rounded border border-red-900/40 flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{item.actionRequired}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Worker Safety Callout */}
      <div className="p-3.5 rounded-lg bg-red-900/30 border border-red-500/40 flex items-start gap-3 text-xs text-red-200 leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white font-semibold">Worker safety directive: </strong>
          Follow your local hazardous-waste handling rules. Do not compact, crush or puncture.
        </div>
      </div>
    </section>
  );
};

export default HazardPanel;
