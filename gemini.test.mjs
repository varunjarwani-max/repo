import { test } from 'node:test';
import assert from 'node:assert/strict';
import analyse from './api/analyse.mjs';

async function invoke({ method = 'POST', headers = {}, body = {} } = {}) {
  const req = { method, headers: { host: 'localhost:3000', 'content-type': 'application/json', ...headers }, body, socket: { remoteAddress: '127.0.0.1' } };
  let response;
  const res = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { response = { status: this.statusCode, headers: this.headers, body: JSON.parse(value) }; } };
  await analyse(req, res);
  return response;
}

await test('Gemini analysis endpoint validates inputs and never fabricates fallback items', async t => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  try {
    delete process.env.GEMINI_API_KEY;
    await t.test('rejects unsupported methods', async () => {
      const result = await invoke({ method: 'GET' });
      assert.equal(result.status, 405);
      assert.equal(result.headers.Allow, 'POST');
    });
    await t.test('reports missing server key without demo data', async () => {
      const result = await invoke();
      assert.equal(result.status, 503);
      assert.match(result.body.error, /GEMINI_API_KEY/);
      assert.equal(result.body.items, undefined);
    });
    await t.test('rejects cross-origin requests', async () => {
      assert.equal((await invoke({ headers: { origin: 'https://untrusted.example' } })).status, 403);
    });
    process.env.GEMINI_API_KEY = 'test-only-placeholder';
    await t.test('rejects invalid images and oversized requests', async () => {
      assert.equal((await invoke({ body: { image: 'not-a-jpeg', imageWidth: 640, imageHeight: 480 } })).status, 400);
      assert.equal((await invoke({ headers: { 'content-length': '5000000' } })).status, 413);
    });
    const body = { image: Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString('base64'), imageWidth: 640, imageHeight: 480 };
    const providerResponse = items => new Response(JSON.stringify({
      candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({ items }) }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10, totalTokenCount: 20 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    await t.test('returns only validated model detections and box-derived previews', async () => {
      globalThis.fetch = async () => providerResponse([{ label: 'Test bottle', material: 'PET', category: 'recyclable', confidence: 0.82, weightGrams: 20, whyReason: 'Test fixture', actionRequired: 'Rinse and keep dry', bbox: { x: 0.8, y: 0.7, width: 0.3, height: 0.4 } }]);
      const result = await invoke({ body });
      assert.equal(result.status, 200);
      assert.equal(result.body.source, 'live');
      assert.equal(result.body.imageWidth, 640);
      assert.equal(result.body.items.length, 1);
      assert.equal(result.body.items[0].label, 'Test bottle');
      assert.equal(result.body.items[0].estimatedValueInr, null);
      assert.equal(result.body.items[0].isHazardous, false);
      assert.equal(result.body.items[0].bbox.x + result.body.items[0].bbox.width, 1);
      assert.equal(result.body.items[0].bbox.y + result.body.items[0].bbox.height, 1);
      assert.equal(result.body.items[0].polygon.length, 4);
      assert.match(result.body.scanId, /^[a-f0-9-]{36}$/);
    });
    await t.test('keeps an empty model response empty', async () => {
      globalThis.fetch = async () => providerResponse([]);
      const result = await invoke({ body });
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.items, []);
    });
    await t.test('reports provider failure without fallback detections', async () => {
      globalThis.fetch = async () => { throw new Error('Test provider unavailable'); };
      const result = await invoke({ body });
      assert.equal(result.status, 502);
      assert.equal(result.body.items, undefined);
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});
