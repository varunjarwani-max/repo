import React, { useState, useEffect } from 'react';
import { Item, Category } from '../types';
import { CATEGORY_COLORS, CATEGORY_META } from '../lib/constants';

interface CompositionRingProps {
  items: Item[];
  revealed: boolean;
}

export const CompositionRing: React.FC<CompositionRingProps> = ({ items, revealed }) => {
  const [metricMode, setMetricMode] = useState<'weight' | 'count'>('weight');

  const categories: Category[] = ['recyclable', 'organic', 'hazardous', 'nonrecyclable'];

  const totalCount = items.length;
  const totalWeight = items.reduce((acc, i) => acc + i.weightGrams, 0);

  const recyclableItems = items.filter((i) => i.category === 'recyclable');
  const recyclableWeight = recyclableItems.reduce((acc, i) => acc + i.weightGrams, 0);
  const recoverableWeightShare = totalWeight > 0 ? (recyclableWeight / totalWeight) * 100 : 0;

  // Category statistics computed dynamically
  const categoryStats = categories.map((catKey) => {
    const catItems = items.filter((i) => i.category === catKey);
    const count = catItems.length;
    const weightGrams = catItems.reduce((acc, i) => acc + i.weightGrams, 0);

    const countPercent = totalCount > 0 ? (count / totalCount) * 100 : 0;
    const weightPercent = totalWeight > 0 ? (weightGrams / totalWeight) * 100 : 0;

    return {
      key: catKey,
      label: CATEGORY_META[catKey].label,
      color: CATEGORY_COLORS[catKey],
      count,
      weightGrams,
      countPercent,
      weightPercent,
      fraction: metricMode === 'weight' ? (weightPercent / 100) : (countPercent / 100),
    };
  });

  // Ring drawing progress animation: 0 -> 1 over 900ms (cubic ease-out)
  const [drawProgress, setDrawProgress] = useState(0);
  const radius = 70;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius; // ~439.82

  useEffect(() => {
    if (!revealed) {
      setDrawProgress(0);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDrawProgress(1);
      return;
    }

    let startTimestamp: number | null = null;
    let animId: number;
    const duration = 900; // 900ms

    const step = (now: number) => {
      if (!startTimestamp) startTimestamp = now;
      const elapsed = now - startTimestamp;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out: 1 - Math.pow(1 - progress, 3)
      const ease = 1 - Math.pow(1 - progress, 3);
      setDrawProgress(progress >= 1 ? 1 : ease);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [revealed, metricMode]);

  // Center number count-up animation: 0 -> target over 1.2s
  const [centerVal, setCenterVal] = useState(0);
  const targetCenterVal = metricMode === 'weight' ? recoverableWeightShare : totalCount;

  useEffect(() => {
    if (!revealed) {
      setCenterVal(0);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCenterVal(targetCenterVal);
      return;
    }

    let startTimestamp: number | null = null;
    let animId: number;
    const duration = 1200; // 1.2s

    const step = (now: number) => {
      if (!startTimestamp) startTimestamp = now;
      const elapsed = now - startTimestamp;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = progress >= 1 ? targetCenterVal : ease * targetCenterVal;
      setCenterVal(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [revealed, targetCenterVal]);

  // Sequential segment arc computation
  let accumulatedLength = 0;
  const currentTotalDrawn = drawProgress * circumference;

  return (
    <div className="w-full h-full bg-surface border border-border rounded-panel p-4 flex flex-col justify-between select-none">
      {/* Top Header & By Weight / By Count Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h3 className="text-sm-14 font-semibold text-text">Composition Breakdown</h3>
          <p className="text-xs-12 text-muted">Material stream proportions</p>
        </div>

        {/* Pill Toggle */}
        <div className="flex items-center bg-surface-2 p-1 rounded-card border border-border text-xs-12 font-medium">
          <button
            type="button"
            onClick={() => setMetricMode('weight')}
            className={`px-2.5 py-1 rounded-card transition-colors cursor-pointer ${
              metricMode === 'weight'
                ? 'bg-accent text-slate-950 font-semibold'
                : 'text-muted hover:text-text'
            }`}
          >
            By weight
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('count')}
            className={`px-2.5 py-1 rounded-card transition-colors cursor-pointer ${
              metricMode === 'count'
                ? 'bg-accent text-slate-950 font-semibold'
                : 'text-muted hover:text-text'
            }`}
          >
            By count
          </button>
        </div>
      </div>

      {/* Center: Ring SVG with Center Metric */}
      <div className="flex items-center justify-center my-3 relative">
        <svg
          width="190"
          height="190"
          viewBox="0 0 190 190"
          className="overflow-visible"
        >
          {/* Subtle background track */}
          <circle
            cx="95"
            cy="95"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={strokeWidth}
          />

          {/* Sequential Animated Category Segments */}
          {categoryStats.map((stat) => {
            const segTargetLength = stat.fraction * circumference;
            const segDrawnLength = Math.max(
              0,
              Math.min(segTargetLength, currentTotalDrawn - accumulatedLength)
            );
            const startOffset = accumulatedLength;
            accumulatedLength += segTargetLength;

            if (segDrawnLength <= 0) return null;

            return (
              <circle
                key={stat.key}
                cx="95"
                cy="95"
                r={radius}
                fill="none"
                stroke={stat.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segDrawnLength} ${circumference}`}
                strokeDashoffset={-startOffset}
                strokeLinecap="round"
                transform="rotate(-90 95 95)"
                style={{
                  transition: 'stroke 200ms ease',
                }}
              />
            );
          })}
        </svg>

        {/* Donut Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="font-mono text-2xl font-bold text-text tabular-nums leading-none">
            {metricMode === 'weight'
              ? `${centerVal.toFixed(1)}%`
              : `${Math.round(centerVal)}`}
          </span>
          <span className="text-[11px] font-mono text-muted uppercase tracking-wider mt-1.5">
            {metricMode === 'weight' ? 'Recoverable' : 'Items'}
          </span>
        </div>
      </div>

      {/* Compact Bottom Legend */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
        {categoryStats.map((stat) => {
          const pct = metricMode === 'weight' ? stat.weightPercent : stat.countPercent;
          const displayVal =
            metricMode === 'weight'
              ? `${stat.weightGrams} g`
              : `${stat.count} pcs`;

          return (
            <div
              key={stat.key}
              className="p-1.5 rounded-card bg-surface-2/60 border border-border flex items-center justify-between text-xs-12"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  style={{ backgroundColor: stat.color }}
                  className="w-2 h-2 rounded-full shrink-0"
                />
                <span className="text-text font-medium truncate">{stat.label}</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-muted text-[11px] tabular-nums shrink-0">
                <span>{displayVal}</span>
                <span className="text-text font-semibold ml-1">
                  {pct.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompositionRing;
