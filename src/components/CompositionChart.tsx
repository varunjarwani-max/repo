import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Item, Category } from '../types';
import { CATEGORY_COLORS, CATEGORY_META } from '../lib/constants';

interface CompositionChartProps {
  items: Item[];
}

export const CompositionChart: React.FC<CompositionChartProps> = ({ items }) => {
  const [metricMode, setMetricMode] = useState<'count' | 'weight'>('count');

  const categories: Category[] = ['recyclable', 'organic', 'hazardous', 'nonrecyclable'];

  const totalCount = items.length;
  const totalWeight = items.reduce((acc, i) => acc + i.weightGrams, 0);

  // Dynamically compute category totals in code
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
    };
  });

  // Data formatted for Recharts Donut
  const chartData = categoryStats.map((stat) => ({
    name: stat.label,
    value: metricMode === 'count' ? stat.count : stat.weightGrams,
    percent: metricMode === 'count' ? stat.countPercent : stat.weightPercent,
    color: stat.color,
    unit: metricMode === 'count' ? 'items' : 'g',
  }));

  // Material breakdown computed dynamically from items
  const materialMap = new Map<string, { weight: number; category: Category }>();
  items.forEach((item) => {
    const existing = materialMap.get(item.material);
    if (existing) {
      existing.weight += item.weightGrams;
    } else {
      materialMap.set(item.material, { weight: item.weightGrams, category: item.category });
    }
  });

  const materials = Array.from(materialMap.entries())
    .map(([materialName, data]) => ({
      name: materialName,
      weight: data.weight,
      category: data.category,
      percent: totalWeight > 0 ? (data.weight / totalWeight) * 100 : 0,
      color: CATEGORY_COLORS[data.category],
    }))
    .sort((a, b) => b.weight - a.weight);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-panel-highlight space-y-6">
      {/* Top Header & Toggle: By Count | By Weight */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-white">Stream Composition Analysis</h2>
          <p className="text-xs text-slate-400">
            Categorical breakdown by piece count and estimated mass share.
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setMetricMode('count')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              metricMode === 'count'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            By count
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('weight')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              metricMode === 'weight'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            By weight
          </button>
        </div>
      </div>

      {/* Main Visuals: Donut Chart + Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Recharts Donut Chart (5 cols) */}
        <div className="md:col-span-5 h-[230px] relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                stroke="#0F172A"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg shadow-xl text-xs font-mono">
                        <div style={{ color: data.color }} className="font-bold">
                          {data.name}
                        </div>
                        <div className="text-white mt-0.5">
                          {data.value} {data.unit} ({data.percent.toFixed(1)}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Donut Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-xl font-bold text-white tabular-nums">
              {metricMode === 'count' ? totalCount : `${totalWeight} g`}
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              {metricMode === 'count' ? 'Total Items' : 'Total Weight'}
            </span>
          </div>
        </div>

        {/* Category Share List (7 cols) */}
        <div className="md:col-span-7 flex flex-col gap-2.5">
          {categoryStats.map((stat) => {
            const pct = metricMode === 'count' ? stat.countPercent : stat.weightPercent;
            const valueStr =
              metricMode === 'count'
                ? `${stat.count} items`
                : `${stat.weightGrams} g (est.)`;

            return (
              <div
                key={stat.key}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    style={{ backgroundColor: stat.color }}
                    className="w-3 h-3 rounded-full shrink-0"
                  />
                  <span className="font-semibold text-white">{stat.label}</span>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-400">{valueStr}</span>
                  <span
                    style={{ color: stat.color }}
                    className="font-bold w-14 text-right tabular-nums"
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stacked Horizontal Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>STREAM PROPORTION (100% SUMMED)</span>
          <span className="text-emerald-400">
            {metricMode === 'count' ? 'BY PIECE COUNT' : 'BY ESTIMATED WEIGHT'}
          </span>
        </div>
        <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-slate-950 border border-slate-800">
          {categoryStats.map((stat) => {
            const pct = metricMode === 'count' ? stat.countPercent : stat.weightPercent;
            if (pct <= 0) return null;

            return (
              <div
                key={stat.key}
                style={{
                  width: `${pct}%`,
                  backgroundColor: stat.color,
                }}
                className="h-full transition-all duration-300 relative group"
                title={`${stat.label}: ${pct.toFixed(1)}%`}
              />
            );
          })}
        </div>
      </div>

      {/* Underneath: Material Breakdown Bars */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
          <span>Material Fraction Breakdown</span>
          <span>Mass & Stream Share</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {materials.map((mat) => (
            <div
              key={mat.name}
              className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 flex flex-col gap-1 text-xs"
            >
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-200 font-semibold">{mat.name}</span>
                <span className="text-slate-400 tabular-nums">
                  {mat.weight} g ({mat.percent.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${mat.percent}%`,
                    backgroundColor: mat.color,
                  }}
                  className="h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompositionChart;
