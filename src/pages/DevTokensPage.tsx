import React from 'react';
import { CATEGORY_META, BIN_MAPPING, HONESTY_STRINGS } from '../lib/constants';
import { Category } from '../types';

export const DevTokensPage: React.FC = () => {
  const categories: Category[] = ['recyclable', 'organic', 'hazardous', 'nonrecyclable'];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-8 space-y-10">
      {/* Page Title */}
      <div className="border-b border-slate-800 pb-5 flex items-center justify-between">
        <div>
          <div className="font-mono text-xs text-emerald-400 tracking-wider uppercase mb-1">
            Internal Visual Inspector
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Design System & Token Verification (/dev/tokens)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visual verification suite for color tokens, typography scales, metadata chips, bin mappings, and glow states.
          </p>
        </div>
        <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {HONESTY_STRINGS.demoTag}
        </span>
      </div>

      {/* 1. Category Colors & Glow States */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono tracking-widest uppercase text-slate-400">
            01. Category Accents, Tints & Glows
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">
            Always conveyed by icon + text
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((catKey) => {
            const meta = CATEGORY_META[catKey];
            const Icon = meta.icon;

            return (
              <div
                key={catKey}
                style={{
                  backgroundColor: meta.bgTint,
                  borderColor: meta.borderTint,
                }}
                className={`p-5 rounded-xl border transition-all ${meta.glowClass} flex flex-col justify-between min-h-[160px]`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      style={{ color: meta.colorHex }}
                      className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800"
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-white text-sm">
                      {meta.label}
                    </span>
                  </div>
                  <span
                    style={{ color: meta.colorHex }}
                    className="font-mono text-xs font-bold"
                  >
                    {meta.colorHex}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Tint: 12%</span>
                  <span>Border: 40%</span>
                  <span>Glow: 25%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Bin Mapping Swatches */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono tracking-widest uppercase text-slate-400">
          02. Bin Mapping Directives (Separate from Category Accent)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((catKey) => {
            const bin = BIN_MAPPING[catKey];
            const meta = CATEGORY_META[catKey];

            return (
              <div
                key={catKey}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-2 shadow-panel-highlight"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    style={{ backgroundColor: bin.colorHex }}
                    className="w-4 h-4 rounded-md shrink-0 shadow-sm"
                  />
                  <span className="text-sm font-semibold text-white">
                    {bin.binName}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Target for <strong className="text-slate-200">{meta.label}</strong> items.
                </div>
                <div className="font-mono text-[11px] text-slate-500 bg-slate-950 p-2 rounded-lg border border-slate-800/80 mt-1">
                  {bin.directive}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Metadata Chips & Badges */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono tracking-widest uppercase text-slate-400">
          03. Monospace Metadata Chips & Pills
        </h2>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-panel-highlight space-y-6">
          <div className="space-y-2">
            <div className="text-xs text-slate-400">Spec Chips (11-12px, slate-800 bg, 1px slate-700 border, pill shaped):</div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                CONF 96%
              </span>
              <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                42 ms
              </span>
              <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                REC-0001
              </span>
              <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                x:0.18 y:0.32
              </span>
              <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                1920x1200
              </span>
              <span className="font-mono text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                PET #01
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-400">Category Badges (Icon + Text combo):</div>
            <div className="flex flex-wrap items-center gap-3">
              {categories.map((c) => {
                const meta = CATEGORY_META[c];
                const Icon = meta.icon;
                return (
                  <span
                    key={c}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${meta.badgeClass}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{meta.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Typography Scale & Tabular Figures */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono tracking-widest uppercase text-slate-400">
          04. Typography Scales & Tabular Figures
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-panel-highlight space-y-4">
            <div className="text-xs font-mono uppercase text-emerald-400">Inter — UI Text</div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">Heading 1 (24px Bold)</h1>
              <h2 className="text-lg font-semibold text-slate-200">Heading 2 (18px Semibold)</h2>
              <h3 className="text-sm font-medium text-slate-300">Heading 3 (14px Medium)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Body text (12px Regular) — Continuous AI optical analysis of incoming hopper loads.
              </p>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">
                Section Label (10px Monospace / Uppercase Wide)
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-panel-highlight space-y-4">
            <div className="text-xs font-mono uppercase text-emerald-400">JetBrains Mono — Telemetry & Numbers</div>
            <div className="space-y-2">
              <div className="font-mono text-xl font-bold text-white tabular-nums">
                ₹18.50 / 984 g (Tabular Numbers)
              </div>
              <div className="font-mono text-xs text-slate-300 tabular-nums">
                CONF: 0.9634 | BBOX: [0.12, 0.18, 0.30, 0.50]
              </div>
              <div className="font-mono text-xs text-slate-400 tabular-nums">
                LATENCY: 42.0 ms | FPS: 30.0 | BUFFER: 100%
              </div>
              <div className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-emerald-400/90 border border-slate-800">
                {'{ "label": "Plastic bottle", "category": "recyclable", "weight": 25 }'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Accessibility Focus Rings */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono tracking-widest uppercase text-slate-400">
          05. Accessibility Focus Ring Verification
        </h2>
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-panel-highlight flex flex-wrap gap-4 items-center">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            Tab to focus me (2px Emerald Ring)
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium"
          >
            Secondary Focusable Target
          </button>
        </div>
      </section>
    </div>
  );
};

export default DevTokensPage;
