import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  X,
  Info,
  TriangleAlert,
  ArrowRightLeft,
  Camera,
} from 'lucide-react';
import { MOCK_SITES } from '../data/mockData';
import { Site, SiteTrendPoint } from '../types';
import { useScanContext } from '../context/ScanContext';
import { HONESTY_STRINGS } from '../lib/constants';
import SiteSparkline from '../components/SiteSparkline';
import TrendCharts from '../components/TrendCharts';

export const SitesPage: React.FC = () => {
  const navigate = useNavigate();
  const { items } = useScanContext();

  const [sites] = useState<Site[]>(MOCK_SITES);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('SITE-YARD-A');
  const [compareMode, setCompareMode] = useState(false);
  const [compareSiteId, setCompareSiteId] = useState<string>('SITE-YARD-B');
  const [calloutDismissed, setCalloutDismissed] = useState(false);

  // Compute live values for Demo Yard A from ScanContext
  const currentScanStats = useMemo(() => {
    const totalMass = items.reduce((acc, i) => acc + i.weightGrams, 0);
    const recMass = items.filter((i) => i.category === 'recyclable').reduce((acc, i) => acc + i.weightGrams, 0);
    const orgMass = items.filter((i) => i.category === 'organic').reduce((acc, i) => acc + i.weightGrams, 0);
    const hazMass = items.filter((i) => i.isHazardous || i.category === 'hazardous').reduce((acc, i) => acc + i.weightGrams, 0);
    const nonRecMass = items.filter((i) => i.category === 'nonrecyclable').reduce((acc, i) => acc + i.weightGrams, 0);

    const recoverableShare = totalMass > 0 ? Number(((recMass / totalMass) * 100).toFixed(1)) : 0;
    const recyclablePct = recoverableShare;
    const organicPct = totalMass > 0 ? Number(((orgMass / totalMass) * 100).toFixed(1)) : 0;
    const hazardousPct = totalMass > 0 ? Number(((hazMass / totalMass) * 100).toFixed(1)) : 0;
    const nonrecyclablePct = totalMass > 0 ? Number(((nonRecMass / totalMass) * 100).toFixed(1)) : 0;
    const contaminationPct = totalMass > 0 ? Number((((orgMass + nonRecMass) / totalMass) * 100).toFixed(1)) : 0;

    return {
      recoverableShare,
      recyclablePct,
      organicPct,
      hazardousPct,
      nonrecyclablePct,
      contaminationPct,
      itemsCount: items.length,
      hazardousCount: items.filter((i) => i.isHazardous || i.category === 'hazardous').length,
    };
  }, [items]);

  // Dynamically update Demo Yard A trend data and sparkline with live scan data
  const dynamicSites = useMemo(() => {
    return sites.map((s) => {
      if (s.id === 'SITE-YARD-A' && s.trendHistory.length > 0) {
        const historyCopy = [...s.trendHistory];
        const lastIdx = historyCopy.length - 1;
        const updatedPoint: SiteTrendPoint = {
          ...historyCopy[lastIdx],
          date: 'Oct 09 (Live)',
          recoverableShare: currentScanStats.recoverableShare,
          recyclablePct: currentScanStats.recyclablePct,
          organicPct: currentScanStats.organicPct,
          hazardousPct: currentScanStats.hazardousPct,
          nonrecyclablePct: currentScanStats.nonrecyclablePct,
          contaminationPct: currentScanStats.contaminationPct,
        };
        historyCopy[lastIdx] = updatedPoint;

        const sparklineCopy = [...s.sparkline];
        if (sparklineCopy.length > 0) {
          sparklineCopy[sparklineCopy.length - 1] = currentScanStats.recoverableShare;
        }

        return {
          ...s,
          avgRecoverableShare: currentScanStats.recoverableShare,
          sparkline: sparklineCopy,
          trendHistory: historyCopy,
        };
      }
      return s;
    });
  }, [sites, currentScanStats]);

  const selectedSite = dynamicSites.find((s) => s.id === selectedSiteId) || dynamicSites[0];
  const compareSite = dynamicSites.find((s) => s.id === compareSiteId) || dynamicSites[1];

  const isEmptySite = selectedSite.scansCount === 0 || selectedSite.trendHistory.length === 0;

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <span>Facilities & Longitudinal Trends</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Cross-facility yield benchmarking, contamination rate histories, and comparative sorting telemetry.
          </p>
        </div>

        {/* Compare Sites Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCompareMode((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              compareMode
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-glow-recyclable'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Compare Sites Mode</span>
          </button>
          <span className="font-mono text-xs text-slate-400 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
            {HONESTY_STRINGS.demoTag}
          </span>
        </div>
      </div>

      {/* Dismissible Demo Data Callout */}
      {!calloutDismissed && (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 px-4 flex items-center justify-between gap-3 text-xs text-slate-300 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Trends use demo data: </strong>
              Historical data points illustrate temporal shifting across sorting operations. Yard A's latest point updates dynamically with your current scan session.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCalloutDismissed(true)}
            aria-label="Dismiss callout"
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Layout: Sidebar (4 cols) + Analytics Body (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Site List with Mini Sparklines */}
        <aside
          aria-label="Sites navigation sidebar"
          className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-panel-highlight space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 px-1">
            <span className="font-mono text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Monitored Facilities ({dynamicSites.length})
            </span>
            <span className="text-[11px] font-mono text-emerald-400">Live Telemetry</span>
          </div>

          <div className="space-y-2">
            {dynamicSites.map((site) => {
              const isSelected = selectedSiteId === site.id;
              const isComparing = compareMode && compareSiteId === site.id;

              const statusColor =
                site.status === 'online'
                  ? 'bg-emerald-400'
                  : site.status === 'idle'
                  ? 'bg-amber-400'
                  : 'bg-slate-500';

              return (
                <div
                  key={site.id}
                  onClick={() => {
                    if (compareMode && selectedSiteId !== site.id) {
                      setCompareSiteId(site.id);
                    } else {
                      setSelectedSiteId(site.id);
                    }
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/80 shadow-glow-recyclable'
                      : isComparing
                      ? 'bg-slate-800/50 border-amber-500/60'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor} ${site.status === 'online' ? 'animate-pulse' : ''}`} />
                      <span className="font-semibold text-white text-xs sm:text-sm truncate">
                        {site.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 mt-1">
                      <span>{site.scansCount} scans</span>
                      <span>•</span>
                      <span>{site.lastScanTime}</span>
                    </div>
                  </div>

                  {/* Sparkline & Current Yield */}
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <SiteSparkline
                      data={site.sparkline}
                      color={site.status === 'online' ? '#10B981' : '#64748B'}
                    />
                    <span className="font-mono text-xs font-bold text-slate-200 tabular-nums">
                      {site.scansCount > 0 ? `${site.avgRecoverableShare}% yield` : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Area: Analytics, Charts, Compare Mode or Empty State */}
        <section
          aria-label="Site trend analytics workspace"
          className="lg:col-span-8 flex flex-col gap-6"
        >
          {/* EMPTY STATE (when a new site with 0 scans is selected) */}
          {isEmptySite ? (
            <div className="w-full bg-slate-900/90 border-2 border-dashed border-slate-700/80 rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-panel-highlight min-h-[380px]">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4">
                <Camera className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">
                No scans yet — Run your first scan
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed">
                {selectedSite.name} has no optical segmentation batches recorded. Point your scanner at a waste pile to establish baseline purity telemetry.
              </p>
              <button
                type="button"
                onClick={() => navigate('/scan')}
                className="mt-5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-glow-recyclable transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Go to Scan Page</span>
              </button>
            </div>
          ) : compareMode ? (
            /* COMPARE SITES MODE: Side by Side Benchmarking */
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-panel-highlight space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                    <span>Cross-Facility Comparative Benchmark</span>
                  </h2>
                  <p className="text-xs text-slate-400">Direct head-to-head performance telemetry.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-emerald-400 font-bold">{selectedSite.name}</span>
                  <span className="text-slate-500">vs</span>
                  <span className="text-amber-400 font-bold">{compareSite.name}</span>
                </div>
              </div>

              {/* Side-by-Side Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Site A Card */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">{selectedSite.name}</h3>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      Primary
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900">
                      <span className="text-slate-400 text-[10px]">RECOVERABLE SHARE</span>
                      <div className="text-lg font-bold text-emerald-300">{selectedSite.avgRecoverableShare}%</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900">
                      <span className="text-slate-400 text-[10px]">TOTAL SCANS</span>
                      <div className="text-lg font-bold text-white">{selectedSite.scansCount}</div>
                    </div>
                  </div>
                </div>

                {/* Site B Card */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">{compareSite.name}</h3>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Comparison
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900">
                      <span className="text-slate-400 text-[10px]">RECOVERABLE SHARE</span>
                      <div className="text-lg font-bold text-amber-300">{compareSite.avgRecoverableShare}%</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900">
                      <span className="text-slate-400 text-[10px]">TOTAL SCANS</span>
                      <div className="text-lg font-bold text-white">{compareSite.scansCount}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparative Charts */}
              <TrendCharts trendData={selectedSite.trendHistory} siteName={`${selectedSite.name} (vs ${compareSite.name})`} />
            </div>
          ) : (
            /* STANDARD SINGLE SITE TREND VIEW */
            <>
              {/* 3 Recharts Visualizations */}
              <TrendCharts trendData={selectedSite.trendHistory} siteName={selectedSite.name} />

              {/* Past Scans Table */}
              <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-panel-highlight space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Recent Inspection Batches</h3>
                    <p className="text-[11px] text-slate-400">Historical vision segmentation runs for {selectedSite.name}.</p>
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    {selectedSite.pastScans.length} Batches
                  </span>
                </div>

                <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 border-b border-slate-800 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Batch ID & Date</th>
                        <th className="p-3">Detected Items</th>
                        <th className="p-3">Recoverable %</th>
                        <th className="p-3">Hazardous Units</th>
                        <th className="p-3">Contamination %</th>
                        <th className="p-3 text-right">Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono">
                      {selectedSite.pastScans.map((scan) => (
                        <tr key={scan.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3">
                            <div className="text-white font-semibold">{scan.id}</div>
                            <div className="text-[10px] text-slate-500 font-sans">{scan.date}</div>
                          </td>
                          <td className="p-3 tabular-nums text-slate-300">
                            {scan.itemsCount} pcs
                          </td>
                          <td className="p-3 tabular-nums font-bold text-emerald-400">
                            {scan.recoverableSharePct}%
                          </td>
                          <td className="p-3 tabular-nums">
                            {scan.hazardousCount > 0 ? (
                              <span className="text-red-400 font-bold flex items-center gap-1">
                                <TriangleAlert className="w-3 h-3" />
                                <span>{scan.hazardousCount}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                          <td className="p-3 tabular-nums text-amber-400">
                            {scan.contaminantMassPct}%
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => navigate('/audit')}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-sans transition-colors cursor-pointer"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default SitesPage;
