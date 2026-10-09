import React, { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, TriangleAlert, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category } from '../types';
import { useScanContext } from '../context/ScanContext';
import { HONESTY_STRINGS } from '../lib/constants';
import Viewfinder, { ScanState } from '../components/MaterialViewfinder';
import ControlBar from '../components/ControlBar';
import ScanResultsList from '../components/ScanResultsList';
import ScanHero from '../components/ScanHero';
import ScanOverview from '../components/ScanOverview';

export const ScanPage: React.FC = () => {
  const {
    scanData,
    items,
    liveLatencyMs,
    activeItemId,
    selectedItemId,
    setHoveredItemId,
    setSelectedItemId,
    updateItemCategory,
    runAnalysis,
    isAnalysing,
    analysisProgressStage,
    scanState,
    backendStatus,
    imagePreview,
    uploadFallback,
  } = useScanContext();

  // Interactive Viewfinder Overlays & Toggles
  const [showMasks, setShowMasks] = useState(false);
  const [showGraspPoints, setShowGraspPoints] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(60);

  // Category Filter State (shared between Viewfinder legend & ResultsPanel chips)
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');

  const currentEffectiveScanState: ScanState = isAnalysing ? 'analysing' : scanState;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState('');
  const handleLoadDemoPile = () => {
    setUploadError('');
    void runAnalysis('full');
  };
  const handleUploadPhoto = () => fileInputRef.current?.click();
  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setUploadError('Choose a JPG, PNG, or WebP image smaller than 10 MB.');
      return;
    }
    setUploadError('');
    void runAnalysis('full', file);
  };

  // Selection toggle (pins item)
  const handleItemSelect = (id: string) => {
    setSelectedItemId(selectedItemId === id ? null : id);
  };

  // Animation 3: Hazard Radar toast & vignette trigger
  const [showHazardToast, setShowHazardToast] = useState(false);
  const [showHazardVignette, setShowHazardVignette] = useState(false);
  const hazCount = items.filter((i) => i.isHazardous || i.category === 'hazardous').length;

  const hasRunScan = useRef(false);
  useEffect(() => {
    if (isAnalysing) {
      hasRunScan.current = true;
      return;
    }
    if (!hasRunScan.current) return;
    if (hazCount > 0 && currentEffectiveScanState === 'results') {
      setShowHazardVignette(true);
      setShowHazardToast(true);

      const vignetteTimer = setTimeout(() => {
        setShowHazardVignette(false);
      }, 400);

      const toastTimer = setTimeout(() => {
        setShowHazardToast(false);
      }, 4000);

      return () => {
        clearTimeout(vignetteTimer);
        clearTimeout(toastTimer);
      };
    } else {
      setShowHazardToast(false);
      setShowHazardVignette(false);
    }
  }, [hazCount, currentEffectiveScanState, isAnalysing]);

  return (
    <div className="scan-workspace flex-1 w-full mx-auto flex flex-col relative">
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelected} aria-label="Upload waste photo" className="sr-only" disabled={isAnalysing} />
      <ScanHero onScan={handleLoadDemoPile} onUpload={handleUploadPhoto} isAnalysing={isAnalysing} />
      <ScanOverview items={items} />
      {uploadError && <p role="alert" className="text-sm text-red-400">{uploadError}</p>}
      {uploadFallback && <p role="status" className="upload-notice">{HONESTY_STRINGS.uploadFallback}</p>}
      {hazCount > 0 && !isAnalysing && <aside role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/50 bg-red-950/30 p-3 text-sm text-red-200"><TriangleAlert className="shrink-0 text-red-400" size={20} /><div><strong>{hazCount} hazardous items flagged</strong><p>Do not place these in normal bins. Review the flagged items and follow local hazardous-waste guidance.</p></div></aside>}
      {/* Hazard Radar Flash Vignette (400ms single flash) */}
      {showHazardVignette && (
        <div
          className="fixed inset-0 pointer-events-none z-50 hazard-vignette"
          aria-hidden="true"
        />
      )}

      {/* Hazard Radar Spring Toast (4s auto-dismiss) */}
      <AnimatePresence>
        {showHazardToast && (
          <motion.aside
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-surface border border-red-500/50 shadow-2xl text-xs-12 font-medium text-text select-none"
            role="alert"
          >
            <TriangleAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-semibold text-white">
              {hazCount} hazardous items — isolate before sorting
            </span>
            <button
              type="button"
              onClick={() => setShowHazardToast(false)}
              className="ml-2 text-muted hover:text-white p-0.5 rounded cursor-pointer"
              aria-label="Dismiss hazardous warning"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Page Header Bar */}
      <div className="workspace-heading flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span>Your scan workspace</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            One pile. Every material. A clear next step.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-300 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Model: {scanData?.modelVersion || HONESTY_STRINGS.modelVersion}</span>
          </span>
          {backendStatus === 'fallback' ? (
            <span className="font-mono text-xs text-amber-300 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Using demo data (backend unreachable)</span>
            </span>
          ) : backendStatus === 'connected' ? (
            <span className="font-mono text-xs text-emerald-300 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Live backend</span>
            </span>
          ) : (
            <span className="font-mono text-xs text-slate-400 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
              {HONESTY_STRINGS.demoTag}
            </span>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout: Left Viewfinder (60%), Right Results (40%). Stacks below 1024px */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Viewfinder Canvas & Control Bar (7 cols on lg / ~58%) */}
        <section
          aria-label="Computer vision viewfinder workspace"
          className="scanner-panel lg:col-span-7 flex flex-col gap-3.5"
        >
          <div className="panel-heading"><span><Camera size={15} /> Material viewfinder</span><span className="font-mono text-[10px] text-muted">{imagePreview ? 'UPLOADED PHOTO' : 'SAMPLE PILE / 01'}</span></div>
          <Viewfinder
            scanState={currentEffectiveScanState}
            imagePreview={imagePreview}
            imageAspectRatio={imagePreview && scanData ? scanData.imageWidth / scanData.imageHeight : undefined}
            liveMode={backendStatus === 'connected'}
            items={isAnalysing ? [] : items}
            activeItemId={activeItemId}
            selectedCategory={selectedCategory}
            confidenceThreshold={confidenceThreshold}
            showMasks={showMasks}
            showGraspPoints={showGraspPoints}
            analysisProgressStage={analysisProgressStage}
            liveLatencyMs={liveLatencyMs}
            onItemHover={setHoveredItemId}
            onItemSelect={handleItemSelect}
            onCategoryFilterChange={setSelectedCategory}
            onRetry={() => runAnalysis('full')}
            onUploadClick={handleUploadPhoto}
          />

          <ControlBar
            scanState={currentEffectiveScanState}
            showMasks={showMasks}
            showGraspPoints={showGraspPoints}
            confidenceThreshold={confidenceThreshold}
            onCaptureAndAnalyse={() => runAnalysis('full')}
            onUploadPhoto={handleUploadPhoto}
            onLoadDemoPile={handleLoadDemoPile}

            onToggleMasks={() => setShowMasks((prev) => !prev)}
            onToggleGraspPoints={() => setShowGraspPoints((prev) => !prev)}
            onConfidenceThresholdChange={setConfidenceThreshold}
          />
          <p className="text-xs text-muted">{HONESTY_STRINGS.confidenceNotice} {HONESTY_STRINGS.geometryNotice}</p>
        </section>

        {/* Right Column: Scan Results List (5 cols on lg / ~42%) */}
        <section aria-label="Segmentation results list" className="lg:col-span-5 flex flex-col h-full">
          <ScanResultsList
            isAnalysing={isAnalysing}
            sourceLabel={backendStatus === 'connected' ? HONESTY_STRINGS.liveTag : HONESTY_STRINGS.demoTag}
            items={items}
            activeItemId={activeItemId}
            selectedCategory={selectedCategory}
            confidenceThreshold={confidenceThreshold}
            onItemHover={setHoveredItemId}
            onItemSelect={handleItemSelect}
            onCategoryFilterChange={setSelectedCategory}
            onConfirmMaterial={updateItemCategory}
          />
        </section>
      </div>
    </div>
  );
};

export default ScanPage;
