import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Item } from '../types';
import { CATEGORY_COLORS, CATEGORY_META } from '../lib/constants';
import ItemCropThumbnail from './ItemCropThumbnail';

interface PickListProps {
  items: Item[];
  revealed: boolean;
  onSelectWhere: (itemId: string) => void;
}

export const PickList: React.FC<PickListProps> = ({ items, revealed, onSelectWhere }) => {
  const navigate = useNavigate();

  // Sorting rule:
  // 1. Hazardous items first for safety
  // 2. Non-hazardous items sorted descending by estimated value midpoint ((min + max) / 2)
  // 3. Zero-value items sorted by weight descending
  const rankedItems = [...items].sort((a, b) => {
    if (a.isHazardous && !b.isHazardous) return -1;
    if (!a.isHazardous && b.isHazardous) return 1;

    const valA = a.estimatedValueInr ? (a.estimatedValueInr.min + a.estimatedValueInr.max) / 2 : -1;
    const valB = b.estimatedValueInr ? (b.estimatedValueInr.min + b.estimatedValueInr.max) / 2 : -1;

    if (valB !== valA) return valB - valA;
    return b.weightGrams - a.weightGrams;
  });

  const handleWhereClick = (itemId: string) => {
    onSelectWhere(itemId);
    navigate('/');
  };

  return (
    <div className="w-full h-full bg-surface border border-border rounded-panel p-4 flex flex-col justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h3 className="text-sm-14 font-semibold text-text">Recover First Queue</h3>
          <p className="text-xs-12 text-muted">Ranked by safety priority and secondary market value</p>
        </div>
        <span className="font-mono text-xs-12 text-muted px-2 py-0.5 rounded-full bg-surface-2 border border-border">
          {items.length} items
        </span>
      </div>

      {/* Scrollable list with 50ms stagger animation */}
      <div className="my-2 space-y-2 max-h-[310px] overflow-y-auto pr-1 select-text">
        {rankedItems.map((item, index) => {
          const rank = index + 1;
          const meta = CATEGORY_META[item.category];
          const dotColor = CATEGORY_COLORS[item.category];

          const valueDisplay = item.estimatedValueInr
            ? `₹${item.estimatedValueInr.min.toFixed(1)} - ₹${item.estimatedValueInr.max.toFixed(1)}`
            : item.isHazardous
            ? 'Safety Priority'
            : 'Nil Value';

          return (
            <motion.div
              key={item.id}
              initial={{ y: 8, opacity: 0 }}
              animate={revealed ? { y: 0, opacity: 1 } : { y: 8, opacity: 0 }}
              transition={{
                duration: 0.25,
                ease: 'easeOut',
                delay: index * 0.05, // 50ms intervals
              }}
              className={`p-2.5 rounded-card border transition-all flex items-center justify-between gap-3 ${
                item.isHazardous
                  ? 'bg-red-950/20 border-red-500/40 hover:border-red-500/60'
                  : 'bg-surface-2/60 border-border hover:border-white/15 hover:bg-surface-2'
              }`}
            >
              {/* Left: Rank Badge + 56px Cropped Photo + Names */}
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-6 h-6 rounded font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                    item.isHazardous
                      ? 'bg-red-500 text-slate-950'
                      : rank <= 3
                      ? 'bg-accent text-slate-950'
                      : 'bg-surface border border-border text-muted'
                  }`}
                >
                  #{rank}
                </span>

                {/* 56px Cropped Photo */}
                <ItemCropThumbnail
                  item={item}
                  size={56}
                  className="shrink-0"
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-text text-sm-14 truncate">
                      {item.label}
                    </h4>
                    {item.isHazardous && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                  </div>
                  <div className="font-mono text-xs-12 text-muted mt-0.5 truncate">
                    {item.material} · {item.weightGrams} g
                  </div>
                </div>
              </div>

              {/* Middle / Right: Category Pill, Value Range, Where Button */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Category Pill with 8px dot */}
                <div
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs-12 ${meta.badgeClass}`}
                >
                  <span
                    style={{ backgroundColor: dotColor }}
                    className="w-2 h-2 rounded-full shrink-0"
                  />
                  <span>{meta.label}</span>
                </div>

                {/* Value Range in Mono */}
                <div className="text-right font-mono text-xs-12 tabular-nums min-w-[75px]">
                  <span
                    className={
                      item.isHazardous
                        ? 'text-red-400 font-semibold'
                        : item.estimatedValueInr
                        ? 'text-accent font-semibold'
                        : 'text-muted'
                    }
                  >
                    {valueDisplay}
                  </span>
                </div>

                {/* "Where" Navigation Action */}
                <button
                  type="button"
                  onClick={() => handleWhereClick(item.id)}
                  title={`Locate item #${item.itemNumber} on viewfinder`}
                  className="px-2.5 py-1.5 rounded-card bg-surface hover:bg-white/5 border border-border hover:border-white/20 text-text text-xs-12 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5 text-accent" />
                  <span>Where</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Slim Queue Footer Info */}
      <div className="pt-2 border-t border-border flex items-center justify-between text-xs-12 font-mono text-muted">
        <span>SAFETY PROTOCOL: ISOLATE RED ROWS PRIOR TO SORTING</span>
        <span className="text-accent">ORDERED BY VALUE MIDPOINT</span>
      </div>
    </div>
  );
};

export default PickList;
