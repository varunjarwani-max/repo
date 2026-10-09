import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Layers, MoreHorizontal, Crosshair, Shapes, Sliders } from 'lucide-react';
import { ScanState } from '../types';

interface ControlBarProps {
  scanState: ScanState;
  cameraActive?: boolean;
  cameraOpening?: boolean;
  onStopCamera?: () => void;
  showMasks: boolean;
  showGraspPoints: boolean;
  confidenceThreshold: number;
  onCaptureAndAnalyse: () => void;
  onUploadPhoto: () => void;
  onLoadDemoPile: () => void;
  onToggleMasks: () => void;
  onToggleGraspPoints: () => void;
  onConfidenceThresholdChange: (val: number) => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  scanState,
  cameraActive = false,
  cameraOpening = false,
  onStopCamera,
  showMasks,
  showGraspPoints,
  confidenceThreshold,
  onCaptureAndAnalyse,
  onUploadPhoto,
  onLoadDemoPile,
  onToggleMasks,
  onToggleGraspPoints,
  onConfidenceThresholdChange,
}) => {
  const isAnalysing = scanState === 'analysing';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="w-full bg-surface border border-border rounded-panel p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5 select-none relative">
      {/* Primary & Secondary Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Primary Action: Capture and Analyse */}
        <button
          type="button"
          disabled={isAnalysing || cameraOpening}
          onClick={onCaptureAndAnalyse}
          className="px-4 py-2 rounded-card bg-accent hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm-14 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Camera className="w-4 h-4 text-slate-950" />
          <span>{isAnalysing ? 'Analysing…' : cameraOpening ? 'Opening camera…' : cameraActive ? 'Capture & analyse' : 'Open camera'}</span>
        </button>

        {cameraActive && <button type="button" onClick={onStopCamera} className="px-3 py-2 rounded-card border border-border text-sm text-muted hover:text-text">Stop camera</button>}
        {/* Secondary: Upload Photo */}
        <button
          type="button"
          disabled={isAnalysing}
          onClick={onUploadPhoto}
          className="px-3.5 py-2 rounded-card bg-surface-2 hover:bg-white/5 disabled:opacity-50 text-text font-medium text-sm-14 border border-border flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-muted" />
          <span>Upload photo</span>
        </button>

        {/* Secondary: Load Demo Pile */}
        <button
          type="button"
          disabled={isAnalysing}
          onClick={onLoadDemoPile}
          className="px-3.5 py-2 rounded-card bg-surface-2 hover:bg-white/5 disabled:opacity-50 text-text font-medium text-sm-14 border border-border flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-muted" />
          <span>Load demo pile</span>
        </button>
      </div>

      {/* Overflow "..." Menu for Viewfinder Options & Threshold Slider */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Viewfinder options and confidence threshold"
          aria-expanded={menuOpen}
          className={`p-2 rounded-card border transition-colors cursor-pointer ${
            menuOpen
              ? 'bg-surface-2 border-accent text-accent'
              : 'bg-surface-2 border-border text-muted hover:text-text hover:border-white/20'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 w-72 max-w-[calc(100vw-64px)] bg-surface-2 border border-border rounded-panel p-3.5 shadow-2xl z-40 space-y-3 font-sans text-xs-12">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-text text-sm-14">Viewfinder Settings</span>
              <span className="font-mono text-[10px] text-muted">OVERLAYS</span>
            </div>

            {/* Toggle: Show Masks */}
            <label className="flex items-center justify-between cursor-pointer py-1 text-text">
              <span className="flex items-center gap-2">
                <Shapes className="w-4 h-4 text-muted" />
                <span>Show mask polygons</span>
              </span>
              <input
                type="checkbox"
                checked={showMasks}
                onChange={onToggleMasks}
                className="w-4 h-4 accent-accent rounded cursor-pointer"
              />
            </label>

            {/* Toggle: Show Grasp Points */}
            <label className="flex items-center justify-between cursor-pointer py-1 text-text">
              <span className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-muted" />
                <span>Show grasp points</span>
              </span>
              <input
                type="checkbox"
                checked={showGraspPoints}
                onChange={onToggleGraspPoints}
                className="w-4 h-4 accent-accent rounded cursor-pointer"
              />
            </label>

            {/* Slider: Confidence Threshold */}
            <div className="pt-2 border-t border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Confidence threshold</span>
                </span>
                <span className="font-mono font-semibold text-accent">
                  {confidenceThreshold}%
                </span>
              </div>
              <input
                type="range"
                aria-label="Confidence threshold"
                min="0"
                max="100"
                value={confidenceThreshold}
                onChange={(e) => onConfidenceThresholdChange(Number(e.target.value))}
                className="w-full h-1.5 bg-surface rounded-full accent-accent cursor-pointer"
              />
              <span className="text-[10px] text-muted block">
                Items below {confidenceThreshold}% show dashed outline for confirmation
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlBar;
