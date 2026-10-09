export type Category = 'recyclable' | 'organic' | 'hazardous' | 'nonrecyclable';

export interface BoundingBox {
  /** Normalized top-left X coordinate (0 to 1) */
  x: number;
  /** Normalized top-left Y coordinate (0 to 1) */
  y: number;
  /** Normalized width (0 to 1) */
  width: number;
  /** Normalized height (0 to 1) */
  height: number;
}

export type PolygonPoint = [number, number]; // [x, y] normalized 0..1

export interface GraspPoint {
  x: number;
  y: number;
}

export interface ValueRange {
  min: number;
  max: number;
}

export interface Item {
  id: string;
  itemNumber: number;
  label: string;
  category: Category;
  material: string;
  confidence: number;
  weightGrams: number;
  estimatedValueInr: ValueRange | null;
  targetBin: string;
  actionRequired: string;
  whyReason: string;
  isHazardous: boolean;
  bbox: BoundingBox;
  polygon: PolygonPoint[];
  graspPoint: GraspPoint;
  userConfirmed?: boolean;
  cropUrl?: string;
}

export interface ScanResult {
  scanId: string;
  siteId: string;
  siteName: string;
  timestamp: string;
  imageWidth: number;
  imageHeight: number;
  modelVersion: string;
  latencyMs: number;
  items: Item[];
}

export interface SiteHistoricalScan {
  id: string;
  date: string;
  itemsCount: number;
  recoverableSharePct: number;
  hazardousCount: number;
  contaminantMassPct: number;
}

export interface SiteTrendPoint {
  date: string;
  recoverableShare: number;
  recyclablePct: number;
  organicPct: number;
  hazardousPct: number;
  nonrecyclablePct: number;
  contaminationPct: number;
}

export interface Site {
  id: string;
  name: string;
  status: 'online' | 'idle' | 'offline';
  lastScanTime: string;
  sparkline: number[];
  scansCount: number;
  avgRecoverableShare: number;
  trendHistory: SiteTrendPoint[];
  pastScans: SiteHistoricalScan[];
}

/** Robot Consumption Payload Format */
export interface RobotItemPayload {
  id: string;
  itemNumber: number;
  label: string;
  material: string;
  category: Category;
  confidence: number;
  normalisedBBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  maskPolygon: PolygonPoint[];
  graspPoint: {
    x: number;
    y: number;
  };
  estimatedWeightGrams: number;
  estimatedValueInr: ValueRange | null;
  hazard: {
    isHazardous: boolean;
    handlingDirective: string;
  };
  targetBin: string;
  recommendedAction: string;
}

export interface RobotOutputEnvelope {
  scanId: string;
  siteId: string;
  timestamp: string;
  imageDimensions: {
    width: number;
    height: number;
  };
  modelVersion: string;
  totalDetectedItems: number;
  summary: {
    recoverableShareWeightPct: number;
    hazardousUnitsCount: number;
  };
  items: RobotItemPayload[];
}

export type ScanState = 'idle' | 'permission_denied' | 'analysing' | 'results' | 'error' | 'low_confidence';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  sourceChip?: string;
  miniItems?: Item[];
  isLocationRequest?: boolean;
}
