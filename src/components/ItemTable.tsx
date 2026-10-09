import React, { useState } from 'react';
import { ArrowUpDown, Download, CheckSquare, Square } from 'lucide-react';
import { Item } from '../types';
import { CATEGORY_META, BIN_MAPPING } from '../lib/constants';

interface ItemTableProps {
  items: Item[];
  activeItemId: string | null;
  confidenceThreshold: number;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

type SortField = 'itemNumber' | 'label' | 'category' | 'confidence' | 'weightGrams';

export const ItemTable: React.FC<ItemTableProps> = ({
  items,
  activeItemId,
  confidenceThreshold,
  onHover,
  onSelect,
}) => {
  const [sortField, setSortField] = useState<SortField>('itemNumber');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'itemNumber') comparison = a.itemNumber - b.itemNumber;
    else if (sortField === 'label') comparison = a.label.localeCompare(b.label);
    else if (sortField === 'category') comparison = a.category.localeCompare(b.category);
    else if (sortField === 'confidence') comparison = a.confidence - b.confidence;
    else if (sortField === 'weightGrams') comparison = a.weightGrams - b.weightGrams;
    return sortAsc ? comparison : -comparison;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const exportCsv = () => {
    const headers = [
      'Number',
      'Item Name',
      'Category',
      'Material',
      'Target Bin',
      'BBox X',
      'BBox Y',
      'BBox W',
      'BBox H',
      'Confidence',
      'Est Weight (g)',
      'Action Required',
    ];

    const rows = sortedItems.map((item) => [
      item.itemNumber,
      `"${item.label}"`,
      item.category,
      item.material,
      `"${item.targetBin}"`,
      item.bbox.x.toFixed(2),
      item.bbox.y.toFixed(2),
      item.bbox.width.toFixed(2),
      item.bbox.height.toFixed(2),
      `${Math.round(item.confidence * 100)}%`,
      item.weightGrams,
      `"${item.actionRequired}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ecoscan-items-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      {/* Top Action Bar: Selection Count & Export CSV */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-slate-400 font-mono">
          {selectedIds.size} of {items.length} items selected
        </span>
        <button
          type="button"
          onClick={exportCsv}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-medium"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Responsive Table Container */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-sm max-h-[540px]">
        <table className="w-full text-left text-xs border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider z-20">
            <tr>
              <th className="p-3 w-14 sticky left-0 bg-slate-900 z-30 border-r border-slate-800/80 shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    aria-label="Select all rows"
                    className="text-slate-400 hover:text-white"
                  >
                    {selectedIds.size === items.length && items.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <span
                    onClick={() => handleSort('itemNumber')}
                    className="cursor-pointer hover:text-white"
                  >
                    #
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort('label')}
                className="p-3 cursor-pointer hover:text-white sticky left-14 bg-slate-900 z-30 border-r border-slate-800/80 min-w-[130px] shadow-[2px_0_4px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center gap-1">
                  <span>Item Name</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('category')}
                className="p-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Category</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">Target Bin</th>
              <th className="p-3 font-mono">BBox [x, y, w, h]</th>
              <th
                onClick={() => handleSort('confidence')}
                className="p-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Conf</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('weightGrams')}
                className="p-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  <span>Weight</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">Action Required</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80">
            {sortedItems.map((item, idx) => {
              const meta = CATEGORY_META[item.category];
              const bin = BIN_MAPPING[item.category];
              const CategoryIcon = meta.icon;
              const isActive = activeItemId === item.id;
              const isSelected = selectedIds.has(item.id);
              const isBelowThreshold = item.confidence * 100 < confidenceThreshold;

              const zebraBg = idx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-950';

              return (
                <tr
                  key={item.id}
                  id={`row-${item.id}`}
                  onMouseEnter={() => onHover(item.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(item.id)}
                  style={{
                    backgroundColor: isActive ? meta.bgTint : undefined,
                  }}
                  className={`transition-colors cursor-pointer ${zebraBg} ${
                    item.isHazardous ? 'border-l-2 border-l-red-500' : ''
                  } ${isActive ? 'ring-1 ring-emerald-500/40' : 'hover:bg-slate-800/40'}`}
                >
                  <td
                    className={`p-3 sticky left-0 z-10 border-r border-slate-800/80 shadow-[2px_0_4px_rgba(0,0,0,0.3)] ${
                      isActive ? 'bg-slate-900' : zebraBg
                    }`}
                    onClick={(e) => toggleSelectOne(item.id, e)}
                  >
                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="font-mono font-bold text-slate-300 tabular-nums">
                        {String(item.itemNumber).padStart(2, '0')}
                      </span>
                    </div>
                  </td>
                  <td
                    className={`p-3 font-medium text-white whitespace-nowrap sticky left-14 z-10 border-r border-slate-800/80 min-w-[130px] shadow-[2px_0_4px_rgba(0,0,0,0.3)] ${
                      isActive ? 'bg-slate-900' : zebraBg
                    }`}
                  >
                    {item.label}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${meta.badgeClass}`}
                    >
                      <CategoryIcon className="w-3 h-3" />
                      <span>{meta.label}</span>
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div
                        style={{ backgroundColor: bin.colorHex }}
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                      />
                      <span className="text-slate-300 text-[11px]">{item.targetBin}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap tabular-nums">
                    {item.bbox.x.toFixed(2)}, {item.bbox.y.toFixed(2)}, {item.bbox.width.toFixed(2)}, {item.bbox.height.toFixed(2)}
                  </td>
                  <td className="p-3 font-mono text-xs tabular-nums whitespace-nowrap">
                    <span
                      className={
                        isBelowThreshold ? 'text-amber-400 font-bold' : 'text-slate-300'
                      }
                    >
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap">
                    {item.weightGrams} g
                  </td>
                  <td className="p-3 text-slate-300 text-xs min-w-[180px]">
                    {item.actionRequired}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemTable;
