// EcoScan AWS Backend Server (Node.js / Express)
// Serves the EcoScan web application and securely proxies Gemini 3.8 Flash Vision API calls.
// The GEMINI_API_KEY is stored only in the server environment (or .env), NEVER in public client code.

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'node:fs';
import developerApi from './backend/developer-api.mjs';
import analyse from './api/analyse.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Multi-Key Configuration & Dynamic Swap Pool
// Accepts GEMINI_API_KEYS (comma-separated: key1,key2,key3) or individual keys (GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3)
function getApiKeys() {
  const keys = [];
  if (process.env.GEMINI_API_KEYS) {
    keys.push(...process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean));
  }
  if (process.env.GEMINI_API_KEY) {
    keys.push(...process.env.GEMINI_API_KEY.split(',').map(k => k.trim()).filter(Boolean));
  }
  ['GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3'].forEach(envName => {
    if (process.env[envName]) {
      keys.push(process.env[envName].trim());
    }
  });

  // Deduplicate keys preserving order
  return [...new Set(keys)];
}

let activeKeyIndex = 0;

function getActiveKey() {
  const keys = getApiKeys();
  if (keys.length === 0) return null;
  return keys[activeKeyIndex % keys.length];
}

function rotateToNextKey() {
  const keys = getApiKeys();
  if (keys.length <= 1) return activeKeyIndex;
  activeKeyIndex = (activeKeyIndex + 1) % keys.length;
  console.log(`[API Key Swap] Swapped to API Key index ${activeKeyIndex + 1} of ${keys.length}`);
  return activeKeyIndex;
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000');
  next();
});
app.use(developerApi);
app.use(express.json({ limit: '15mb' }));
app.post('/api/analyse', (req, res) => void analyse(req, res));

// Only built public assets may be served; source and data/api_keys.json must never be exposed.
const frontendDirectory = path.join(__dirname, 'dist');
app.use(express.static(frontendDirectory));

/**
 * Health check endpoint for AWS Load Balancer (ALB) / ECS / Elastic Beanstalk
 */
app.get('/api/health', (req, res) => {
  const keys = getApiKeys();
  res.json({
    status: 'ok',
    configuredKeysCount: keys.length,
    activeKeyIndex: keys.length > 0 ? (activeKeyIndex % keys.length) + 1 : 0,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/classify
 * Accepts { imageBase64: string } from the camera or file upload
 * Calls Google Gemini 3.8 Flash Vision securely from the server
 */
app.post('/api/classify', async (req, res) => {
  try {
    const startTime = Date.now();
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 field is required' });
    }

    const keys = getApiKeys();

  // Check if API keys are configured on the server
  if (keys.length === 0) {
    return res.status(503).json({
      error: 'No Gemini API keys configured. Set GEMINI_API_KEYS (comma separated) or GEMINI_API_KEY / GEMINI_API_KEY_1 / GEMINI_API_KEY_2 / GEMINI_API_KEY_3 in server environment variables or .env file.'
    });
  }

  const prompt = `You are an expert waste classification and computer vision engine. Analyze the entire input image to detect waste items, piles, and litter.

Strict output requirements:
- Do not output JSON, markdown code fences, conversational greetings, or closing remarks.
- Provide output strictly divided into two sections using exact headers: "### BACKEND_DATA" and "### FRONTEND_REPORT".
- Normalize all bounding box coordinates to integers between 0 and 1000: [ymin, xmin, ymax, xmax] relative to image height and width.

Allowed Categories:
- Recyclable (Plastics, Metals, Paper, Cardboard, Clean Glass)
- Organic (Food scraps, Yard waste, Biodegradable)
- Hazardous (Batteries, E-waste, Chemicals, Medical)
- Non-Recyclable (Mixed residual waste, Multi-layer packaging, Debris)

Output format structure:

### BACKEND_DATA
[item_name]|[category]|[ymin]|[xmin]|[ymax]|[xmax]

(Rules for BACKEND_DATA:
1. One detected object per line.
2. Separate exactly 6 fields using a single pipe character (|).
3. Do not include column header rows or extra spaces around the pipes.
4. Ensure ymin < ymax and xmin < xmax.)

### FRONTEND_REPORT
[Provide a concise 3-4 sentence operational summary:
- Primary waste composition and notable detected materials.
- Contamination or hazard level (Low/Medium/High) with clear rationale.
- Actionable site status: Recommended bin routing or required remediation priority.]`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: 2048
    }
  };

  /**
   * Parses the pipe-delimited BACKEND_DATA and FRONTEND_REPORT from Gemini's text response.
   * Returns { detectedItems: Array, frontendReport: string }
   */
  function parseWasteDetectionResponse(rawText) {
    const backendMatch = rawText.match(/###\s*BACKEND_DATA\s*\n([\s\S]*?)(?=###\s*FRONTEND_REPORT|$)/i);
    const frontendMatch = rawText.match(/###\s*FRONTEND_REPORT\s*\n([\s\S]*?)$/i);

    const detectedItems = [];
    if (backendMatch && backendMatch[1]) {
      const lines = backendMatch[1].trim().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split('|');
        if (parts.length !== 6) continue;
        const [item_name, category, yminStr, xminStr, ymaxStr, xmaxStr] = parts;
        const ymin = parseInt(yminStr, 10);
        const xmin = parseInt(xminStr, 10);
        const ymax = parseInt(ymaxStr, 10);
        const xmax = parseInt(xmaxStr, 10);
        if (isNaN(ymin) || isNaN(xmin) || isNaN(ymax) || isNaN(xmax)) continue;
        if (ymin >= ymax || xmin >= xmax) continue;
        detectedItems.push({
          item_name: item_name.trim(),
          category: category.trim(),
          bbox: { ymin, xmin, ymax, xmax }
        });
      }
    }

    const frontendReport = frontendMatch && frontendMatch[1]
      ? frontendMatch[1].trim()
      : 'Scene analyzed. No additional report available.';

    return { detectedItems, frontendReport };
  }

  // Try each key in succession until one succeeds or all configured keys fail
  const maxAttempts = keys.length;
  let lastErrorMessage = '';
  let usedKeyIndex = activeKeyIndex;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentKey = getActiveKey();
    usedKeyIndex = activeKeyIndex;

    try {
      const modelId = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${currentKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const status = response.status;
        const msg = errData?.error?.message || `HTTP ${status}: ${response.statusText}`;
        lastErrorMessage = msg;

        // Check if rate-limited, quota exceeded, or key disabled (HTTP 429, 403, 503, RESOURCE_EXHAUSTED)
        const isQuotaOrLimit = status === 429 ||
          status === 403 ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('quota') ||
          msg.includes('rate limit');

        if (isQuotaOrLimit && keys.length > 1 && attempt < maxAttempts - 1) {
          console.warn(`[API Key Limit Reached] Key #${usedKeyIndex + 1} exhausted (${msg}). Auto-swapping to next API key...`);
          rotateToNextKey();
          continue; // Retry with next key immediately
        }

        // If not a quota issue or all keys exhausted, throw
        throw new Error(`Gemini API Error (Key #${usedKeyIndex + 1}): ${msg}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('No content returned by Gemini vision model');
      }

      const { detectedItems, frontendReport } = parseWasteDetectionResponse(text);
      const totalMs = Date.now() - startTime;

      return res.json({
        success: true,
        source: 'gemini_vision_ai',
        activeKeyIndex: (usedKeyIndex % keys.length) + 1,
        totalKeys: keys.length,
        inference_latency_ms: totalMs,
        result: {
          detectedItems,
          frontendReport,
          raw: text
        }
      });

    } catch (err) {
      lastErrorMessage = err.message;
      if (attempt < maxAttempts - 1 && keys.length > 1) {
        console.warn(`[Auto-Swap Retry] Attempt ${attempt + 1} failed: ${err.message}. Trying next key...`);
        rotateToNextKey();
      } else {
        console.error('All configured Gemini API keys exhausted or failed:', lastErrorMessage);
        return res.status(502).json({
          error: `All ${keys.length} API keys exhausted: ${lastErrorMessage}`
        });
      }
    }
  }

  } catch (error) {
    console.error('Classification error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error processing vision classification'
    });
  }
});

/**
 * POST /api/chat
 * Accepts { message, detectedItems, frontendReport }
 * Provides context-aware AI waste sorting assistant answers
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, detectedItems = [], frontendReport = '' } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const keys = getApiKeys();
    const sceneContext = detectedItems.length > 0
      ? `Detected items in current scene: ${detectedItems.map(i => `${i.item_name} (${i.category})`).join(', ')}.\nOperational summary: ${frontendReport}`
      : `No visual scene has been scanned yet. Operational summary: ${frontendReport || 'General inquiry'}.`;

    const systemInstruction = `You are EcoScan AI, an expert waste segregation and recycling assistant for an AWS smart recycling system.
Provide concise, practical, encouraging advice (under 120 words) on how to sort, clean, or dispose of specific items.
Always adhere to EPA guidelines:
- Recyclable: Clean rigid plastics (#1, #2, #5), aluminum/steel cans, dry cardboard/paper, clean glass. Caps can stay on bottles if emptied.
- Organic: Food scraps, coffee grounds, greasy pizza boxes, yard trimmings.
- Hazardous: Lithium/rechargeable batteries, electronics, chemicals, motor oil. NEVER in curbside bins. Drop off at certified e-waste or hazmat depots. Tape battery terminals.
- Non-Recyclable: Soft plastic films/wrappers (unless grocery return), chip bags, Styrofoam, broken ceramics.
Current scene context:
${sceneContext}`;

    if (keys.length > 0) {
      const maxAttempts = keys.length;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const currentKey = getActiveKey();
        try {
          const modelId = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${currentKey}`;
          const contents = [
            {
              parts: [
                { text: `${systemInstruction}\n\nUser Question: ${message}` }
              ]
            }
          ];
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generationConfig: { temperature: 0.3, maxOutputTokens: 500 } })
          });

          if (!response.ok) {
            rotateToNextKey();
            continue;
          }

          const data = await response.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return res.json({ reply: reply.trim(), source: 'gemini_ai' });
          }
        } catch (e) {
          rotateToNextKey();
        }
      }
    }

    // Contextual fallback response if Gemini keys unavailable or exhausted
    const msgLower = message.toLowerCase();
    let reply = '';
    if (msgLower.includes('cap') || msgLower.includes('lid')) {
      reply = 'Plastic caps should generally be screwed tightly back onto plastic bottles before placing them in the Blue Recycling Bin. Empty all liquid completely first so the bottle can be compacted properly!';
    } else if (msgLower.includes('battery') || msgLower.includes('lithium') || msgLower.includes('hazard') || msgLower.includes('e-waste')) {
      reply = 'Lithium-ion and rechargeable batteries must NEVER be placed in curbside recycling or trash—they cause severe facility fires. Please tape the terminals with clear tape and drop them off at a local municipal e-waste depot or participating retail store (e.g. Best Buy, Home Depot).';
    } else if (msgLower.includes('pizza') || msgLower.includes('grease') || msgLower.includes('food')) {
      reply = 'Grease-soaked paper or pizza boxes cannot be recycled into new paper pulp. Tear off the clean top lid for the Blue Recycling Bin, and place the greasy bottom box into the Green Compost Bin or Landfill!';
    } else if (msgLower.includes('bag') || msgLower.includes('film') || msgLower.includes('soft plastic')) {
      reply = 'Plastic grocery bags and plastic wrap tangle sorting machinery at MRF facilities. Do NOT put them in curbside bins. Collect clean dry bags and drop them in grocery store plastic film collection bins.';
    } else if (detectedItems.length > 0) {
      const itemNames = detectedItems.map(i => i.item_name).join(', ');
      reply = `Based on your scanned scene (${itemNames}): Ensure all recyclable containers are rinsed and dry. Place items into their color-coded bins according to the table summary.`;
    } else {
      reply = 'Keep recyclables clean, dry, and empty! Blue is for Recyclables, Green for Compost, Gray for Landfill, and Orange for Hazardous materials. Let me know if you need specific advice for any material.';
    }

    return res.json({ reply, source: 'rule_taxonomy' });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: error.message || 'Chat service error' });
  }
});

// Fallback to index.html for single-page app routes
app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.get('*', (req, res) => {
  if (req.path.startsWith('/data') || req.path.startsWith('/backend') || req.path === '/server.js') return res.sendStatus(404);
  const index = path.join(frontendDirectory, 'index.html');
  if (!existsSync(index)) return res.status(503).send('Build the frontend with npm run build, or use npm run dev for local development.');
  res.sendFile(index);
});

app.listen(PORT, () => {
  const keys = getApiKeys();
  console.log(`=========================================`);
  console.log(`EcoScan Server running on port ${PORT}`);
  console.log(`Gemini API Keys in Swap Pool: ${keys.length} key(s) configured`);
  if (keys.length > 0) {
    console.log(`Auto-Failover Mechanism: ACTIVE (Swaps automatically on 429/quota limits)`);
  } else {
    console.warn(`WARNING: No GEMINI_API_KEYS configured! Set in .env or environment.`);
  }
  console.log(`Open in browser: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
