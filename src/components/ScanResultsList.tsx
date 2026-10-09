import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, ArrowRight, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Item, Category } from '../types';
import { CATEGORY_COLORS, CATEGORY_META, BIN_MAPPING, HONESTY_STRINGS } from '../lib/constants';
import { downloadCsv } from '../lib/csvExport';
import ItemCropThumbnail from './ItemCropThumbnail';

interface ScanResultsListProps {
  sourceLabel: string;
  isAnalysing: boolean;
  items: Item[];
  activeItemId: string | null;
  selectedCategory: Category | 'all';
  confidenceThreshold: number;
  onItemHover: (id: string | null) => void;
  onItemSelect: (id: string) => void;
  onCategoryFilterChange: (cat: Category | 'all') => void;
  onConfirmMaterial?: (itemId: string, newCategory: Category) => void;
}

export const ScanResultsList: React.FC<ScanResultsListProps> = ({
  sourceLabel,
  isAnalysing,
  items,
  activeItemId,
  selectedCategory,
  confidenceThreshold,
  onItemHover,
  onItemSelect,
  onCategoryFilterChange,
  onConfirmMaterial,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const categories: Category[] = ['recyclable', 'organic', 'hazardous', 'nonrecyclable'];

  // Category counts
  const counts: Record<Category | 'all', number> = {
    all: items.length,
    recyclable: 0,
    organic: 0,
    hazardous: 0,
    nonrecyclable: 0,
  };
  items.forEach((item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
  });

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.material.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.itemNumber).includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // Dynamic slim summary values
  const totalCount = items.length;
  const totalMass = items.reduce((acc, i) => acc + i.weightGrams, 0);
  const recMass = items.filter((i) => i.category === 'recyclable').reduce((acc, i) => acc + i.weightGrams, 0);
  const recoverableShare = totalMass > 0 ? (recMass / totalMass) * 100 : 0;
  const hazCount = items.filter((i) => i.isHazardous || i.category === 'hazardous').length;

  const handleRowClick = (itemId: string) => {
    onItemSelect(itemId);
    setExpandedRowId((prev) => (prev === itemId ? null : itemId));
  };

  const handleExportCsv = () => {
    downloadCsv([
      ['Data source', sourceLabel],
      ['Limitations', HONESTY_STRINGS.surfaceNotice],
      ['Confidence note', HONESTY_STRINGS.confidenceNotice],
      ['Number', 'Item Name', 'Category', 'Material', 'Target Bin', 'Model Confidence', 'Estimated Weight (g)', 'Estimated Value Min (INR)', 'Estimated Value Max (INR)', 'Action Required', 'Confirmation'],
      ...items.map(item => [item.itemNumber, item.label, item.category, item.material, item.targetBin, item.confidence, item.weightGrams, item.estimatedValueInr?.min, item.estimatedValueInr?.max, item.actionRequired, item.userConfirmed ? HONESTY_STRINGS.confirmedTag : item.confidence * 100 < confidenceThreshold ? HONESTY_STRINGS.confirmationTag : 'Unconfirmed']),
    ], `ecoscan-items-${Date.now()}.csv`);
  };

  return (
    <div className="scan-results w-full h-full flex flex-col bg-surface border border-border rounded-panel overflow-hidden select-none">
      <div className="results-heading"><h3>Material intelligence <span>{isAnalysing ? 'Analysing…' : `${items.length} items`}</span></h3><span>{sourceLabel}</span></div>
      {/* 1. Slim Summary Line */}
      <div className="px-4 py-2.5 bg-surface-2 border-b border-border flex items-center justify-between text-xs-12 font-mono">
        <span className="text-text">
          <strong className="text-accent">{totalCount} items</strong>
          <span className="text-muted mx-2">·</span>
          <span>{recoverableShare.toFixed(1)}% est. recoverable by weight</span>
          <span className="text-muted mx-2">·</span>
          <span className={hazCount > 0 ? 'text-red-400 font-semibold' : 'text-muted'}>
            {hazCount} hazardous
          </span>
        </span>
      </div>

      {/* 2. Sticky List Header: Search, Category Filter Chips, CSV Action */}
      <div className="p-3 bg-surface border-b border-border space-y-2.5 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search detected items"
              placeholder="Search materials or items…"
              className="w-full pl-8 pr-3 py-1.5 rounded-card bg-surface-2 border border-border text-xs-12 text-text placeholder-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Small CSV Export Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isAnalysing || sourceLabel === 'No scan yet'}
            title="Export CSV of items"
            aria-label="Export items as CSV"
            className="p-1.5 rounded-card bg-surface-2 border border-border text-muted hover:text-text hover:border-white/20 transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Chips with 8px dot and live count */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCategoryFilterChange('all')}
            className={`px-2 py-0.5 rounded-full text-xs-12 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-white/10 text-text border border-white/20'
                : 'text-muted hover:text-text border border-transparent'
            }`}
          >
            <span>All</span>
            <span className="font-mono text-[10px] text-muted">({counts.all})</span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const meta = CATEGORY_META[cat];
            const dotColor = CATEGORY_COLORS[cat];

            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryFilterChange(isSelected ? 'all' : cat)}
                className={`px-2 py-0.5 rounded-full text-xs-12 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? `${meta.badgeClass} ring-1 ring-white/10`
                    : 'text-muted hover:text-text border border-transparent'
                }`}
              >
                {/* 8px Category Dot */}
                <meta.icon size={12} style={{ color: dotColor }} aria-hidden="true" />
                <span>{meta.label}</span>
                <span className="font-mono text-[10px] opacity-70">({counts[cat]})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Message-Like Compact Rows List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[580px] select-text">
        {isAnalysing ? <div role="status" className="space-y-3 p-4"><p className="text-sm text-muted">Analysing visible items…</p>{[1, 2, 3].map(index => <div key={index} className="h-16 rounded-card bg-surface-2 border border-border animate-pulse" aria-hidden="true" />)}</div> : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-xs-12 text-muted">
            No items match your filter criteria.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = activeItemId === item.id;
            const isExpanded = expandedRowId === item.id;
            const isBelowThreshold = !item.userConfirmed && item.confidence * 100 < confidenceThreshold;
            const meta = CATEGORY_META[item.category];
            const bin = BIN_MAPPING[item.category];
            const dotColor = CATEGORY_COLORS[item.category];

            return (
              <div
                key={item.id}
                id={`item-row-${item.id}`}
                onMouseEnter={() => onItemHover(item.id)}
                onMouseLeave={() => onItemHover(null)}
                onClick={() => handleRowClick(item.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={`${item.label}, ${meta.label}, ${Math.round(item.confidence * 100)} percent confidence`}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRowClick(item.id);
                  }
                }}
                className={`rounded-card border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-surface-2 border-accent/40 shadow-sm'
                    : 'bg-surface-2/60 border-border hover:border-white/15 hover:bg-surface-2'
                } ${item.isHazardous ? 'border-l-2 border-l-red-500' : ''}`}
              >
                {/* Compact Row Main Content */}
                <div className="p-2.5 flex items-center justify-between gap-3">
                  {/* Left: 56px Cropped Thumbnail + Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <ItemCropThumbnail
                      item={item}
                      size={56}
                      className={`shrink-0 ${item.isHazardous ? 'hazard-crop-pulse border border-red-500/50' : ''}`}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-semibold text-muted">
                          #{String(item.itemNumber).padStart(2, '0')}
                        </span>
                        <h4 className="font-semibold text-text text-sm-14 truncate">
                          {item.label}
                        </h4>
                      </div>
                      <div className="font-mono text-xs-12 text-muted mt-0.5 truncate">
                        {item.material} · est. {item.weightGrams} g
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1 text-[10px] text-muted"><meta.icon size={12} aria-hidden="true" /><span>{meta.label} · {item.targetBin}</span></div>
                      {(isBelowThreshold || item.userConfirmed) && <span className={`inline-flex items-center gap-1 text-[10px] mt-1 ${isBelowThreshold ? 'text-amber-300' : 'text-accent'}`}>{item.userConfirmed && <Check size={12} aria-hidden="true" />}{isBelowThreshold ? HONESTY_STRINGS.confirmationTag : HONESTY_STRINGS.confirmedTag}</span>}
                    </div>
                  </div>

                  {/* Middle/Right: Category Pill, Bin Swatch, Confidence */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Category Pill with 8px dot */}
                    <div
                      className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs-12 ${meta.badgeClass}`}
                    >
                      <meta.icon size={12} style={{ color: dotColor }} aria-hidden="true" />
                      <span>{meta.label}</span>
                    </div>

                    {/* Bin indicator (dot + short name) */}
                    <div className="hidden md:flex items-center gap-1.5 text-xs-12 text-muted">
                      <span
                        style={{ backgroundColor: bin.colorHex }}
                        className="w-2 h-2 rounded-full shrink-0"
                      />
                      <span className="truncate max-w-[90px]">{bin.binName.replace(' bin', '')}</span>
                    </div>

                    {/* Confidence in Mono */}
                    <div className="text-right w-12 font-mono text-xs-12 tabular-nums">
                      <span
                        className={
                          isBelowThreshold ? 'text-amber-400 font-semibold' : 'text-muted'
                        }
                      >
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-muted transition-transform ${
                        isExpanded ? 'rotate-180 text-text' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Inline Animated Expansion (Action required + Why this bin) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-border bg-surface/50"
                    >
                      <div className="p-3 space-y-2.5 text-xs-12">
                        {/* Target Bin & Action Directive */}
                        <div className="flex items-start gap-2 text-text">
                          <ArrowRight className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-text">Action: </span>
                            <span className="text-muted">{item.actionRequired}</span>
                            <span className="text-muted ml-1">({item.targetBin})</span>
                          </div>
                        </div>

                        {/* Technical Rationale */}
                        <div className="pl-5 text-muted leading-relaxed">
                          <strong className="text-text font-medium">Why this bin: </strong>
                          {item.whyReason}
                        </div>

                        {/* Low-confidence override dropdown if below threshold */}
                        {isBelowThreshold && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-card bg-amber-950/20 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2"
                          >
                            <span className="text-amber-300 font-mono text-[11px]">
                              {HONESTY_STRINGS.confirmationTag}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted text-[11px]">Confirm material:</span>
                              <select
                                aria-label={`Confirm category for ${item.label}`}
                                value={item.category}
                                onChange={(e) => {
                                  if (onConfirmMaterial) {
                                    onConfirmMaterial(item.id, e.target.value as Category);
                                  }
                                }}
                                className="bg-surface border border-border text-text rounded px-2 py-0.5 text-xs-12 focus:border-accent"
                              >
                                <option value="recyclable">Recyclable</option>
                                <option value="organic">Organic</option>
                                <option value="hazardous">Hazardous</option>
                                <option value="nonrecyclable">Non-Recyclable</option>
                              </select>
                              <button type="button" aria-label={`Confirm current category for ${item.label}`} onClick={() => onConfirmMaterial?.(item.id, item.category)} className="p-1 rounded border border-border text-accent"><Check size={14} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Pinned Bottom Action: Generate Audit Report */}
      <div className="p-3 bg-surface border-t border-border">
        <button
          type="button"
          onClick={() => navigate('/audit')}
          disabled={isAnalysing}
          className="w-full py-2.5 px-4 rounded-card bg-accent hover:bg-emerald-400 text-slate-950 font-semibold text-sm-14 flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <span>Generate audit report</span>
          <ArrowRight className="w-4 h-4 text-slate-950" />
        </button>
      </div>
    </div>
  );
};

export default ScanResultsList;
