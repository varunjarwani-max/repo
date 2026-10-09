import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Table2, Search, FileText } from 'lucide-react';
import { Item, Category } from '../types';
import { CATEGORY_META } from '../lib/constants';
import SummaryStrip from './SummaryStrip';
import ItemCard from './ItemCard';
import ItemTable from './ItemTable';

interface ResultsPanelProps {
  items: Item[];
  activeItemId: string | null;
  selectedCategory: Category | 'all';
  confidenceThreshold: number;
  onItemHover: (id: string | null) => void;
  onItemSelect: (id: string) => void;
  onCategoryFilterChange: (cat: Category | 'all') => void;
  onConfirmMaterial?: (itemId: string, newCategory: Category) => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: Category[] = ['recyclable', 'organic', 'hazardous', 'nonrecyclable'];

  // Calculate live counts per category for the filter chips
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

  // Filter items by category and search query
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.material.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.itemNumber).includes(searchQuery);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full h-full flex flex-col gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-5 shadow-panel-highlight select-none overflow-hidden">
      {/* Mobile Drag Handle Indicator */}
      <div className="w-full flex justify-center pb-0.5 lg:hidden" aria-hidden="true">
        <div className="w-12 h-1.5 rounded-full bg-slate-700" />
      </div>

      {/* 1. Header Toolbar: View Switcher & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Segmented View Switcher: Cards | Table */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Table</span>
          </button>
        </div>

        {/* Search Field */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search material, name, #..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* 2. Category Filter Chips with Live Counts */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onCategoryFilterChange('all')}
          className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 border cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-slate-800 border-slate-600 text-white font-bold shadow-sm'
              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>All</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {counts.all}
          </span>
        </button>

        {categories.map((catKey) => {
          const meta = CATEGORY_META[catKey];
          const isSelected = selectedCategory === catKey;
          const count = counts[catKey];
          const Icon = meta.icon;

          return (
            <button
              key={catKey}
              type="button"
              onClick={() => onCategoryFilterChange(isSelected ? 'all' : catKey)}
              style={{
                borderColor: isSelected ? meta.colorHex : undefined,
                color: isSelected ? meta.colorHex : undefined,
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 border cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 font-bold shadow-sm'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{meta.label}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Summary Strip */}
      <SummaryStrip items={items} />

      {/* 4. Scrollable Results Area: Cards or Table */}
      <div className="flex-1 overflow-y-auto min-h-[320px] max-h-[580px] pr-1">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No waste items matched your search or category filter.
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const isActive = activeItemId === item.id;
              const isBelowThreshold = item.confidence * 100 < confidenceThreshold;

              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  isBelowThreshold={isBelowThreshold}
                  onHover={onItemHover}
                  onSelect={onItemSelect}
                  onConfirmMaterial={onConfirmMaterial}
                />
              );
            })}
          </div>
        ) : (
          <ItemTable
            items={filteredItems}
            activeItemId={activeItemId}
            confidenceThreshold={confidenceThreshold}
            onHover={onItemHover}
            onSelect={onItemSelect}
          />
        )}
      </div>

      {/* 5. Bottom Action: Generate Audit Report */}
      <div className="pt-3 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => navigate('/audit')}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-glow-recyclable transition-all cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>Generate Audit Report</span>
        </button>
      </div>
    </div>
  );
};

export default ResultsPanel;
