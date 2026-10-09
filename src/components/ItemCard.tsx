import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, TriangleAlert, ArrowRight } from 'lucide-react';
import { Item, Category } from '../types';
import { CATEGORY_META, BIN_MAPPING } from '../lib/constants';

interface ItemCardProps {
  item: Item;
  isActive: boolean;
  isBelowThreshold: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onConfirmMaterial?: (itemId: string, newCategory: Category) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  isActive,
  isBelowThreshold,
  onHover,
  onSelect,
  onConfirmMaterial,
}) => {
  const [whyExpanded, setWhyExpanded] = useState(false);
  const meta = CATEGORY_META[item.category];
  const bin = BIN_MAPPING[item.category];
  const CategoryIcon = meta.icon;
  const confPercent = Math.round(item.confidence * 100);

  const formattedNum = String(item.itemNumber).padStart(2, '0');

  return (
    <article
      id={`card-${item.id}`}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(item.id)}
      style={{
        borderColor: isActive ? meta.colorHex : isBelowThreshold ? '#475569' : undefined,
      }}
      className={`relative rounded-xl border bg-slate-900/90 p-3.5 transition-all cursor-pointer shadow-sm select-none ${
        isActive
          ? `${meta.glowClass} ring-1 ring-emerald-500/50 -translate-y-0.5`
          : 'border-slate-800 hover:border-slate-700 hover:-translate-y-0.5'
      } ${item.isHazardous ? 'border-t-2 border-t-red-500' : ''}`}
    >
      {/* Hazardous Top Warning Banner */}
      {item.isHazardous && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 bg-red-950/40 px-2 py-1 rounded-md mb-2 border border-red-900/50">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
          <span>HAZARDOUS HANDLING MANDATORY</span>
        </div>
      )}

      {/* Card Header: Number Badge, Name, Category Pill, Material Chip */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Number Badge */}
          <span
            style={{ backgroundColor: isBelowThreshold ? '#475569' : meta.colorHex }}
            className="w-6 h-6 rounded-md font-mono text-xs font-bold text-slate-950 flex items-center justify-center shrink-0 shadow-sm"
          >
            {formattedNum}
          </span>
          <div>
            <h3 className="font-semibold text-white text-sm leading-snug">
              {item.label}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              {/* Category Pill (Icon + Text) */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${meta.badgeClass}`}
              >
                <CategoryIcon className="w-3 h-3" />
                <span>{meta.label}</span>
              </span>

              {/* Material Chip */}
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {item.material}
              </span>
            </div>
          </div>
        </div>

        {/* Confidence Mini-Bar */}
        <div className="flex flex-col items-end shrink-0 w-16">
          <span className="font-mono text-[11px] text-slate-300 tabular-nums font-semibold">
            {confPercent}%
          </span>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div
              style={{
                width: `${confPercent}%`,
                backgroundColor: isBelowThreshold ? '#94A3B8' : meta.colorHex,
              }}
              className="h-full rounded-full transition-all"
            />
          </div>
        </div>
      </div>

      {/* Target Bin Row (Swatch + Directive) */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2 text-xs">
        <div
          style={{ backgroundColor: bin.colorHex }}
          className="w-3 h-3 rounded shrink-0 shadow-sm"
          title={bin.binName}
        />
        <span className="text-slate-400 font-medium truncate">
          Bin: <strong className="text-slate-200">{item.targetBin}</strong>
        </span>
      </div>

      {/* Action Required Row */}
      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-300">
        <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
        <span className="line-clamp-2 leading-relaxed">{item.actionRequired}</span>
      </div>

      {/* Low-Confidence State or Below Threshold: Inline Confirmation */}
      {isBelowThreshold && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2.5 p-2 rounded-lg bg-amber-950/30 border border-amber-500/40 text-xs flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between text-amber-300 font-medium text-[11px]">
            <span>Low optical confidence</span>
            {item.userConfirmed && (
              <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                <Check className="w-3 h-3" />
                <span>User confirmed</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-[11px] whitespace-nowrap">
              Confirm material:
            </label>
            <select
              defaultValue={item.category}
              onChange={(e) => {
                if (onConfirmMaterial) {
                  onConfirmMaterial(item.id, e.target.value as Category);
                }
              }}
              className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-0.5 text-xs focus:border-emerald-500"
            >
              <option value="recyclable">Recyclable</option>
              <option value="organic">Organic</option>
              <option value="hazardous">Hazardous</option>
              <option value="nonrecyclable">Non-Recyclable</option>
            </select>
          </div>
        </div>
      )}

      {/* Collapsible "Why?" Reasoning Section */}
      <div className="mt-2 pt-2 border-t border-slate-800/60">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setWhyExpanded((prev) => !prev);
          }}
          className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span className="font-mono uppercase tracking-wider text-[10px]">Why this bin?</span>
          {whyExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {whyExpanded && (
          <p className="mt-1.5 text-xs text-slate-300 bg-slate-950/80 p-2 rounded-md border border-slate-800/80 leading-relaxed">
            {item.whyReason}
          </p>
        )}
      </div>
    </article>
  );
};

export default ItemCard;
