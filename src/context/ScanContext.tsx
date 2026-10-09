import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Item, Category, ScanResult, ScanState } from '../types';
import { scanService, BackendStatus } from '../services/scanService';
import { generateCropsFromImageFile } from '../lib/cropUtils';
import { APP_INFO } from '../lib/constants';

interface ScanContextType {
  scanData: ScanResult | null;
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
  const [scanData, setScanData] = useState<ScanResult | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [scanState, setScanState] = useState<ScanState>('results');
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(scanService.getBackendStatus());
  const [liveLatencyMs, setLiveLatencyMs] = useState<number>(APP_INFO.defaultLatencyMs);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisProgressStage, setAnalysisProgressStage] = useState('Detecting items...');

  // Initialize with latest scan on startup
  useEffect(() => {
    let isMounted = true;
    scanService.getLatestScan().then((res) => {
      if (isMounted) {
        setScanData(res);
        setItems(res.items);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Update an individual item's category (e.g. from low-confidence dropdown)
  const updateItemCategory = useCallback((itemId: string, newCategory: Category) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          const isHazardous = newCategory === 'hazardous';
          return {
            ...item,
            category: newCategory,
            isHazardous,
            userConfirmed: true,
          };
        }
        return item;
      })
    );
  }, []);

  // Run analysis pipeline via scanService
  const runAnalysis = useCallback(async (sceneType: 'core' | 'full' = 'full', file: File | null = null) => {
    setIsAnalysing(true);
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
      const result = await scanService.analyse(file, { sceneType, delayMs: 2000 });
      clearTimeout(timer1);
      clearTimeout(timer2);

      let processedItems = result.items;
      if (file) {
        processedItems = await generateCropsFromImageFile(file, result.items);
      }

      setScanData(result);
      setItems(processedItems);
      setLiveLatencyMs(result.latencyMs);
      setBackendStatus(scanService.getBackendStatus());
    } catch {
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
