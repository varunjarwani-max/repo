import React, { useState, useMemo } from 'react';
import { Cpu, FileCode2, TableProperties, Crosshair, AlertCircle, Sparkles } from 'lucide-react';
import { useScanContext } from '../context/ScanContext';
import { HONESTY_STRINGS } from '../lib/constants';
import { toRobotJson, ROBOT_SCHEMA_DEFINITIONS } from '../lib/robotFormat';
import JsonViewer from '../components/JsonViewer';
import PileSceneSvg from '../components/PileSceneSvg';

export const RobotApiPage: React.FC = () => {
  const { items, scanData } = useScanContext();

  const [activeTab, setActiveTab] = useState<'json' | 'schema'>('json');
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || 'REC-0001');

  // Dynamically generate robot JSON payload using toRobotJson from active ScanContext items
  const robotEnvelope = useMemo(() => {
    return toRobotJson(items, {
      scanId: scanData?.scanId,
      siteId: scanData?.siteId,
      timestamp: scanData?.timestamp,
      imageWidth: scanData?.imageWidth,
      imageHeight: scanData?.imageHeight,
      modelVersion: scanData?.modelVersion,
    });
  }, [items, scanData]);

  // Find currently selected item payload
  const activeItem = items.find((i) => i.id === selectedItemId) || items[0];

  // SVG Scaled coordinates (1000x625 space)
  const svgX = activeItem ? activeItem.bbox.x * 1000 : 0;
  const svgY = activeItem ? activeItem.bbox.y * 1000 : 0;
  const svgW = activeItem ? activeItem.bbox.width * 1000 : 0;
  const svgH = activeItem ? activeItem.bbox.height * 1000 : 0;

  const graspX = activeItem ? activeItem.graspPoint.x * 1000 : 0;
  const graspY = activeItem ? activeItem.graspPoint.y * 1000 : 0;

  const polygonPointsStr = activeItem
    ? activeItem.polygon.map(([px, py]) => `${px * 1000},${py * 625}`).join(' ')
    : '';

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <span>Robot API & Actuation Telemetry</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Machine-readable JSON schema, boundary polygons, and grasp centroid vectors for robotic pick-and-place end effectors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Format: IEEE Robot JSON v1</span>
          </span>
          <span className="font-mono text-xs text-slate-400 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
            {HONESTY_STRINGS.demoTag}
          </span>
        </div>
      </div>

      {/* Mandatory Robot Hardware Disclaimer Notice */}
      <div className="bg-amber-950/25 border border-amber-500/40 rounded-xl p-3.5 px-4 flex items-center gap-3 text-xs text-amber-200/90 shadow-sm">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Notice: </strong>
          {HONESTY_STRINGS.robotNotice}
        </span>
      </div>

      {/* Two-Pane Workspace Layout: Left JSON/Schema (7 cols), Right Actuation Overlay (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Tabs Switcher (JSON Telemetry | Schema Definition) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-panel-highlight space-y-4">
          {/* Tabs Switcher */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('json')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'json'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>JSON Telemetry</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schema')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'schema'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TableProperties className="w-3.5 h-3.5 text-emerald-400" />
                <span>API Schema</span>
              </button>
            </div>

            <span className="font-mono text-xs text-slate-400 hidden sm:inline">
              Payload: {robotEnvelope.totalDetectedItems} segmented items
            </span>
          </div>

          {/* TAB 1: JSON VIEWER */}
          {activeTab === 'json' ? (
            <JsonViewer
              envelope={robotEnvelope}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
            />
          ) : (
            /* TAB 2: SCHEMA TABLE */
            <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 max-h-[580px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 border-b border-slate-800 font-mono text-[11px] text-slate-400 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="p-3">Field</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {ROBOT_SCHEMA_DEFINITIONS.map((def) => (
                    <tr key={def.field} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {def.field}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-amber-300 whitespace-nowrap">
                        {def.type}
                      </td>
                      <td className="p-3 text-slate-300 leading-relaxed">
                        {def.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Pane: Visual Actuation Overlay with Linked BBox, Mask & Grasp Crosshair */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-panel-highlight space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-emerald-400" />
                <span>End-Effector Target Overlay</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Visualizing selected JSON entity grasp vector and mask polygon.
              </p>
            </div>

            {activeItem && (
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-200">
                #{activeItem.itemNumber} {activeItem.label}
              </span>
            )}
          </div>

          {/* 16:10 Canvas with Synthetic Pile Scene and Robot Overlay */}
          <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl border border-slate-700/80 overflow-hidden shadow-2xl">
            {/* Background Synthetic Pile */}
            <PileSceneSvg className="opacity-60" />

            {/* SVG Actuation Overlay */}
            {activeItem && (
              <svg
                viewBox="0 0 1000 625"
                preserveAspectRatio="xMidYMid slice"
                className="absolute inset-0 w-full h-full overflow-visible"
              >
                {/* 1. Mask Polygon */}
                <polygon
                  points={polygonPointsStr}
                  fill="rgba(16, 185, 129, 0.22)"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  className="filter drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                />

                {/* 2. Normalised Bounding Box */}
                <rect
                  x={svgX}
                  y={svgY}
                  width={svgW}
                  height={svgH}
                  rx={8}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />

                {/* Number tag */}
                <rect
                  x={svgX}
                  y={svgY}
                  width="26"
                  height="18"
                  rx="3"
                  fill="#0284C7"
                />
                <text
                  x={svgX + 13}
                  y={svgY + 13}
                  textAnchor="middle"
                  fill="#FFF"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="11"
                  fontWeight="bold"
                >
                  {String(activeItem.itemNumber).padStart(2, '0')}
                </text>

                {/* 3. Grasp Point Crosshair */}
                <g transform={`translate(${graspX}, ${graspY})`}>
                  <circle r="12" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 3" className="animate-spin" />
                  <circle r="4" fill="#F59E0B" />
                  <line x1="-18" y1="0" x2="18" y2="0" stroke="#F59E0B" strokeWidth="2" />
                  <line x1="0" y1="-18" x2="0" y2="18" stroke="#F59E0B" strokeWidth="2" />
                </g>
              </svg>
            )}
          </div>

          {/* Telemetry Breakdown for Selected Actuation Entity */}
          {activeItem && (
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">GRASP VECTOR:</span>
                <span className="text-amber-400 font-bold tabular-nums">
                  x: {activeItem.graspPoint.x.toFixed(3)}, y: {activeItem.graspPoint.y.toFixed(3)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">BOUNDING BOX:</span>
                <span className="text-sky-300 tabular-nums">
                  [{activeItem.bbox.x.toFixed(2)}, {activeItem.bbox.y.toFixed(2)}, {activeItem.bbox.width.toFixed(2)}, {activeItem.bbox.height.toFixed(2)}]
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">MASS / VACUUM:</span>
                <span className="text-emerald-400 tabular-nums">
                  {activeItem.weightGrams} g (Pressure: ~{(activeItem.weightGrams * 0.08 + 1.2).toFixed(1)} bar)
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">CONTAINER ROUTE:</span>
                <span className="text-white font-sans">{activeItem.targetBin}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RobotApiPage;
