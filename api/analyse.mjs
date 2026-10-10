import { randomUUID } from 'node:crypto';
import { generateText, Output, APICallError, NoObjectGeneratedError } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import sharp from 'sharp';
import { configuredGeminiKeys, withGeminiKey, getApiCallError } from '../backend/gemini-key-failover.mjs';

function normalizeCategory(val) {
  if (typeof val !== 'string') return 'nonrecyclable';
  const clean = val.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.includes('recycle') || clean.includes('recyclable')) return 'recyclable';
  if (clean.includes('organ') || clean.includes('compost')) return 'organic';
  if (clean.includes('hazard') || clean.includes('toxic') || clean.includes('danger') || clean.includes('battery')) return 'hazardous';
  return 'nonrecyclable';
}

const requestSchema = z.object({
  image: z.string().min(1).max(4_700_000),
  imageWidth: z.number().int().min(1).max(1920),
  imageHeight: z.number().int().min(1).max(1920),
});

const detectionSchema = z.object({
  items: z.array(z.object({
    label: z.string().default('Waste item'),
    material: z.string().default('Mixed material'),
    category: z.string().default('recyclable'),
    confidence: z.coerce.number().default(0.85),
    weightGrams: z.coerce.number().default(50),
    box_2d: z.array(z.coerce.number()).length(4).optional(),
    bbox: z.object({
      x: z.coerce.number().default(0.1),
      y: z.coerce.number().default(0.1),
      width: z.coerce.number().default(0.3),
      height: z.coerce.number().default(0.3),
    }).default({ x: 0.1, y: 0.1, width: 0.3, height: 0.3 }),
  })).default([]),
});

// Thinking adds seconds of latency; detection does not need it.
// Gemini 3 models take thinkingLevel; 2.5 models take thinkingBudget. Set GEMINI_THINKING=default to disable this.
function thinkingFor(model) {
  if (process.env.GEMINI_THINKING === 'default') return {};
  return /gemini-3/.test(model) ? { thinkingLevel: process.env.GEMINI_THINKING || 'low' } : { thinkingBudget: 0 };
}


// ---- Detection helpers: native Gemini boxes, tiling, de-duplication ----
// No product limit on items. This ceiling only stops a model that falls into a repeat loop from flooding the UI.
const MAX_ITEMS_SAFETY = 500;
const SCAN_MODE = () => (process.env.GEMINI_SCAN_MODE || 'thorough').toLowerCase(); // 'thorough' | 'fast'

const FIELD_RULES = 'Keep label and material to 1-3 words. Categories: recyclable, organic, hazardous, nonrecyclable. weightGrams is a rough integer estimate. confidence is your visual estimate from 0 to 1. For every item return box_2d as [ymin, xmin, ymax, xmax], integers from 0 to 1000, tightly enclosing that single object.';
const FULL_PROMPT = `Detect EVERY distinct visible waste object in the photograph, including small ones (pills and blister packs, wrappers, bottle caps, cups, bags, scraps, food waste). Do not merge separate objects into one and do not skip items because the pile is crowded; list as many as you can see. ${FIELD_RULES} Return an empty items array when no waste is visible.`;
const FULL_LARGE_PROMPT = `Detect only the LARGE distinct waste objects in the photograph: items that each span more than about 8% of the image width or height (for example boxes, big bottles, shoes, large bags, newspaper piles, bulbs, cups). Ignore small items; other passes cover them. ${FIELD_RULES} Return an empty items array when no waste is visible.`;
const TILE_PROMPT = `This image is a close-up crop of a larger photograph of a waste pile. Detect EVERY distinct visible waste object in this crop, including small ones (pills, wrappers, caps, cups, bags, scraps). Skip an object only if less than half of it is inside the crop. Do not merge separate objects. ${FIELD_RULES} Return an empty items array when no waste is visible.`;

// Returns a 0-1 box {x, y, width, height} for one raw model item.
function unitBox(item) {
  if (Array.isArray(item.box_2d) && item.box_2d.length === 4 && item.box_2d.every(Number.isFinite)) {
    const [ymin, xmin, ymax, xmax] = item.box_2d.map(v => Math.max(0, Math.min(1000, v)) / 1000);
    return { x: xmin, y: ymin, width: Math.max(0, xmax - xmin), height: Math.max(0, ymax - ymin) };
  }
  const raw = item.bbox || {};
  const box = { x: Number(raw.x), y: Number(raw.y), width: Number(raw.width), height: Number(raw.height) };
  if (Object.values(box).some(v => v > 1)) for (const k of Object.keys(box)) if (box[k] > 1) box[k] /= 1000;
  return box;
}

function iou(a, b) {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width), y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

// Merge detections from several passes, dropping duplicates of the same object.
function mergeItems(lists) {
  const kept = [];
  for (const list of lists) {
    for (const item of list) {
      const same = kept.some(k => {
        const overlap = iou(k.bbox, item.bbox);
        const sameLabel = String(k.label).toLowerCase() === String(item.label).toLowerCase();
        if (overlap > 0.5 || (sameLabel && overlap > 0.25)) return true;
        if (!sameLabel) return false;
        const x1 = Math.max(k.bbox.x, item.bbox.x), y1 = Math.max(k.bbox.y, item.bbox.y);
        const x2 = Math.min(k.bbox.x + k.bbox.width, item.bbox.x + item.bbox.width);
        const y2 = Math.min(k.bbox.y + k.bbox.height, item.bbox.y + item.bbox.height);
        const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const smaller = Math.min(k.bbox.width * k.bbox.height, item.bbox.width * item.bbox.height);
        return smaller > 0 && inter / smaller > 0.7;
      });
      if (!same) kept.push(item);
    }
  }
  return kept;
}

// 2x2 overlapping tiles (15% overlap) so small items get more of the model's attention.
async function makeTiles(buffer) {
  const { width, height } = await sharp(buffer).metadata();
  if (!width || !height || width < 600 || height < 400) return [];
  const tw = Math.round(width * 0.575), th = Math.round(height * 0.575);
  const origins = [[0, 0], [width - tw, 0], [0, height - th], [width - tw, height - th]];
  return Promise.all(origins.map(async ([left, top]) => ({
    buffer: await sharp(buffer).extract({ left, top, width: tw, height: th }).jpeg({ quality: 90 }).toBuffer(),
    left: left / width, top: top / height, wFrac: tw / width, hFrac: th / height,
  })));
}

const CATEGORY_ACTION = {
  recyclable: 'Rinse if needed, keep dry, and place in the blue recycling bin.',
  organic: 'Place in the green compost bin.',
  hazardous: 'Isolate it and take it to a hazardous-waste collection point.',
  nonrecyclable: 'Place in the grey residual waste bin.',
};

const requests = new Map();
let activeRequests = 0;

async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 4_800_000) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function analyse(req, res) {
  const reply = (status, body) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(JSON.stringify(body));
  };
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(405, { error: 'Use POST to analyse a captured frame.' });
  }
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin) {
    try {
      if (new URL(origin).host !== host) return reply(403, { error: 'Cross-origin analysis is not allowed.' });
    } catch { return reply(403, { error: 'Invalid request origin.' }); }
  }
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return reply(415, { error: 'Send a JSON image request.' });
  if (Number(req.headers['content-length']) > 4_800_000) return reply(413, { error: 'Image request is too large.' });
  if (!configuredGeminiKeys().length) return reply(503, { error: 'Gemini is not configured. Add GEMINI_API_KEY in project environment variables.' });

  const now = Date.now();
  for (const [key, value] of requests) if (value.expires <= now) requests.delete(key);
  const client = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const entry = requests.get(client) || { count: 0, expires: now + 60000 };
  if (entry.count >= 20 || activeRequests >= 5) {
    res.setHeader('Retry-After', '30');
    return reply(429, { error: 'Too many scans. Wait a moment and try again.' });
  }
  entry.count += 1;
  requests.set(client, entry);
  let input;
  let image;
  let mediaType = 'image/jpeg';
  try {
    input = requestSchema.parse(await readBody(req));
    let base64 = input.image;
    const match = base64.match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/);
    if (match) {
      mediaType = match[1];
      base64 = match[2];
    }
    base64 = base64.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error('INVALID_IMAGE');
    image = Buffer.from(base64, 'base64');
    if (image.length > 3_500_000 || image.length < 4) throw new Error('INVALID_IMAGE');
    if (image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) {
      mediaType = 'image/jpeg';
    } else if (image.length >= 8 && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      mediaType = 'image/png';
    } else if (image.length >= 12 && image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP') {
      mediaType = 'image/webp';
    } else {
      throw new Error('INVALID_IMAGE');
    }
  } catch (error) {
    return reply(error.message === 'BODY_TOO_LARGE' ? 413 : 400, { error: 'Invalid image. Capture or upload a JPG, PNG, or WebP photo and try again.' });
  }

  activeRequests += 1;
  const started = performance.now();
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';

  try {
    const abortSignal = AbortSignal.timeout(45000);
    const callModel = (modelToUse, data, type, system) => withGeminiKey(apiKey => generateText({
      model: createGoogleGenerativeAI({ apiKey })(modelToUse),
      output: Output.object({ schema: detectionSchema }),
      abortSignal,
      temperature: 0.1,
      maxRetries: 1,
      maxOutputTokens: 16384,
      providerOptions: { google: { thinkingConfig: thinkingFor(modelToUse) } },
      system,
      messages: [{ role: 'user', content: [
        { type: 'text', text: 'Identify every visible waste object and return sorting guidance and bounding boxes.' },
        { type: 'file', data, mediaType: type },
      ] }],
    }), modelToUse);

    const fallbackModels = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.6-flash,gemini-3.5-flash')
      .split(',').map(m => m.trim()).filter(Boolean);
    const chain = [...new Set([primaryModel, ...fallbackModels])];
    let usedModel = primaryModel;

    // Runs one image through the model chain; falls through to the next model on 404/429/5xx/unusable output.
    const detect = async (data, type, system, label) => {
      let lastError;
      for (const modelId of chain) {
        try {
          const out = await callModel(modelId, data, type, system);
          return { items: out.output.items || [], modelId };
        } catch (err) {
          lastError = err;
          const apiErr = getApiCallError(err);
          const status = apiErr?.statusCode ?? err?.statusCode;
          const canTryNext = [404, 429, 500, 503].includes(status) || NoObjectGeneratedError.isInstance(err)
            || /high demand|quota|not found|not supported/i.test(err?.message || '');
          console.warn(`[EcoScan] ${label}: model "${modelId}" failed (status ${status ?? 'n/a'}): ${err?.message}`);
          if (!canTryNext) throw err;
        }
      }
      throw lastError;
    };

    let tiles = [];
    if (SCAN_MODE() === 'thorough') {
      try { tiles = await makeTiles(image); } catch (err) { console.warn('[EcoScan] tiling skipped:', err?.message); }
    }
    const settled = await Promise.allSettled([
      detect(image, mediaType, tiles.length ? FULL_LARGE_PROMPT : FULL_PROMPT, 'full image'),
      ...tiles.map((t, i) => detect(t.buffer, 'image/jpeg', TILE_PROMPT, `tile ${i + 1}`)),
    ]);
    const [fullRun, ...tileRuns] = settled;
    if (fullRun.status === 'rejected' && !tileRuns.some(r => r.status === 'fulfilled')) throw fullRun.reason;
    if (fullRun.status === 'fulfilled') usedModel = fullRun.value.modelId;

    const withBox = (items, map = b => b) => items.map(item => ({ ...item, bbox: map(unitBox(item)) }));
    const fullItems = fullRun.status === 'fulfilled' ? withBox(fullRun.value.items) : [];
    const tileItems = tileRuns.map((r, i) => {
      if (r.status !== 'fulfilled') return [];
      const t = tiles[i];
      return withBox(r.value.items, b => ({
        x: t.left + b.x * t.wFrac, y: t.top + b.y * t.hFrac, width: b.width * t.wFrac, height: b.height * t.hFrac,
      }));
    });
    const merged = mergeItems([fullItems, ...tileItems]).slice(0, MAX_ITEMS_SAFETY);
    // Keep reading order stable: top-to-bottom, left-to-right.
    merged.sort((a, b) => (Math.round(a.bbox.y * 6) - Math.round(b.bbox.y * 6)) || (a.bbox.x - b.bbox.x));
    const output = { items: merged };
    const scanId = randomUUID();
    const validItems = [];
    for (const item of (output.items || []).slice(0, MAX_ITEMS_SAFETY)) {
      const rawBox = item.bbox || {};
      let x = Number.isFinite(rawBox.x) ? rawBox.x : 0.1;
      let y = Number.isFinite(rawBox.y) ? rawBox.y : 0.1;
      let width = Number.isFinite(rawBox.width) ? rawBox.width : 0.2;
      let height = Number.isFinite(rawBox.height) ? rawBox.height : 0.2;

      // Coordinate scaling if in 0-1000 range
      if (x > 1 || y > 1 || width > 1 || height > 1) {
        if (x > 1) x /= 1000;
        if (y > 1) y /= 1000;
        if (width > 1) width /= 1000;
        if (height > 1) height /= 1000;
      }

      x = Math.max(0, Math.min(0.9, x));
      y = Math.max(0, Math.min(0.9, y));
      width = Math.max(0.02, Math.min(width, 1 - x));
      height = Math.max(0.02, Math.min(height, 1 - y));

      const category = normalizeCategory(item.category);
      const label = (typeof item.label === 'string' && item.label.trim()) || 'Waste item';
      const material = (typeof item.material === 'string' && item.material.trim()) || 'Mixed material';
      const whyReason = (typeof item.whyReason === 'string' && item.whyReason.trim()) || `Looks like ${material.toLowerCase()}, so it is sorted as ${category} waste.`;
      const actionRequired = (typeof item.actionRequired === 'string' && item.actionRequired.trim()) || CATEGORY_ACTION[category];
      const confidence = Math.max(0.01, Math.min(1, Number(item.confidence) || 0.85));
      const weightGrams = Math.max(1, Number(item.weightGrams) || 50);

      validItems.push({
        id: `${scanId}-${validItems.length + 1}`,
        itemNumber: validItems.length + 1,
        label,
        material,
        category,
        confidence,
        weightGrams,
        whyReason,
        actionRequired,
        bbox: { x, y, width, height },
        polygon: [[x, y], [x + width, y], [x + width, y + height], [x, y + height]],
        graspPoint: { x: Number((x + width / 2).toFixed(4)), y: Number((y + height / 2).toFixed(4)) },
        estimatedValueInr: null,
        targetBin: category,
        isHazardous: category === 'hazardous',
        userConfirmed: false,
      });
    }

    return reply(200, {
      scanId, siteId: 'CURRENT-SESSION', siteName: 'Current camera / photo session',
      timestamp: new Date().toISOString(), source: 'live', imageKey: scanId,
      imageWidth: input.imageWidth, imageHeight: input.imageHeight,
      modelVersion: usedModel, latencyMs: Math.round(performance.now() - started), items: validItems,
    });
  } catch (error) {
    const apiError = getApiCallError(error);
    console.error('[EcoScan analyse error]:', {
      name: error?.name, message: error?.message, status: apiError?.statusCode,
      body: apiError?.responseBody?.slice?.(0, 500), finishReason: error?.finishReason, text: error?.text?.slice?.(0, 300),
    });
    if (apiError && apiError.statusCode === 404) return reply(502, { error: `Gemini model not found. Check GEMINI_MODEL (tried: ${primaryModel}).` });
    if (NoObjectGeneratedError.isInstance(error)) return reply(502, { error: `Gemini returned unusable output (finish reason: ${error.finishReason || 'unknown'}). Retry or try a clearer photo.` });
    if (apiError && apiError.statusCode === 429) return reply(429, { error: 'Gemini quota exceeded. Check your Google API quota or try again later.' });
    if (apiError && [400, 401, 403].includes(apiError.statusCode)) return reply(502, { error: 'Gemini rejected the request. Check the server API key, permissions, and billing.' });
    if (apiError && apiError.statusCode === 503) return reply(503, { error: 'Gemini is currently experiencing high demand. Please retry in a moment.' });
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return reply(504, { error: 'Analysis timed out. Try uploading a smaller or clearer photo.' });
    return reply(502, { error: 'Gemini could not analyse this frame. Try a clearer photo or retry. No demo detections have been substituted.' });
  } finally {
    activeRequests -= 1;
  }
}
