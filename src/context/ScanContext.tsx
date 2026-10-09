import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Item, Category, ScanResult, ScanState } from '../types';
import { scanService, BackendStatus } from '../services/scanService';
import { generateCropsFromImageFile } from '../lib/cropUtils';
import { BIN_MAPPING } from '../lib/constants';

interface ScanContextType {
  scanData: ScanResult | null;
  imagePreview: string | null;
  cameraActive: boolean;
  setCameraActive: (active: boolean) => void;
  uploadFallback: boolean;
  items: Item[];
  liveLatencyMs: number;
  scanState: ScanState;
  backendStatus: BackendStatus;
  setScanState: (state: ScanState) => void;
  loadDemoPile: () => void;
  selectedItemId: string | null;
  hoveredItemId: string | null;
  activeItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  setHoveredItemId: (id: string | null) => void;
  updateItemCategory: (itemId: string, newCategory: Category) => void;
  runAnalysis: (sceneType?: 'core' | 'full', file?: File | null) => Promise<void>;
  isAnalysing: boolean;
  analysisProgressStage: string;
  analysisError: string;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export const ScanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [scanData, setScanData] = useState<ScanResult | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [analysisError, setAnalysisError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadFallback, setUploadFallback] = useState(false);
  const analysisInFlight = useRef(false);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(scanService.getBackendStatus());
  const [liveLatencyMs, setLiveLatencyMs] = useState<number>(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisProgressStage, setAnalysisProgressStage] = useState('Detecting items...');

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Update an individual item's category (e.g. from low-confidence dropdown)
  const updateItemCategory = useCallback((itemId: string, newCategory: Category) => {
    const correctItem = (item: Item): Item => item.id === itemId ? {
      ...item,
      category: newCategory,
      isHazardous: newCategory === 'hazardous',
      targetBin: BIN_MAPPING[newCategory].binName,
      actionRequired: BIN_MAPPING[newCategory].directive,
      whyReason: 'Material category confirmed by the user. Follow the updated target-bin directive.',
      estimatedValueInr: newCategory === item.category ? item.estimatedValueInr : null,
      userConfirmed: true,
    } : item;
    setItems(previous => previous.map(correctItem));
    setScanData(previous => previous ? { ...previous, items: previous.items.map(correctItem) } : previous);
  }, []);

  // Run analysis pipeline via scanService
  const runAnalysis = useCallback(async (sceneType: 'core' | 'full' = 'full', file: File | null = null) => {
    if (analysisInFlight.current) return;
    analysisInFlight.current = true;
    setUploadFallback(false);
    setAnalysisError('');
    setItems([]);
    setScanData(null);
    setIsAnalysing(true);
    setScanState('analysing');
    setImagePreview(file ? URL.createObjectURL(file) : null);
    setHoveredItemId(null);
    setSelectedItemId(null);
    setAnalysisProgressStage('Detecting items...');

    const timer1 = setTimeout(() => {
      setAnalysisProgressStage('Classifying materials...');
    }, 700);

    const timer2 = setTimeout(() => {
      setAnalysisProgressStage(file ? 'Waiting for Gemini detections...' : 'Preparing demo results...');
    }, 1400);

    try {
      const result = await scanService.analyse(file, { sceneType, delayMs: 2000, demoOnly: !file });
      clearTimeout(timer1);
      clearTimeout(timer2);

      let processedItems = result.items;
      if (file && scanService.getBackendStatus() === 'connected') {
        processedItems = await generateCropsFromImageFile(file, result.items);
      }

      if (file && result.source !== 'live') {
        setImagePreview(null);
        setUploadFallback(true);
      }
      setScanData({ ...result, items: processedItems });
      setScanState('results');
      setItems(processedItems);
      setLiveLatencyMs(result.latencyMs);
      setBackendStatus(scanService.getBackendStatus());
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed. Please retry.');
      setItems([]);
      setScanData(null);
      setScanState('error');
      clearTimeout(timer1);
      clearTimeout(timer2);
      setBackendStatus(scanService.getBackendStatus());
    } finally {
      analysisInFlight.current = false;
      setIsAnalysing(false);
    }
  }, []);

  const activeItemId = hoveredItemId || selectedItemId;

  const loadDemoPile = useCallback(() => {
    void runAnalysis('full');
  }, [runAnalysis]);

  return (
    <ScanContext.Provider
      value={{
        scanData,
        imagePreview,
        cameraActive,
        setCameraActive,
        uploadFallback,
        items,
        liveLatencyMs,
        scanState,
        backendStatus,
        setScanState,
        loadDemoPile,
        selectedItemId,
        hoveredItemId,
        activeItemId,
        setSelectedItemId,
        setHoveredItemId,
        updateItemCategory,
        runAnalysis,
        isAnalysing,
        analysisProgressStage,
        analysisError,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
};

export const useScanContext = (): ScanContextType => {
  const context = useContext(ScanContext);
  if (!context) {
    throw new Error('useScanContext must be used within a ScanProvider');
  }
  return context;
};
