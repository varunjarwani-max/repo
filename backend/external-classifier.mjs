/**
 * external-classifier.mjs
 *
 * Grid-tiling pipeline for high-density waste detection:
 *   1. Sharp slices the image into a 2×2 grid of quadrant JPEG buffers.
 *   2. All 4 quadrants are sent to Gemini in parallel via Promise.all.
 *   3. Each call uses native Structured Outputs (responseSchema) — no regex
 *      parsing, no text-splitting, no brittle pipe-delimited format.
 *   4. box_2d coordinates from each quadrant are stitched back to the global
 *      0-1000 normalised scale before the flattened array is returned.
 *
 * validateImage() is unchanged; classifyImage() is the only refactored export.
 */

import sharp from 'sharp';
import { ApiError } from './key-store.mjs';
import { configuredGeminiKeys, withGeminiKey, getApiCallError } from './gemini-key-failover.mjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = new Set(['Recyclable', 'Organic', 'Hazardous', 'Non-Recyclable']);

const routing = {
  Recyclable:       { bin: 'Blue recycling bin',          directive: 'Empty, rinse, and keep dry.' },
  Organic:          { bin: 'Green compost bin',            directive: 'Route to locally accepted compost collection.' },
  Hazardous:        { bin: 'Hazardous waste collection',  directive: 'Isolate for qualified review; never send to curbside bins.' },
  'Non-Recyclable': { bin: 'Gray residual waste bin',     directive: 'Route to residual waste according to local rules.' },
};

/**
 * Per-quadrant system prompt — explicitly uncapped detection.
 */
const QUADRANT_SYSTEM = 'Detect all visible waste items in this quadrant. Return JSON with items: [{label: string, category: "Recyclable"|"Organic"|"Hazardous"|"Non-Recyclable", box_2d: [ymin, xmin, ymax, xmax] normalized 0-1000}]. If none, return empty items array.';

/**
 * Strict JSON schema enforced by Gemini's responseSchema — guarantees parseable
 * output without any regex fragility.
 */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label:    { type: 'string' },
          category: { type: 'string', enum: ['Recyclable', 'Organic', 'Hazardous', 'Non-Recyclable'] },
          box_2d:   { type: 'array', items: { type: 'integer' }, minItems: 4, maxItems: 4 },
        },
        required: ['label', 'category', 'box_2d'],
      },
    },
  },
  required: ['items'],
};

// ---------------------------------------------------------------------------
// Image validation — unchanged API surface consumed by developer-api.mjs
// ---------------------------------------------------------------------------

export function validateImage(body, file) {
  let data, declared;
  if (file) { data = file.buffer; declared = file.mimetype; }
  else {
    let base64 = body?.imageBase64;
    if (typeof base64 !== 'string') throw new ApiError(400, 'Provide imageBase64 in JSON or an image file in multipart field image.');
    const match = base64.match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/);
    if (match) { declared = match[1]; base64 = match[2]; }
    else declared = body.mimeType;
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64) || !base64) throw new ApiError(400, 'Invalid base64 image.');
    data = Buffer.from(base64, 'base64');
  }
  if (data.length > 8 * 1024 * 1024) throw new ApiError(413, 'Image must be 8 MB or smaller.');
  const mimeType = data.length >= 4 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff ? 'image/jpeg'
    : data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
    : data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : null;
  if (!mimeType || (declared && declared !== mimeType)) throw new ApiError(415, 'Use a valid JPG, PNG, or WebP image with a matching MIME type.');
  return { data, mimeType };
}

// ---------------------------------------------------------------------------
// Step 1 — 2×2 grid tiling with Sharp
// ---------------------------------------------------------------------------

/**
 * Slices `imageBuffer` into 4 JPEG quadrant buffers.
 *
 * Returns an array of { buffer, row, col } where:
 *   row ∈ {0, 1}  — 0 = top half,   1 = bottom half
 *   col ∈ {0, 1}  — 0 = left half,  1 = right half
 */
async function sliceIntoQuadrants(imageBuffer) {
  const meta = await sharp(imageBuffer).metadata();
  const fullW = meta.width;
  const fullH = meta.height;
  if (!fullW || !fullH) throw new ApiError(422, 'Unable to read image dimensions.');

  const halfW = Math.floor(fullW / 2);
  const halfH = Math.floor(fullH / 2);

  const tiles = [
    { row: 0, col: 0, left: 0,     top: 0,     width: halfW,         height: halfH         },
    { row: 0, col: 1, left: halfW, top: 0,     width: fullW - halfW, height: halfH         },
    { row: 1, col: 0, left: 0,     top: halfH, width: halfW,         height: fullH - halfH },
    { row: 1, col: 1, left: halfW, top: halfH, width: fullW - halfW, height: fullH - halfH },
  ];

  return Promise.all(
    tiles.map(async ({ row, col, left, top, width, height }) => {
      const buffer = await sharp(imageBuffer)
        .extract({ left, top, width, height })
        .jpeg({ quality: 92 })
        .toBuffer();
      return { buffer, row, col };
    })
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Gemini call for one quadrant (native Structured Outputs)
// ---------------------------------------------------------------------------

/**
 * Sends a single quadrant JPEG buffer to the Gemini REST API using
 * `responseMimeType: 'application/json'` + `responseSchema` for zero-parse-error
 * structured output.
 *
 * @param {Buffer} quadrantBuffer  JPEG tile
 * @param {string} apiKey          Active Gemini key (rotated by withGeminiKey)
 * @returns {Promise<Array>}       Raw items array from the model
 */
async function callGeminiQuadrant(quadrantBuffer, apiKey, overrideModel = null) {
  const modelId = overrideModel || process.env.GEMINI_MODEL || 'gemini-3.7-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: { parts: [{ text: QUADRANT_SYSTEM }] },
    contents: [{
      parts: [
        { inline_data: { mime_type: 'image/jpeg', data: quadrantBuffer.toString('base64') } },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData?.error?.message || `HTTP ${response.status}`;
    // Preserve the 429 status code so withGeminiKey can rotate keys
    const err = new Error(`Gemini quadrant call failed: ${msg}`);
    err.statusCode = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Gemini returned empty structured output for a quadrant.');
  }

  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error('Gemini structured output was not valid JSON.'); }

  if (!Array.isArray(parsed?.items)) throw new Error('Gemini structured output missing "items" array.');
  return parsed.items;
}

// ---------------------------------------------------------------------------
// Step 3 — Coordinate stitching (the crucial math)
// ---------------------------------------------------------------------------

/**
 * Translates a quadrant-local box_2d [ymin, xmin, ymax, xmax] (0-1000 relative
 * to the tile) back into global 0-1000 coordinates for the full image.
 *
 * Each tile covers exactly 1/2 of each dimension, so:
 *
 *   globalX = col * 500  +  localX * 0.5
 *   globalY = row * 500  +  localY * 0.5
 *
 * Worked example — item at localX=500 in the RIGHT column (col=1):
 *   globalX = 1*500 + 500*0.5 = 750  ✓  (sits at 75 % across the full image)
 *
 * @param {number[]} box_2d  [ymin, xmin, ymax, xmax] in tile space (0-1000)
 * @param {number}   row     0 = top half | 1 = bottom half
 * @param {number}   col     0 = left half | 1 = right half
 * @returns {{ ymin, xmin, ymax, xmax }} in global space (0-1000)
 */
function stitchCoordinates(box_2d, row, col) {
  const [ymin, xmin, ymax, xmax] = box_2d;
  return {
    ymin: Math.round(row * 500 + ymin * 0.5),
    xmin: Math.round(col * 500 + xmin * 0.5),
    ymax: Math.round(row * 500 + ymax * 0.5),
    xmax: Math.round(col * 500 + xmax * 0.5),
  };
}

// ---------------------------------------------------------------------------
// Step 4 — Per-item validation + stitching
// ---------------------------------------------------------------------------

function validateAndStitchItem(raw, row, col) {
  if (typeof raw.label !== 'string' || !raw.label.trim()) return null;
  if (!VALID_CATEGORIES.has(raw.category)) return null;
  if (!Array.isArray(raw.box_2d) || raw.box_2d.length !== 4) return null;
  const [ymin, xmin, ymax, xmax] = raw.box_2d.map(Number);
  if ([ymin, xmin, ymax, xmax].some(v => !Number.isFinite(v) || v < 0 || v > 1000)) return null;
  if (ymin >= ymax || xmin >= xmax) return null;
  const global = stitchCoordinates([ymin, xmin, ymax, xmax], row, col);
  if (global.ymin >= global.ymax || global.xmin >= global.xmax) return null;
  return { label: raw.label.trim(), category: raw.category, bbox: global };
}

// ---------------------------------------------------------------------------
// Main export — classifyImage (same call-site signature as the old version)
// ---------------------------------------------------------------------------

/**
 * Full grid-tiling pipeline.
 *
 * @param {{ data: Buffer, mimeType: string }} image
 * @returns {Promise<Object>} Compatible with the response shape consumed by developer-api.mjs
 */
export async function classifyImage(image) {
  if (!configuredGeminiKeys().length) {
    throw new ApiError(503, 'Vision service is not configured. Ask the operator to set the server-side GEMINI_API_KEY.');
  }

  // 1 — Slice
  let quadrants;
  try {
    quadrants = await sliceIntoQuadrants(image.data);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(422, `Image preprocessing failed: ${err.message}`);
  }

  // 2 — Parallel Gemini calls (all 4 quadrants at once concurrently via Promise.all)
  //     withGeminiKey handles 429 rotation across the configured key pool.
  const quadrantResults = await Promise.all(
    quadrants.map(async ({ buffer, row, col }) => {
      const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
      try {
        const items = await withGeminiKey(apiKey => callGeminiQuadrant(buffer, apiKey, primaryModel), primaryModel);
        return { items, row, col };
      } catch (firstError) {
        const apiError = getApiCallError(firstError);
        const isTransientOrQuota = apiError?.statusCode === 503 || apiError?.statusCode === 429 ||
          firstError?.statusCode === 503 || firstError?.statusCode === 429;
        if (isTransientOrQuota && primaryModel !== 'gemini-3.6-flash') {
          console.warn(`[external-classifier] ${primaryModel} failed (${firstError.message}). Falling back to gemini-3.6-flash...`);
          try {
            const items = await withGeminiKey(apiKey => callGeminiQuadrant(buffer, apiKey, 'gemini-3.6-flash'), 'gemini-3.6-flash');
            return { items, row, col };
          } catch (fallbackError) {
            firstError = fallbackError;
          }
        }
        if (firstError instanceof ApiError) throw firstError;
        const finalApiError = getApiCallError(firstError);
        if (finalApiError?.statusCode === 429 || firstError?.statusCode === 429) {
          throw new ApiError(429, 'Vision provider quota exceeded. Retry later.');
        }
        if (firstError.name === 'TimeoutError' || firstError.name === 'AbortError') {
          throw new ApiError(504, 'Vision request timed out. Please retry.');
        }
        throw new ApiError(502, 'Vision provider is unavailable or rejected the request.');
      }
    })
  );

  // 3 — Stitch + flatten
  const stitched = [];
  for (const { items, row, col } of quadrantResults) {
    for (const raw of items) {
      const item = validateAndStitchItem(raw, row, col);
      if (item) stitched.push(item);
    }
  }

  // 4 — Attach IDs and routing metadata
  const detectedItems = stitched.map((item, idx) => ({
    id: idx + 1,
    item_name: item.label,
    category: item.category,
    bbox: item.bbox,
    binRouting: routing[item.category],
  }));

  const categoryCounts = detectedItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  const summaryParts = Object.entries(categoryCounts).map(([cat, n]) => `${n} ${cat}`);
  const frontendReport = detectedItems.length === 0
    ? 'No waste items detected in the scene.'
    : `Grid-tiling scan detected ${detectedItems.length} item(s): ${summaryParts.join(', ')}. `
      + `Review bin routing in the table. Hazardous items require specialised disposal.`;

  return {
    detectedItems,
    frontendReport,
    operationalSummary: frontendReport,
    coordinateSystem: {
      range: [0, 1000],
      order: ['ymin', 'xmin', 'ymax', 'xmax'],
      reference: 'entire image (stitched from 2×2 grid)',
      calibratedForRobotics: false,
    },
  };
}
