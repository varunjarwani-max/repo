import React from 'react';
import { Camera, CameraOff, RefreshCw, TriangleAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { Item, Category } from '../types';
import { CATEGORY_META, CATEGORY_COLORS, APP_INFO } from '../lib/constants';
import PileSceneSvg from './PileSceneSvg';
import BoundingBox from './BoundingBox';
import ItemCropThumbnail from './ItemCropThumbnail';

export type ScanState = 'idle' | 'permission_denied' | 'analysing' | 'results' | 'error' | 'low_confidence';
export type AnimPhase = 'idle' | 'sweeping' | 'flying' | 'complete';

interface ViewfinderProps {
  scanState: ScanState;
  imagePreview?: string | null;
  imageAspectRatio?: number;
  liveMode?: boolean;
  cameraActive?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
  analysisError?: string;
  items: Item[];
  activeItemId: string | null;
  selectedCategory: Category | 'all';
  confidenceThreshold: number;
  showMasks: boolean;
  showGraspPoints: boolean;
  analysisProgressStage?: string;
  liveLatencyMs?: number;
  animPhase?: AnimPhase;
  beamProgress?: number;
  onItemHover: (id: string | null) => void;
  onItemSelect: (id: string) => void;
  onCategoryFilterChange: (cat: Category | 'all') => void;
  onRetry: () => void;
  onUploadClick: () => void;
}

export const Viewfinder: React.FC<ViewfinderProps> = ({
  scanState,
  imagePreview,
  imageAspectRatio,
  liveMode = false,
  cameraActive = false,
  videoRef,
  analysisError,
  items,
  activeItemId,
  selectedCategory,
  confidenceThreshold,
  showMasks,
  showGraspPoints,
  analysisProgressStage = 'Detecting items...',
  liveLatencyMs = APP_INFO.defaultLatencyMs,
  animPhase = 'complete',
  beamProgress = 1,
  onItemHover,
  onItemSelect,
  onCategoryFilterChange,
  onRetry,
  onUploadClick,
}) => {
  const categories: Category[] = ['recyclable', 'organic', 'hazardous', 'nonrecyclable'];

  // Filter items based on selected category (if not 'all')
  const visibleItems = items.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const isSweeping = animPhase === 'sweeping';

  // Image filter during sweep: starts blur(8px) desaturated (0.2), clears to normal
  const imageFilter = isSweeping
    ? `blur(${Math.max(0, (1 - beamProgress) * 8).toFixed(1)}px) saturate(${((beamProgress * 0.8) + 0.2).toFixed(2)})`
    : 'none';

  return (
    <div
      className="relative w-full aspect-[16/10] bg-bg rounded-panel border border-border overflow-hidden select-none"
      style={imagePreview && imageAspectRatio ? { aspectRatio: imageAspectRatio } : undefined}
      aria-label="Waste pile computer vision viewfinder canvas"
    >
      {/* 4 Corner Brackets (accent emerald) */}
      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-accent rounded-tl pointer-events-none z-20" />
      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-accent rounded-tr pointer-events-none z-20" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-accent rounded-bl pointer-events-none z-20" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-accent rounded-br pointer-events-none z-20" />

      {/* Top Overlay Chips (spaced to clear corner brackets) */}
      <div className="absolute top-3 left-8 right-8 flex items-center justify-between z-20 pointer-events-none">
        {/* Top-Left: Mode & Resolution */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="font-mono text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-surface/90 border border-border text-accent flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span>{scanState === 'analysing' ? 'ANALYSING' : cameraActive ? 'CAMERA' : imagePreview ? 'CAPTURED FRAME' : scanState === 'idle' ? 'READY' : 'SAMPLE'}</span>
          </span>
          <span className="font-mono text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-surface/90 border border-border text-text">
            {cameraActive ? 'LIVE PREVIEW' : imagePreview ? 'STILL IMAGE' : scanState === 'idle' ? 'NO FRAME' : APP_INFO.resolution}
          </span>
          <span className="hidden sm:inline font-mono text-[10px] px-2 py-0.5 rounded-full bg-surface/90 border border-border text-muted">
            SURFACE-SEG
          </span>
        </div>

        {/* Top-Right: Telemetry (FPS, Latency) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="font-mono text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-surface/90 border border-border text-muted">
            {liveMode ? 'GEMINI' : cameraActive || scanState === 'idle' ? 'NOT ANALYSED' : scanState === 'error' ? 'FAILED' : 'DEMO'}
          </span>
          <span className="font-mono text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-surface/90 border border-border text-accent">
            {scanState === 'idle' || scanState === 'error' || scanState === 'analysing' || cameraActive ? '—' : `${liveLatencyMs} ms`}
          </span>
        </div>
      </div>

      {/* Canvas Interior by Scan State */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {cameraActive && <video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" className="absolute inset-0 w-full h-full object-contain bg-bg" />}
        {/* 1. STATE: IDLE */}
        {scanState === 'idle' && !cameraActive && (
          <div className="flex flex-col items-center justify-center px-12 py-8 text-center z-10 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-card border border-dashed border-border bg-surface flex items-center justify-center text-muted mb-3 group hover:border-accent transition-colors">
              <Camera className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-sm-14 font-semibold text-text">Viewfinder Ready</h3>
            <p className="text-xs-12 text-muted mt-1.5 leading-relaxed">
              Open your camera and capture a frame for Gemini analysis, or upload a photo. No detections appear until you scan.
            </p>
          </div>
        )}

        {/* 2. STATE: PERMISSION DENIED */}
        {scanState === 'permission_denied' && (
          <div className="p-6 max-w-md bg-surface/95 border border-amber-500/30 rounded-panel text-center z-10 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
              <CameraOff className="w-6 h-6" />
            </div>
            <h3 className="text-sm-14 font-semibold text-text">Camera Access Denied</h3>
            <p className="text-xs-12 text-muted mt-1.5 leading-relaxed">
              Optical stream permissions were not granted in your browser. Please allow camera permissions in site settings or upload a waste pile photo directly.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onUploadClick}
                className="px-3.5 py-1.5 text-xs-12 font-semibold rounded-card bg-accent hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
              >
                Upload a photo instead
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="px-3.5 py-1.5 text-xs-12 font-medium rounded-card bg-surface-2 hover:bg-white/5 text-muted hover:text-text border border-border transition-colors cursor-pointer"
              >
                Retry camera
              </button>
            </div>
          </div>
        )}

        {/* 3. STATE: ERROR */}
        {scanState === 'error' && (
          <div className="p-6 max-w-md bg-surface/95 border border-red-500/30 rounded-panel text-center z-10 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
              <TriangleAlert className="w-6 h-6" />
            </div>
            <h3 className="text-sm-14 font-semibold text-text">Analysis Failed</h3>
            <p className="text-xs-12 text-muted mt-1.5">
              {analysisError || 'Could not analyse this frame. Retry the camera capture or upload a photo.'}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 px-4 py-1.5 text-xs-12 font-semibold rounded-card bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 mx-auto transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Analysis</span>
            </button>
          </div>
        )}

        {/* 4. BASE SVG PILE SCENE (Present during analysing, results, and low_confidence) */}
        {!cameraActive && (scanState === 'analysing' || scanState === 'results' || scanState === 'low_confidence') && (
          <div className="absolute inset-0 w-full h-full">
            {/* Vector Scene with dynamic blur & desaturate transition during sweep */}
            <div
              className="w-full h-full"
              style={{
                filter: imageFilter,
                transition: isSweeping ? 'none' : 'filter 300ms ease-out',
              }}
            >
              {imagePreview ? <img src={imagePreview} alt="Uploaded waste pile for analysis" className="w-full h-full object-contain" /> : <PileSceneSvg />}
            </div>

            {/* Animation 1: Sweeping 2px emerald beam with soft 120px gradient trail */}
            {isSweeping && (
              <div
                className="absolute left-0 right-0 pointer-events-none z-30"
                style={{
                  top: `${(beamProgress * 100).toFixed(2)}%`,
                  transform: 'translateY(-100%)',
                }}
              >
                <div className="h-[120px] bg-gradient-to-t from-accent/30 via-accent/10 to-transparent" />
                <div className="h-[2px] bg-accent shadow-[0_0_12px_#34D399]" />
              </div>
            )}

            {scanState === 'analysing' && <div className="analysis-sweep" aria-hidden="true" />}

            {/* Stage text overlay if analysing */}
            {scanState === 'analysing' && !isSweeping && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 bg-surface/90 border border-border px-4 py-2 rounded-full flex items-center gap-2.5 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                <span className="text-xs-12 font-mono font-medium text-text">
                  {analysisProgressStage}
                </span>
              </div>
            )}

            {/* Bounding Box SVG Overlay during RESULTS or LOW_CONFIDENCE states */}
            {(scanState === 'results' || scanState === 'low_confidence' || isSweeping) && (
              <>
                <svg
                  viewBox="0 0 1000 625"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full z-10 overflow-visible"
                >
                  {visibleItems.map((item, idx) => {
                    const isActive = activeItemId === item.id;
                    const isDimmed = activeItemId !== null && activeItemId !== item.id;
                    const isBelowThreshold = !item.userConfirmed && item.confidence * 100 < confidenceThreshold;
                    const isDiscovered = isSweeping ? beamProgress >= item.bbox.y : true;

                    return (
                      <BoundingBox
                        key={item.id}
                        item={item}
                        isActive={isActive}
                        isDimmed={isDimmed}
                        showMasks={showMasks}
                        showGraspPoints={showGraspPoints}
                        isBelowThreshold={isBelowThreshold}
                        isDiscovered={isDiscovered}
                        staggerIndex={idx}
                        onHover={onItemHover}
                        onSelect={onItemSelect}
                      />
                    );
                  })}
                </svg>

                {/* Popping crop thumbnails at item positions as beam passes (sweep phase) */}
                {isSweeping && (
                  <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
                    {visibleItems.map((item) => {
                      const isDiscovered = beamProgress >= item.bbox.y;
                      if (!isDiscovered) return null;

                      return (
                        <motion.div
                          key={`crop-thumb-${item.id}`}
                          layoutId={`crop-thumb-${item.id}`}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                          className="absolute pointer-events-none"
                          style={{
                            left: `calc(${item.bbox.x * 100}% + ${(item.bbox.width * 100) / 2}% - 28px)`,
                            top: `calc(${item.bbox.y * 100}% + ${(item.bbox.height * 100) / 2}% - 28px)`,
                            width: 56,
                            height: 56,
                          }}
                        >
                          <ItemCropThumbnail
                            item={item}
                            size={56}
                            className="shadow-2xl ring-2 ring-accent/60"
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom-Left Canvas Overlay: Category Legend (Click to Filter, clears corner brackets) */}
      <div className="absolute bottom-3 left-8 z-20 flex items-center gap-1.5 bg-surface/90 backdrop-blur border border-border px-2.5 py-1 rounded-full shadow-lg">
        <span className="text-[10px] font-mono text-muted uppercase mr-1 hidden xs:inline">
          Filter:
        </span>
        <button
          type="button"
          onClick={() => onCategoryFilterChange('all')}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-white/10 text-text font-bold'
              : 'text-muted hover:text-text'
          }`}
        >
          ALL
        </button>
        {categories.map((catKey) => {
          const meta = CATEGORY_META[catKey];
          const dotColor = CATEGORY_COLORS[catKey];
          const isSelected = selectedCategory === catKey;

          return (
            <button
              key={catKey}
              type="button"
              onClick={() => onCategoryFilterChange(isSelected ? 'all' : catKey)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-surface-2 border-border text-text font-semibold'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              <span
                style={{ backgroundColor: dotColor }}
                className="w-2 h-2 rounded-full shrink-0"
              />
              <span>{meta.label.substring(0, 3).toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Viewfinder;
