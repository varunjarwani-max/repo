import React, { useState } from 'react';
import { Copy, Check, Download, ChevronRight, ChevronDown, Minimize2, Maximize2 } from 'lucide-react';
import { RobotOutputEnvelope } from '../types';

interface JsonViewerProps {
  envelope: RobotOutputEnvelope;
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  envelope,
  selectedItemId,
  onSelectItem,
}) => {
  const [viewScope, setViewScope] = useState<'full' | 'single'>('full');
  const [copied, setCopied] = useState(false);
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});

  // Active single item (defaults to selected item or first item)
  const activeSingleItem =
    envelope.items.find((i) => i.id === selectedItemId) || envelope.items[0];

  const currentPayload = viewScope === 'full' ? envelope : activeSingleItem;
  const jsonString = JSON.stringify(currentPayload, null, 2);
  const jsonLines = jsonString.split('\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename =
      viewScope === 'full'
        ? `ecoscan-robot-${envelope.scanId}.json`
        : `ecoscan-robot-item-${activeSingleItem?.id || 'item'}.json`;

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleCollapse = (id: string) => {
    setCollapsedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    envelope.items.forEach((item) => {
      allCollapsed[item.id] = true;
    });
    setCollapsedItems(allCollapsed);
  };

  const handleExpandAll = () => {
    setCollapsedItems({});
  };

  // Pre-calculate line skip ranges for collapsed items in full view
  const lineSkipSet = new Set<number>();
  const itemCollapseHeaderLine = new Map<number, { id: string; label: string }>();

  if (viewScope === 'full') {
    let currentCollapsingId: string | null = null;

    for (let i = 0; i < jsonLines.length; i++) {
      const line = jsonLines[i];
      const idMatch = line.match(/"id":\s*"(REC-\d{4})"/);

      if (idMatch) {
        const id = idMatch[1];
        const matchingItem = envelope.items.find((it) => it.id === id);
        itemCollapseHeaderLine.set(i, {
          id,
          label: matchingItem ? `#${matchingItem.itemNumber} ${matchingItem.label}` : id,
        });

        if (collapsedItems[id]) {
          currentCollapsingId = id;
          continue;
        }
      }

      if (currentCollapsingId) {
        // Look for the end of the item object block at 4 spaces indentation: "    }" or "    },"
        if (line === '    }' || line === '    },') {
          currentCollapsingId = null;
        } else {
          lineSkipSet.add(i);
        }
      }
    }
  }

  return (
    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col font-mono text-xs shadow-inner">
      {/* Top Action Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Segmented Control: Full scan | Single item */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setViewScope('full')}
              className={`px-3 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                viewScope === 'full'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full scan
            </button>
            <button
              type="button"
              onClick={() => setViewScope('single')}
              className={`px-3 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                viewScope === 'single'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single item
            </button>
          </div>

          {/* Quick Collapse / Expand All in Full Mode */}
          {viewScope === 'full' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCollapseAll}
                title="Collapse all item blocks"
                className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExpandAll}
                title="Expand all item blocks"
                className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Item Selector dropdown when in single item mode */}
        {viewScope === 'single' && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-sans">Target:</span>
            <select
              value={activeSingleItem?.id}
              onChange={(e) => onSelectItem(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-emerald-400 rounded px-2 py-0.5 focus:outline-none"
            >
              {envelope.items.map((item) => (
                <option key={item.id} value={item.id} className="bg-slate-900 text-white">
                  #{item.itemNumber} {item.label} ({item.category})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Copy and Download Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download .json</span>
          </button>
        </div>
      </div>

      {/* Code Editor Body with Line Numbers, Syntax Highlighting & Folders */}
      <div className="p-4 overflow-x-auto max-h-[560px] leading-relaxed select-text">
        <table className="w-full text-left border-collapse">
          <tbody>
            {jsonLines.map((line, idx) => {
              if (lineSkipSet.has(idx)) {
                return null;
              }

              const lineNum = idx + 1;
              const headerMeta = itemCollapseHeaderLine.get(idx);
              const isCollapsed = headerMeta ? Boolean(collapsedItems[headerMeta.id]) : false;
              const isSelected = headerMeta ? selectedItemId === headerMeta.id : false;

              return (
                <tr
                  key={idx}
                  onClick={() => {
                    if (headerMeta) {
                      onSelectItem(headerMeta.id);
                    }
                  }}
                  className={`hover:bg-slate-900/60 transition-colors ${
                    headerMeta ? 'cursor-pointer' : ''
                  } ${isSelected ? 'bg-emerald-950/30' : ''}`}
                >
                  {/* Line Number & Collapse Toggle */}
                  <td className="w-12 text-right pr-3 text-slate-600 select-none text-[11px] tabular-nums whitespace-nowrap">
                    {headerMeta ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapse(headerMeta.id);
                        }}
                        className="mr-1 text-slate-400 hover:text-emerald-400 inline-flex items-center align-middle"
                        title={isCollapsed ? 'Expand node' : 'Collapse node'}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3 text-amber-400" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-emerald-400" />
                        )}
                      </button>
                    ) : null}
                    {lineNum}
                  </td>

                  {/* Code Line */}
                  <td className="text-slate-300 whitespace-pre">
                    {formatJsonLine(line)}
                    {isCollapsed && headerMeta && (
                      <span className="ml-2 text-xs text-amber-400/80 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                        {'/* ' + headerMeta.label + ' folded */'}
                      </span>
                    )}
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

// Syntax highlighter for JSON lines
function formatJsonLine(line: string) {
  if (line.includes(':')) {
    const parts = line.split(':');
    const keyPart = parts[0];
    const valuePart = parts.slice(1).join(':');

    return (
      <>
        <span className="text-emerald-400">{keyPart}:</span>
        <span className="text-amber-300">
          {valuePart.includes('"') ? (
            <span className="text-amber-300">{valuePart}</span>
          ) : valuePart.includes('true') || valuePart.includes('false') || valuePart.includes('null') ? (
            <span className="text-purple-400 font-bold">{valuePart}</span>
          ) : !isNaN(Number(valuePart.trim().replace(',', ''))) ? (
            <span className="text-sky-300 font-bold">{valuePart}</span>
          ) : (
            <span className="text-slate-300">{valuePart}</span>
          )}
        </span>
      </>
    );
  }

  // Braces / brackets / structure
  return <span className="text-slate-500">{line}</span>;
}

export default JsonViewer;
