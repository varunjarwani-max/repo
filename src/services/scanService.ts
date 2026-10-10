import { ScanResult, Site, Item } from '../types';
import { MOCK_SCAN_RESULT, ALL_MOCK_ITEMS, CORE_MOCK_ITEMS, MOCK_SITES } from '../data/mockData';
import { APP_INFO, HONESTY_STRINGS, BIN_MAPPING } from '../lib/constants';
import { preparePhotoUpload } from '../lib/cropUtils';

export interface AnalyseOptions {
  sceneType?: 'core' | 'full';
  delayMs?: number;
  forceError?: boolean;
  demoOnly?: boolean;
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

let currentBackendStatus: BackendStatus = 'mock';

/**
 * Validates whether the returned payload strictly matches the expected ScanResult shape.
 */
function isValidScanResult(data: unknown): data is ScanResult {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<ScanResult>;
  const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
  const unit = (value: unknown) => finite(value) && value >= 0 && value <= 1;
  if (candidate.source !== 'live' || typeof candidate.imageKey !== 'string' || !candidate.imageKey) return false;
  if (![candidate.scanId, candidate.siteId, candidate.siteName, candidate.timestamp, candidate.modelVersion].every(value => typeof value === 'string' && value.length > 0)) return false;
  if (!finite(candidate.imageWidth) || candidate.imageWidth <= 0 || !finite(candidate.imageHeight) || candidate.imageHeight <= 0) return false;
  if (!finite(candidate.latencyMs) || candidate.latencyMs < 0 || !Array.isArray(candidate.items) || candidate.items.length > 500) return false;
  const ids = new Set<string>();
  const numbers = new Set<number>();
  for (const item of candidate.items) {
    if (!item || typeof item !== 'object') return false;
    if (![item.id, item.label, item.material, item.actionRequired, item.whyReason].every(value => typeof value === 'string' && value.length > 0)) return false;
    if (ids.has(item.id) || numbers.has(item.itemNumber) || !Number.isInteger(item.itemNumber) || item.itemNumber < 1) return false;
    ids.add(item.id);
    numbers.add(item.itemNumber);
    if (!Object.prototype.hasOwnProperty.call(BIN_MAPPING, item.category)) return false;
    if (!unit(item.confidence) || !finite(item.weightGrams) || item.weightGrams < 0 || item.isHazardous !== (item.category === 'hazardous')) return false;
    if (item.estimatedValueInr !== null && (!item.estimatedValueInr || !finite(item.estimatedValueInr.min) || !finite(item.estimatedValueInr.max) || item.estimatedValueInr.min < 0 || item.estimatedValueInr.max < item.estimatedValueInr.min)) return false;
    const box = item.bbox;
    if (!box || ![box.x, box.y, box.width, box.height].every(unit) || box.width <= 0 || box.height <= 0 || box.x + box.width > 1.00001 || box.y + box.height > 1.00001) return false;
    if (!Array.isArray(item.polygon) || item.polygon.length < 3 || !item.polygon.every(point => Array.isArray(point) && point.length === 2 && point.every(unit))) return false;
    if (!item.graspPoint || !unit(item.graspPoint.x) || !unit(item.graspPoint.y)) return false;
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
      return `Flagged ${hazItems.length} potentially hazardous item(s): ${names}.\n\n${hazItems.map(item => `#${item.itemNumber}: ${item.actionRequired}`).join('\n')}\n\nFollow local hazardous-waste handling rules. This is not a certified safety procedure.`;
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
    return 'Recovery value is not estimated for this scan. No verified market prices are available; this does not mean the materials have no value.';
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
 * Uses the same-origin Gemini endpoint by default, or the optional VITE_API_URL backend.
 * Live failures are surfaced; demo data is returned only for explicit sample scans.
 */
export const scanService: ScanService = {
  getBackendStatus(): BackendStatus {
    return currentBackendStatus;
  },

  /**
   * Performs vision segmentation and material classification.
   * Photos and camera snapshots use Gemini unless an external API is configured.
   * Returns only validated detections and never substitutes demo data on errors.
   */
  async analyse(file: File | null = null, options: AnalyseOptions = {}): Promise<ScanResult> {
    const { sceneType = 'full', delayMs = 2000, forceError = false, demoOnly = false } = options;

    if (file && !API_URL && !forceError && !demoOnly) {
      try {
        const prepared = await preparePhotoUpload(file);
        const image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = () => reject(new Error('Could not read this photo.'));
          reader.readAsDataURL(prepared.file);
        });
        const body: Record<string, unknown> = { image, imageWidth: prepared.width, imageHeight: prepared.height };
        const response = await fetch('/api/analyse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(55000),
        });
        const data: unknown = await response.json();
        if (!response.ok) {
          const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'Image analysis failed.';
          throw new Error(message);
        }
        if (!isValidScanResult(data)) throw new Error('Gemini returned an invalid scan. Please retry.');
        currentBackendStatus = 'connected';
        return { ...data, items: data.items.map(item => ({
          ...item, targetBin: BIN_MAPPING[item.category].binName, cropUrl: undefined, userConfirmed: false,
        })) };
      } catch (error) {
        currentBackendStatus = 'fallback';
        throw error instanceof Error ? error : new Error('Cannot reach Gemini. Check your connection and retry.');
      }
    }

    if (API_URL && file && !forceError && !demoOnly) {
      try {
        const prepared = await preparePhotoUpload(file);
        const ticketResponse = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType: prepared.file.type, size: prepared.file.size }),
          signal: AbortSignal.timeout(10000),
        });
        if (!ticketResponse.ok) throw new Error('Could not request photo upload.');
        const ticket: unknown = await ticketResponse.json();
        if (!ticket || typeof ticket !== 'object') throw new Error('Invalid upload response.');
        const { url, fields, key } = ticket as { url?: unknown; fields?: unknown; key?: unknown };
        if (typeof url !== 'string' || !url.startsWith('https://') || typeof key !== 'string' || !fields || typeof fields !== 'object' || !Object.values(fields).every(value => typeof value === 'string')) throw new Error('Invalid S3 upload ticket.');
        const uploadData = new FormData();
        Object.entries(fields).forEach(([name, value]) => uploadData.append(name, value as string));
        uploadData.append('file', prepared.file);
        const uploadResponse = await fetch(url, { method: 'POST', body: uploadData, signal: AbortSignal.timeout(20000) });
        if (!uploadResponse.ok) throw new Error('Photo upload failed.');
        const response = await fetch(`${API_URL}/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageKey: key, imageWidth: prepared.width, imageHeight: prepared.height }),
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new Error('Image analysis failed.');
        const data: unknown = await response.json();
        if (!isValidScanResult(data) || data.imageKey !== key) throw new Error('Invalid scan response.');
        currentBackendStatus = 'connected';
        return { ...data, items: data.items.map(item => ({
          ...item,
          cropUrl: undefined,
          userConfirmed: false,
          isHazardous: item.isHazardous || item.category === 'hazardous',
          targetBin: BIN_MAPPING[item.isHazardous ? 'hazardous' : item.category].binName,
        })) };
      } catch (error) {
        currentBackendStatus = 'fallback';
        throw error instanceof Error ? error : new Error('The configured image analysis backend is unavailable.');
      }
    } else {
      currentBackendStatus = file ? 'fallback' : 'mock';
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
      source: 'demo',
      latencyMs: Math.floor(38 + Math.random() * 12),
      items,
    };
  },

  /** Rule-based replies grounded in the current scan; no model call. */
  async chat(question: string, items: Item[]): Promise<string> {
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
