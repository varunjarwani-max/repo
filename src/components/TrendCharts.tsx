import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { SiteTrendPoint } from '../types';
import { CATEGORY_COLORS } from '../lib/constants';

interface TrendChartsProps {
  trendData: SiteTrendPoint[];
  siteName: string;
}

export const TrendCharts: React.FC<TrendChartsProps> = ({ trendData, siteName }) => {
  const [dateRange, setDateRange] = useState<'7D' | '30D' | '90D' | 'All'>('7D');

  return (
    <div className="space-y-6">
      {/* Date Range Selector Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-white">Longitudinal Analytics: {siteName}</h2>
          <p className="text-xs text-slate-400">Historical performance trends and stream composition evolution.</p>
        </div>

        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['7D', '30D', '90D', 'All'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDateRange(range)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                dateRange === range
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Recoverable Share Over Time */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-panel-highlight flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Recoverable Share Over Time</h3>
              <p className="text-[11px] text-slate-400">Percentage of recyclable dry mass in scanned piles.</p>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Target: 70%+
            </span>
          </div>

          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} tickLine={false} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as SiteTrendPoint;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono">
                          <div className="text-slate-400">{data.date}</div>
                          <div className="text-emerald-400 font-bold mt-1">
                            Recoverable: {data.recoverableShare}%
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="recoverableShare"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10B981', r: 3.5 }}
                  activeDot={{ r: 6, fill: '#34D399', stroke: '#020617', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Contamination Risk Over Time */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-panel-highlight flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Contamination Rate Over Time</h3>
              <p className="text-[11px] text-slate-400">Non-recoverable reject and organic moisture mass share.</p>
            </div>
            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              Ceiling: &lt;25%
            </span>
          </div>

          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} domain={[0, 50]} tickLine={false} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as SiteTrendPoint;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono">
                          <div className="text-slate-400">{data.date}</div>
                          <div className="text-amber-400 font-bold mt-1">
                            Contamination: {data.contaminationPct}%
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="contaminationPct"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHART 3: Stacked Area Composition by Category */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-panel-highlight space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Stacked Material Category Composition</h3>
            <p className="text-[11px] text-slate-400">Proportional shift across all 4 sorting categories.</p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>Recyclable</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span>Organic</span>
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              <span>Hazardous</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-500" />
              <span>Reject</span>
            </span>
          </div>
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} tickLine={false} unit="%" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as SiteTrendPoint;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono space-y-1">
                        <div className="text-slate-400 border-b border-slate-800 pb-1">{data.date}</div>
                        <div className="text-emerald-400">Recyclable: {data.recyclablePct}%</div>
                        <div className="text-amber-400">Organic: {data.organicPct}%</div>
                        <div className="text-red-400">Hazardous: {data.hazardousPct}%</div>
                        <div className="text-slate-400">Reject: {data.nonrecyclablePct}%</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="recyclablePct"
                stackId="1"
                stroke={CATEGORY_COLORS.recyclable}
                fill={CATEGORY_COLORS.recyclable}
                fillOpacity={0.65}
              />
              <Area
                type="monotone"
                dataKey="organicPct"
                stackId="1"
                stroke={CATEGORY_COLORS.organic}
                fill={CATEGORY_COLORS.organic}
                fillOpacity={0.65}
              />
              <Area
                type="monotone"
                dataKey="hazardousPct"
                stackId="1"
                stroke={CATEGORY_COLORS.hazardous}
                fill={CATEGORY_COLORS.hazardous}
                fillOpacity={0.7}
              />
              <Area
                type="monotone"
                dataKey="nonrecyclablePct"
                stackId="1"
                stroke={CATEGORY_COLORS.nonrecyclable}
                fill={CATEGORY_COLORS.nonrecyclable}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TrendCharts;
