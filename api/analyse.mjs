import { randomUUID } from 'node:crypto';
import { generateText, Output, APICallError } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
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
    whyReason: z.string().default('Visual feature detection'),
    actionRequired: z.string().default('Sort into designated collection bin'),
    bbox: z.object({
      x: z.coerce.number().default(0.1),
      y: z.coerce.number().default(0.1),
      width: z.coerce.number().default(0.3),
      height: z.coerce.number().default(0.3),
    }).default({ x: 0.1, y: 0.1, width: 0.3, height: 0.3 }),
  })).default([]),
});

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
    const callModel = async (modelToUse) => {
      return withGeminiKey(apiKey => generateText({
        model: createGoogleGenerativeAI({ apiKey })(modelToUse),
        output: Output.object({ schema: detectionSchema }),
        abortSignal,
        temperature: 0.1,
        maxRetries: 1,
        maxOutputTokens: 1024,
        system: 'Detect and classify distinct visible waste objects in the photograph. Return empty items array when no waste is visible. Categories: recyclable, organic, hazardous, nonrecyclable. Bounding boxes use normalized x, y, width, height (0 to 1). Confidence is visual estimate (0 to 1).',
        messages: [{ role: 'user', content: [
          { type: 'text', text: 'Identify visible waste objects and return sorting guidance and estimated bounding boxes.' },
          { type: 'file', data: image, mediaType },
        ] }],
      }), modelToUse);
    };

    let result;
    let usedModel = primaryModel;
    try {
      result = await callModel(primaryModel);
    } catch (primaryErr) {
      const apiErr = getApiCallError(primaryErr);
      const isRetryableModelError = apiErr?.statusCode === 503 || apiErr?.statusCode === 429 ||
        primaryErr?.statusCode === 503 || primaryErr?.statusCode === 429 ||
        primaryErr?.message?.includes('high demand') || primaryErr?.message?.includes('quota');

      if (isRetryableModelError && primaryModel !== 'gemini-3.6-flash') {
        console.warn(`[EcoScan] ${primaryModel} failed (${primaryErr.message}). Falling back to gemini-3.6-flash...`);
        usedModel = 'gemini-3.6-flash';
        result = await callModel('gemini-3.6-flash');
      } else {
        throw primaryErr;
      }
    }

    const output = result.output;
    const scanId = randomUUID();
    const validItems = [];
    for (const item of (output.items || []).slice(0, 30)) {
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
      const whyReason = (typeof item.whyReason === 'string' && item.whyReason.trim()) || `Classified as ${category} waste based on visual features.`;
      const actionRequired = (typeof item.actionRequired === 'string' && item.actionRequired.trim()) || `Sort into ${category} collection bin.`;
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
    console.error('[EcoScan analyse error]:', error?.message || error);
    const apiError = getApiCallError(error);
    if (apiError && apiError.statusCode === 429) return reply(429, { error: 'Gemini quota exceeded. Check your Google API quota or try again later.' });
    if (apiError && [400, 401, 403].includes(apiError.statusCode)) return reply(502, { error: 'Gemini rejected the request. Check the server API key, permissions, and billing.' });
    if (apiError && apiError.statusCode === 503) return reply(503, { error: 'Gemini is currently experiencing high demand. Please retry in a moment.' });
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return reply(504, { error: 'Analysis timed out. Try uploading a smaller or clearer photo.' });
    return reply(502, { error: 'Gemini could not analyse this frame. Try a clearer photo or retry. No demo detections have been substituted.' });
  } finally {
    activeRequests -= 1;
  }
}
