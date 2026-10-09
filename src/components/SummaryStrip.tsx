import React from 'react';
import { Item, Category } from '../types';
import { CATEGORY_META } from '../lib/constants';

interface SummaryStripProps {
  items: Item[];
}

export const SummaryStrip: React.FC<SummaryStripProps> = ({ items }) => {
  const categories: Category[] = ['recyclable', 'organic', 'hazardous', 'nonrecyclable'];

  // Calculate live counts
  const counts: Record<Category, number> = {
    recyclable: 0,
    organic: 0,
    hazardous: 0,
    nonrecyclable: 0,
  };

  let minValTotal = 0;
  let maxValTotal = 0;

  items.forEach((item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    if (item.estimatedValueInr) {
      minValTotal += item.estimatedValueInr.min;
      maxValTotal += item.estimatedValueInr.max;
    }
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full select-none">
      {categories.map((catKey) => {
        const meta = CATEGORY_META[catKey];
        const Icon = meta.icon;
        const count = counts[catKey];

        return (
          <div
            key={catKey}
            style={{
              backgroundColor: meta.bgTint,
              borderColor: meta.borderTint,
            }}
            className="p-2 sm:p-2.5 rounded-lg border flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
              <span className="flex items-center gap-1 truncate">
                <Icon className="w-3 h-3" style={{ color: meta.colorHex }} />
                <span className="truncate">{meta.label}</span>
              </span>
            </div>
            <div
              style={{ color: meta.colorHex }}
              className="text-lg sm:text-xl font-mono font-bold mt-1 tabular-nums"
            >
              {count}
            </div>
          </div>
        );
      })}

      {/* 5th Tile: Est. Value */}
      <div className="col-span-2 sm:col-span-1 p-2 sm:p-2.5 rounded-lg border border-slate-700 bg-slate-800/80 flex flex-col justify-between">
        <div className="text-[11px] font-medium text-slate-400">Est. Value</div>
        <div className="text-sm sm:text-base font-mono font-bold text-emerald-400 mt-1 tabular-nums truncate">
          ₹{minValTotal.toFixed(0)}-{maxValTotal.toFixed(0)}
        </div>
      </div>
    </div>
  );
};

export default SummaryStrip;
