import { ScanResult, Site, Item } from '../types';
import { MOCK_SCAN_RESULT, ALL_MOCK_ITEMS, CORE_MOCK_ITEMS, MOCK_SITES } from '../data/mockData';
import { APP_INFO, HONESTY_STRINGS } from '../lib/constants';

export interface AnalyseOptions {
  sceneType?: 'core' | 'full';
  delayMs?: number;
  forceError?: boolean;
}

export type BackendStatus = 'mock' | 'connected' | 'fallback';

export interface ScanService {
  analyse(file?: File | null, options?: AnalyseOptions): Promise<ScanResult>;
  chat(question: string, items: Item[]): Promise<string>;
  getBackendStatus(): BackendStatus;
  getLatestScan(): Promise<ScanResult>;
  getCoreItems(): Promise<Item[]>;
  getAllItems(): Promise<Item[]>;
  getSites(): Promise<Site[]>;
  getSiteById(siteId: string): Promise<Site | undefined>;
}

// Read API URL from Vite environment variables
const RAW_API_URL = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_API_URL
  : '';
const API_URL = (RAW_API_URL || '').trim().replace(/\/+$/, '');

let currentBackendStatus: BackendStatus = API_URL ? 'connected' : 'mock';

/**
 * Validates whether the returned payload strictly matches the expected ScanResult shape.
 */
function isValidScanResult(data: unknown): data is ScanResult {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<ScanResult>;
  if (typeof candidate.scanId !== 'string') return false;
  if (!Array.isArray(candidate.items)) return false;

  for (const item of candidate.items) {
    if (!item || typeof item !== 'object') return false;
    if (typeof item.id !== 'string') return false;
    if (typeof item.label !== 'string') return false;
    if (!['recyclable', 'organic', 'hazardous', 'nonrecyclable'].includes(item.category)) {
      return false;
    }
    if (!item.bbox || typeof item.bbox.x !== 'number') return false;
    if (!Array.isArray(item.polygon)) return false;
    if (!item.graspPoint || typeof item.graspPoint.x !== 'number') return false;
  }
  return true;
}

/**
 * Local canned chat reply generator when operating in offline/demo mode.
 */
function generateMockChatReply(query: string, items: Item[]): string {
  const q = query.trim().toLowerCase();

  if (q.includes('depot') || q.includes('nearest hazardous') || q.includes('hazardous drop')) {
    return 'To locate an authorized recycling or hazardous disposal facility, I require your verified station coordinates. EcoScan AI will never fabricate or guess real-world addresses or contact numbers. Please share your location securely below.';
  }

  const itemNumMatch = q.match(/item\s*#?\s*(\d+)/i);
  if (itemNumMatch) {
    const itemNum = parseInt(itemNumMatch[1], 10);
    const matchedItem = items.find((i) => i.itemNumber === itemNum);
    if (matchedItem) {
      return `Item #${matchedItem.itemNumber} is "${matchedItem.label}", classified as ${matchedItem.category.toUpperCase()} (${matchedItem.material}).\n\nTarget Bin: ${matchedItem.targetBin}.\nAction: ${matchedItem.actionRequired}.\n\nReason: ${matchedItem.whyReason}`;
    }
    return `Item #${itemNum} was not found on the visible surface layer of the current scan. Try selecting one of the ${items.length} currently detected items.`;
  }

  if (q.includes('battery') || q.includes('hazard') || q.includes('dangerous')) {
    const hazItems = items.filter((i) => i.isHazardous || i.category === 'hazardous');
    if (hazItems.length > 0) {
      const names = hazItems.map((i) => `#${i.itemNumber} ${i.label}`).join(', ');
      return `Flagged ${hazItems.length} hazardous item(s): ${names}.\n\nFollow your local hazardous-waste handling rules. Do not compact, crush or puncture.\n\nMandatory Protocol: Remove manually before mechanical sorting or baling. Transfer immediately to a dedicated red container and take to an authorized drop-off depot.`;
    }
    return 'No hazardous batteries or reactive materials were flagged in the current top surface scan.';
  }

  if (q.includes('worth') || q.includes('value') || q.includes('price') || q.includes('valuable')) {
    const valuedItems = items
      .filter((i) => i.estimatedValueInr !== null)
      .sort((a, b) => {
        const midA = ((a.estimatedValueInr?.min ?? 0) + (a.estimatedValueInr?.max ?? 0)) / 2;
        const midB = ((b.estimatedValueInr?.min ?? 0) + (b.estimatedValueInr?.max ?? 0)) / 2;
        return midB - midA;
      });

    if (valuedItems.length > 0) {
      const topList = valuedItems
        .slice(0, 3)
        .map(
          (i, idx) =>
            `${idx + 1}. #${i.itemNumber} ${i.label} (${i.material}): ₹${i.estimatedValueInr?.min}-${i.estimatedValueInr?.max} INR`
        )
        .join('\n');
      return `Top valuable recoverable materials ranked by secondary market midpoint:\n\n${topList}\n\nClean, uncontaminated non-ferrous metals and clean PET plastics command the highest scrap prices.`;
    }
    return 'No items with recoverable scrap value are currently identified in this batch.';
  }

  if (q.includes('summar') || q.includes('overview') || q.includes('report') || q.includes('total')) {
    const totalCount = items.length;
    const totalMass = items.reduce((acc, i) => acc + i.weightGrams, 0);
    const recItems = items.filter((i) => i.category === 'recyclable');
    const recMass = recItems.reduce((acc, i) => acc + i.weightGrams, 0);
    const recShare = totalMass > 0 ? ((recMass / totalMass) * 100).toFixed(1) : '0';

    let minVal = 0;
    let maxVal = 0;
    items.forEach((i) => {
      if (i.estimatedValueInr) {
        minVal += i.estimatedValueInr.min;
        maxVal += i.estimatedValueInr.max;
      }
    });

    const hazCount = items.filter((i) => i.isHazardous || i.category === 'hazardous').length;
    const nonRecMass = items
      .filter((i) => i.category === 'organic' || i.category === 'nonrecyclable')
      .reduce((acc, i) => acc + i.weightGrams, 0);
    const nonRecShare = totalMass > 0 ? ((nonRecMass / totalMass) * 100).toFixed(1) : '0';

    return `Scan Summary:\n` +
      `• Items detected: ${totalCount} visible pieces\n` +
      `• Total mass: ${totalMass} g (est.)\n` +
      `• Recoverable share: ${recShare}% by weight (${recMass} g)\n` +
      `• Est. value: ₹${minVal.toFixed(1)} - ₹${maxVal.toFixed(1)} INR\n` +
      `• Hazardous units: ${hazCount} flagged (lockout required)\n` +
      `• Non-recoverable share (organic + reject): ${nonRecShare}%`;
  }

  return 'I can answer questions about the items in this scan. Try one of the suggestions.';
}

/**
 * Service providing scan and computer vision segmentation data.
 * Pure service layer: handles network requests to backend when VITE_API_URL is configured,
 * with graceful fallback to demo mock data on network errors or invalid response shape.
 */
export const scanService: ScanService = {
  getBackendStatus(): BackendStatus {
    return currentBackendStatus;
  },

  /**
   * Performs vision segmentation and material classification.
   * If VITE_API_URL is set, POSTs to `${VITE_API_URL}/scan`.
   * Falls back to mock data if unreachable or payload shape is invalid.
   */
  async analyse(file: File | null = null, options: AnalyseOptions = {}): Promise<ScanResult> {
    const { sceneType = 'full', delayMs = 2000, forceError = false } = options;

    if (API_URL && !forceError) {
      try {
        let response: Response;

        if (file) {
          const formData = new FormData();
          formData.append('image', file);
          response = await fetch(`${API_URL}/scan`, {
            method: 'POST',
            body: formData,
          });
        } else {
          response = await fetch(`${API_URL}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sceneType }),
          });
        }

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const data: unknown = await response.json();

        if (isValidScanResult(data)) {
          currentBackendStatus = 'connected';
          return data;
        } else {
          console.warn('[EcoScan] Backend returned invalid ScanResult shape. Falling back to demo data.', data);
          currentBackendStatus = 'fallback';
        }
      } catch (err) {
        console.warn('[EcoScan] Failed to reach backend API. Falling back to demo data:', err);
        currentBackendStatus = 'fallback';
      }
    } else {
      currentBackendStatus = 'mock';
    }

    // Demo Mock Fallback Pipeline
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (forceError) {
      throw new Error('Inference pipeline error: segmentation model timeout or invalid optical feed.');
    }

    const items: Item[] = sceneType === 'core'
      ? JSON.parse(JSON.stringify(CORE_MOCK_ITEMS))
      : JSON.parse(JSON.stringify(ALL_MOCK_ITEMS));

    return {
      scanId: `SCAN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      siteId: APP_INFO.defaultSiteId,
      siteName: APP_INFO.defaultSiteName,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      imageWidth: 1920,
      imageHeight: 1200,
      modelVersion: HONESTY_STRINGS.modelVersion,
      latencyMs: Math.floor(38 + Math.random() * 12),
      items,
    };
  },

  /**
   * Assistant chat method.
   * If VITE_API_URL is set, POSTs to `${VITE_API_URL}/chat`.
   * Falls back to mock responses if backend is unreachable.
   */
  async chat(question: string, items: Item[]): Promise<string> {
    if (API_URL) {
      try {
        const response = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, items }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (typeof data === 'string') {
          currentBackendStatus = 'connected';
          return data;
        }
        if (data && typeof data.answer === 'string') {
          currentBackendStatus = 'connected';
          return data.answer;
        }

        currentBackendStatus = 'fallback';
      } catch (err) {
        console.warn('[EcoScan] Failed to reach backend chat API. Falling back to mock reply:', err);
        currentBackendStatus = 'fallback';
      }
    } else {
      currentBackendStatus = 'mock';
    }

    return generateMockChatReply(question, items);
  },

  async getLatestScan(): Promise<ScanResult> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return JSON.parse(JSON.stringify(MOCK_SCAN_RESULT));
  },

  async getCoreItems(): Promise<Item[]> {
    await new Promise((resolve) => setTimeout(resolve, 60));
    return JSON.parse(JSON.stringify(CORE_MOCK_ITEMS));
  },

  async getAllItems(): Promise<Item[]> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return JSON.parse(JSON.stringify(ALL_MOCK_ITEMS));
  },

  async getSites(): Promise<Site[]> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return JSON.parse(JSON.stringify(MOCK_SITES));
  },

  async getSiteById(siteId: string): Promise<Site | undefined> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return MOCK_SITES.find((s) => s.id === siteId);
  },
};

export default scanService;
