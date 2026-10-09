import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  Package,
  Scale,
  IndianRupee,
  TriangleAlert,
  Sliders,
  ChevronDown,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useScanContext } from '../context/ScanContext';
import { HONESTY_STRINGS, APP_INFO, CATEGORY_COLORS } from '../lib/constants';
import { Category } from '../types';
import CompositionRing from '../components/CompositionRing';
import PickList from '../components/PickList';
import HazardPanel from '../components/HazardPanel';
import { useCountUp } from '../hooks/useCountUp';
import { downloadCsv } from '../lib/csvExport';
import EmptyScanState from '../components/EmptyScanState';

export const AuditPage: React.FC = () => {
  const { scanData, items, setSelectedItemId, backendStatus } = useScanContext();
  const sourceLabel = backendStatus === 'connected' ? HONESTY_STRINGS.liveTag : HONESTY_STRINGS.demoTag;
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);

  // IntersectionObserver to trigger animation 2 ("Audit reveal")
  const [revealed, setRevealed] = useState(false);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (revealed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );

    if (pageContainerRef.current) {
      observer.observe(pageContainerRef.current);
    }

    return () => observer.disconnect();
  }, [revealed]);

  // Compute all metrics dynamically from items array
  const totalCount = items.length;
  const totalWeightGrams = items.reduce((acc, i) => acc + i.weightGrams, 0);

  const recyclableItems = items.filter((i) => i.category === 'recyclable');
  const hazardousItems = items.filter((i) => i.isHazardous || i.category === 'hazardous');
  const organicItems = items.filter((i) => i.category === 'organic');
  const nonRecyclableItems = items.filter((i) => i.category === 'nonrecyclable');

  const recyclableWeight = recyclableItems.reduce((acc, i) => acc + i.weightGrams, 0);
  const organicWeight = organicItems.reduce((acc, i) => acc + i.weightGrams, 0);
  const nonRecyclableWeight = nonRecyclableItems.reduce((acc, i) => acc + i.weightGrams, 0);
  const hazardousWeight = hazardousItems.reduce((acc, i) => acc + i.weightGrams, 0);

  // Recoverable share by weight
  const recoverableWeightShare =
    totalWeightGrams > 0 ? (recyclableWeight / totalWeightGrams) * 100 : 0;

  // Recoverable scrap value range (summed from recyclable items)
  let minValueInr = 0;
  let maxValueInr = 0;
  items.forEach((item) => {
    if (item.estimatedValueInr) {
      minValueInr += item.estimatedValueInr.min;
      maxValueInr += item.estimatedValueInr.max;
    }
  });

  const hasValueEstimate = items.some(item => item.estimatedValueInr !== null);

  // Dynamic count-up values (tabular figures, no jitter)
  const countItems = useCountUp(totalCount, 1200, 0, revealed);
  const countShare = useCountUp(recoverableWeightShare, 1200, 1, revealed);
  const countValMin = useCountUp(minValueInr, 1200, 1, revealed);
  const countValMax = useCountUp(maxValueInr, 1200, 1, revealed);
  const countHaz = useCountUp(hazardousItems.length, 1200, 0, revealed);

  // Contamination ratio
  const contaminationMass = organicWeight + nonRecyclableWeight;
  const contaminationRatio = totalWeightGrams > 0 ? contaminationMass / totalWeightGrams : 0;
  let contaminationRisk: 'Low' | 'Medium' | 'High' = 'Low';
  let contaminationColor = 'text-accent';
  let contaminationBg = 'bg-emerald-500/10 border-emerald-500/20';

  if (contaminationRatio > 0.3) {
    contaminationRisk = 'High';
    contaminationColor = 'text-red-400';
    contaminationBg = 'bg-red-500/10 border-red-500/30';
  } else if (contaminationRatio > 0.15) {
    contaminationRisk = 'Medium';
    contaminationColor = 'text-amber-400';
    contaminationBg = 'bg-amber-500/10 border-amber-500/30';
  }

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
      percent: totalWeightGrams > 0 ? (data.weight / totalWeightGrams) * 100 : 0,
      color: CATEGORY_COLORS[data.category],
    }))
    .sort((a, b) => b.weight - a.weight);

  // Findings list based on actual items
  const findings: string[] = [];
  if (items.some((i) => i.material === 'Food waste') && items.some((i) => i.material === 'Cardboard' || i.material === 'Paper')) {
    findings.push('Moist organic food waste in contact with paper/cardboard risks reducing recoverable fiber yield.');
  }
  if (items.some((i) => i.material === 'Multilayer plastic')) {
    findings.push('Multilayer foil-laminated packets detected in dry-waste stream; flag for optical reject line.');
  }
  if (items.some((i) => i.material === 'Expanded polystyrene')) {
    findings.push('Fragile polystyrene foam tray present; risks pulverizing into non-recoverable micro-debris under load.');
  }
  if (hazardousItems.length > 0) {
    findings.push(`${hazardousItems.length} potentially hazardous items present (${hazardousWeight} g est.); review local hazardous-waste handling guidance before sorting.`);
  }

  // Export PDF
  const handleExportPdf = () => {
    window.print();
  };

  // Export CSV
  const handleExportCsv = () => {
    downloadCsv([
      ['EcoScan AI — Audit Summary Report'],
      ['Data source', sourceLabel],
      ['Limitations', HONESTY_STRINGS.surfaceNotice],
      ['Disclaimer', HONESTY_STRINGS.auditDisclaimer],
      ['Site', scanData?.siteName || APP_INFO.defaultSiteName],
      ['Scan ID', scanData?.scanId || APP_INFO.defaultScanId],
      ['Timestamp', scanData?.timestamp],
      ['Total Items', totalCount],
      ['Estimated Total Mass (g)', totalWeightGrams],
      ['Estimated Recoverable Share By Mass (%)', recoverableWeightShare.toFixed(1)],
      ['Estimated Recoverable Value Min (INR)', minValueInr.toFixed(2)],
      ['Estimated Recoverable Value Max (INR)', maxValueInr.toFixed(2)],
      ['Hazardous Items Count', hazardousItems.length],
      ['Indicative Contamination Risk', contaminationRisk],
      [],
      ['Number', 'Label', 'Category', 'Material', 'Estimated Weight (g)', 'Target Bin', 'Estimated Value Min (INR)', 'Estimated Value Max (INR)', 'Hazardous', 'Action', 'Model Confidence', 'User Confirmed'],
      ...items.map(item => [item.itemNumber, item.label, item.category, item.material, item.weightGrams, item.targetBin, item.estimatedValueInr?.min, item.estimatedValueInr?.max, item.isHazardous, item.actionRequired, item.confidence, !!item.userConfirmed]),
    ], `ecoscan-audit-${scanData?.scanId || 'report'}.csv`);
  };

  // Copy Executive Summary
  const handleCopySummary = async () => {
    const summaryText = `EcoScan AI — Contractor Audit Summary
Data source: ${sourceLabel}
Site: ${scanData?.siteName || APP_INFO.defaultSiteName} | Scan ID: ${scanData?.scanId || APP_INFO.defaultScanId}
Timestamp: ${scanData?.timestamp || '2026-10-09 05:28:14 UTC'}
--------------------------------------------------
Total Items Detected: ${totalCount}
Total Estimated Mass: ${totalWeightGrams} g
Estimated Recoverable Share: ${recoverableWeightShare.toFixed(1)}% by estimated weight (${recyclableWeight} g est.)
Estimated Value: ${hasValueEstimate ? `₹${minValueInr.toFixed(1)} - ₹${maxValueInr.toFixed(1)} INR` : 'Not estimated; no market price data'}
Hazardous Units: ${hazardousItems.length} flagged (immediate isolation required)
Contamination Risk: ${contaminationRisk} | Non-recoverable share (organic + reject): ${(contaminationRatio * 100).toFixed(1)}%
--------------------------------------------------
* ${HONESTY_STRINGS.auditDisclaimer}
* ${HONESTY_STRINGS.surfaceNotice}`;

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyError('');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError('Clipboard is unavailable. Export CSV instead.');
    }
  };

  if (!scanData) return <EmptyScanState title="No audit yet" description="Capture a camera frame or upload a photo first. Audit totals and exports will use the actual detections, not sample data." />;

  return (
    <div
      ref={pageContainerRef}
      className="flex-1 w-full max-w-[1280px] mx-auto p-3 sm:p-5 flex flex-col gap-3.5 print:p-0 print:max-w-none"
    >
      {/* 1. Slim Top Header Bar */}
      <section
        aria-label="Audit summary header"
        className="w-full bg-surface border border-border rounded-panel px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm select-none"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-sm-14 font-semibold text-text">
            {scanData?.siteName || APP_INFO.defaultSiteName}
          </h1>
          <span className="font-mono text-[10px] text-muted px-2 py-0.5 rounded-full bg-surface-2 border border-border">
            ID: {scanData?.scanId || APP_INFO.defaultScanId}
          </span>
          <span className="text-muted text-xs-12">•</span>
          <span className="font-mono text-xs-12 text-muted">
            {scanData?.timestamp || '2026-10-09 05:28:14 UTC'}
          </span>
        </div>

        {/* Action Buttons: Export PDF, Export CSV, Copy Summary */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-2.5 py-1.5 rounded-card bg-surface-2 hover:bg-white/5 border border-border text-xs-12 font-medium text-text flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-muted" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-2.5 py-1.5 rounded-card bg-surface-2 hover:bg-white/5 border border-border text-xs-12 font-medium text-text flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-card bg-accent hover:bg-emerald-400 text-slate-950 text-xs-12 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-slate-950" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-950" />
                <span>Copy summary</span>
              </>
            )}
          </button>
        </div>
      </section>

      <p className="text-xs text-muted">{sourceLabel} · {HONESTY_STRINGS.confidenceNotice}</p>
      {copyError && <p role="alert" className="text-xs text-amber-300">{copyError}</p>}
      {hazardousItems.length > 0 && <HazardPanel hazardousItems={hazardousItems} />}

      {/* 2. Row 1: Four Calmer KPI Tiles */}
      <section
        aria-label="Audit summary metrics"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 select-none"
      >
        {/* KPI 1: Items Detected */}
        <div className="bg-surface border border-border rounded-card p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs-12 font-medium text-muted">
            <span>Items detected</span>
            <Package className="w-4 h-4 text-muted" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-mono font-bold text-text tabular-nums">
              {Math.round(countItems)}
            </span>
            <span className="text-xs-12 text-muted font-mono">pieces</span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted font-mono">
            {totalWeightGrams} g est. total mass
          </div>
        </div>

        {/* KPI 2: Recoverable Share */}
        <div className="bg-surface border border-border rounded-card p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs-12 font-medium text-accent">
            <span>Est. recoverable share</span>
            <Scale className="w-4 h-4 text-accent" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-mono font-bold text-accent tabular-nums">
              {countShare.toFixed(1)}%
            </span>
            <span className="text-xs-12 text-muted font-mono">by weight</span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted font-mono">
            {recyclableWeight} g / {totalWeightGrams} g (est.)
          </div>
        </div>

        {/* KPI 3: Recoverable Scrap Value */}
        <div className="bg-surface border border-border rounded-card p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs-12 font-medium text-muted">
            <span>Est. recoverable value</span>
            <IndianRupee className="w-4 h-4 text-accent" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-mono font-bold text-accent tabular-nums">
                  {hasValueEstimate ? `₹${countValMin.toFixed(1)} - ₹${countValMax.toFixed(1)}` : 'Not estimated'}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted font-mono">
            Secondary scrap yield
          </div>
        </div>

        {/* KPI 4: Hazardous Items */}
        <div
          className={`rounded-card p-3 sm:p-3.5 flex flex-col justify-between border ${
            hazardousItems.length > 0
              ? 'bg-red-950/20 border-red-500/40'
              : 'bg-surface border-border'
          }`}
        >
          <div className="flex items-center justify-between text-xs-12 font-medium text-red-400">
            <span>Hazardous items</span>
            <TriangleAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-mono font-bold text-red-400 tabular-nums">
              {Math.round(countHaz)}
            </span>
            <span className="text-xs-12 text-red-400 font-mono">units flagged</span>
          </div>
          <div className="mt-0.5 text-[11px] text-red-300/80 font-mono">
            {hazardousWeight} g est. · Review handling guidance
          </div>
        </div>
      </section>

      {/* 3. Row 2: Two Columns (Left Composition Ring, Right Recover First Queue) */}
      <section
        aria-label="Composition and priority recovery"
        className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch"
      >
        {/* Left Column: Composition Ring (5 cols on lg ~42%) */}
        <div className="lg:col-span-5 h-[410px]">
          <CompositionRing items={items} revealed={revealed} />
        </div>

        {/* Right Column: Recover First Pick List (7 cols on lg ~58%) */}
        <div className="lg:col-span-7 h-[410px]">
          <PickList
            items={items}
            revealed={revealed}
            onSelectWhere={setSelectedItemId}
          />
        </div>
      </section>

      {/* 4. Below the fold: ONE Collapsible Details Section (Collapsed by default, expanded in print) */}
      <section aria-label="Detailed technical breakdown" className="mt-1">
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setDetailsOpen((prev) => !prev)}
          className="w-full p-3 rounded-panel bg-surface border border-border hover:border-white/15 flex items-center justify-between text-xs-12 font-medium text-text transition-colors cursor-pointer print:hidden"
          aria-expanded={detailsOpen}
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-accent" />
            <span className="font-semibold text-text">Details & Additional Quality Notes</span>
            <span className="text-muted text-[11px] hidden sm:inline">
              (Material fraction bars, safety directive, contamination audit)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted">
            <span>{detailsOpen ? 'Hide' : 'Show details'}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                detailsOpen ? 'rotate-180 text-text' : ''
              }`}
            />
          </div>
        </button>

        {/* Collapsible Content */}
        <div className={`space-y-3.5 mt-3 ${detailsOpen ? 'block' : 'hidden'} print-expanded`}>
          {/* A. Material Fraction Breakdown Bars */}
          <div className="p-4 rounded-panel bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between text-xs-12 font-mono text-muted uppercase tracking-wider border-b border-border pb-2">
              <span>Material Fraction Breakdown</span>
              <span>Mass & Stream Share</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {materials.map((mat) => (
                <div
                  key={mat.name}
                  className="p-2.5 rounded-card bg-surface-2 border border-border flex flex-col gap-1.5 text-xs-12"
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-text font-semibold">{mat.name}</span>
                    <span className="text-muted tabular-nums">
                      {mat.weight} g est. ({mat.percent.toFixed(1)}% est.)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${mat.percent}%`,
                        backgroundColor: mat.color,
                      }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* C. Contamination Risk & Quality Flags */}
          <div className="p-4 rounded-panel bg-surface border border-border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <h3 className="text-sm-14 font-semibold text-text">
                  Stream Contamination Risk & Quality Assessment
                </h3>
              </div>
              <div className={`px-2.5 py-0.5 rounded-full border text-xs-12 font-mono font-bold ${contaminationBg} ${contaminationColor}`}>
                Risk: {contaminationRisk} | Non-recoverable share (organic + reject): {(contaminationRatio * 100).toFixed(1)}%
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {findings.map((finding, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-card bg-surface-2 border border-border flex items-start gap-2 text-xs-12 text-muted leading-relaxed"
                >
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Disclaimer Line and Honesty Banner */}
      <footer aria-label="Audit limitations" className="p-3 rounded-card bg-surface border border-border text-center text-xs-12 text-muted space-y-0.5 mt-auto">
        <p className="font-medium text-text">
          {HONESTY_STRINGS.auditDisclaimer}
        </p>
        <p className="text-[11px] text-muted">
          {HONESTY_STRINGS.surfaceNotice}
        </p>
      </footer>
    </div>
  );
};

export default AuditPage;
