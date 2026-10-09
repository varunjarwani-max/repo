import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Item, Category, ScanResult, ScanState } from '../types';
import { scanService, BackendStatus } from '../services/scanService';
import { generateCropsFromImageFile } from '../lib/cropUtils';
import { APP_INFO, BIN_MAPPING } from '../lib/constants';
import { MOCK_SCAN_RESULT } from '../data/mockData';

interface ScanContextType {
  scanData: ScanResult | null;
  imagePreview: string | null;
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
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export const ScanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [scanData, setScanData] = useState<ScanResult | null>(() => structuredClone(MOCK_SCAN_RESULT));
  const [items, setItems] = useState<Item[]>(() => structuredClone(MOCK_SCAN_RESULT.items));
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanState, setScanState] = useState<ScanState>('results');
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(scanService.getBackendStatus());
  const [liveLatencyMs, setLiveLatencyMs] = useState<number>(APP_INFO.defaultLatencyMs);
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
      setAnalysisProgressStage('Estimating recoverable values...');
    }, 1400);

    try {
      const result = await scanService.analyse(file, { sceneType, delayMs: 2000, demoOnly: !file });
      clearTimeout(timer1);
      clearTimeout(timer2);

      let processedItems = result.items;
      if (file && scanService.getBackendStatus() === 'connected') {
        processedItems = await generateCropsFromImageFile(file, result.items);
      }

      setScanData({ ...result, items: processedItems });
      setScanState('results');
      setItems(processedItems);
      setLiveLatencyMs(result.latencyMs);
      setBackendStatus(scanService.getBackendStatus());
    } catch {
      setScanState('error');
      clearTimeout(timer1);
      clearTimeout(timer2);
      setBackendStatus(scanService.getBackendStatus());
    } finally {
      setIsAnalysing(false);
    }
  }, []);

  const activeItemId = hoveredItemId || selectedItemId;

  const loadDemoPile = useCallback(() => {
    runAnalysis('full');
    setScanState('results');
  }, [runAnalysis]);

  return (
    <ScanContext.Provider
      value={{
        scanData,
        imagePreview,
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
