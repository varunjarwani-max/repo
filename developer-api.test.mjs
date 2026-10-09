import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { KeyStore } from './backend/key-store.mjs';
import { createDeveloperApi } from './backend/developer-api.mjs';
import { parseWasteResponse, validateImage, classifyImage } from './backend/external-classifier.mjs';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const modelText = '### BACKEND_DATA\nBottle|Recyclable|100|200|500|600\nBattery|Hazardous|500|600|800|900\n### FRONTEND_REPORT\nMixed plastic and battery waste. High hazard: isolate the battery. Route the bottle to recycling.';

test('external developer API contracts, persistence and protection', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'eco-api-test-'));
  const filename = path.join(directory, 'api_keys.json');
  const store = new KeyStore(filename);
  const previousAdmin = process.env.ECO_ADMIN_SECRET;
  const previousVercel = process.env.VERCEL;
  process.env.ECO_ADMIN_SECRET = 'test-operator-secret';
  delete process.env.VERCEL;
  let calls = 0;
  let fail = false;
  const app = createDeveloperApi({ store, classify: async () => { calls++; if (fail) throw new Error('private-provider-details'); return parseWasteResponse(modelText); } });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const adminHeaders = { 'x-admin-key': 'test-operator-secret', 'Content-Type': 'application/json' };
  const request = async (pathname, init = {}) => { const response = await fetch(url + pathname, init); return { status: response.status, body: await response.json() }; };
  let issued;
  const imageBody = JSON.stringify({ imageBase64: jpeg.toString('base64') });
  try {
    await t.test('management is operator-protected and rejects cross-origin requests', async () => {
      assert.equal((await request('/api/keys')).status, 401);
      assert.equal((await request('/api/keys', { headers: { ...adminHeaders, origin: 'https://evil.example' } })).status, 403);
    });
    await t.test('allows cross-origin developer clients without opening key management', async () => {
      const response = await fetch(url + '/api/v1/classify-external', { method: 'OPTIONS', headers: { origin: 'https://robotics.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'x-api-key' } });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), '*');
      assert.match(response.headers.get('access-control-allow-headers'), /x-api-key/);
    });
    await t.test('issues secure keys with metadata, storing hashes only', async () => {
      const response = await request('/api/keys/generate', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ label: 'Robotics' }) });
      assert.equal(response.status, 201); issued = response.body;
      assert.match(issued.key, /^eco_live_[a-f0-9]{48}$/);
      assert.equal(issued.label, 'Robotics'); assert.equal(issued.requestCount, 0);
      const stored = await readFile(filename, 'utf8');
      assert.ok(!stored.includes(issued.key)); assert.match(stored, /keyHash/);
      const list = await request('/api/keys', { headers: adminHeaders });
      assert.equal(list.body.keys[0].key, undefined); assert.equal(list.body.keys[0].keyHash, undefined);
      assert.equal((await new KeyStore(filename).authenticate(issued.key)).id, issued.id);
    });
    await t.test('validates labels and expiry', async () => {
      for (const body of [{ label: 123 }, { label: ' ' }, { expiresAt: 'yesterday' }, { expiresAt: '2020-01-01' }]) assert.equal((await request('/api/keys/generate', { method: 'POST', headers: adminHeaders, body: JSON.stringify(body) })).status, 400);
    });
    await t.test('rejects missing and invalid keys before inference', async () => {
      assert.equal((await request('/api/v1/classify-external', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: imageBody })).status, 401);
      assert.equal((await request('/api/v1/classify-external', { method: 'POST', headers: { 'x-api-key': 'wrong' } })).status, 401);
      assert.equal(calls, 0);
    });
    await t.test('returns standardized JSON for JSON and multipart, counting successful calls', async () => {
      const first = await request('/api/v1/classify-external', { method: 'POST', headers: { 'x-api-key': issued.key, 'Content-Type': 'application/json' }, body: imageBody });
      assert.equal(first.status, 200); assert.equal(first.body.result.detectedItems.length, 2);
      assert.equal(first.body.result.detectedItems[0].binRouting.bin, 'Blue recycling bin');
      assert.equal(first.body.result.detectedItems[1].category, 'Hazardous');
      assert.equal(first.body.result.raw, undefined);
      const form = new FormData(); form.append('image', new Blob([jpeg], { type: 'image/jpeg' }), 'waste.jpg');
      assert.equal((await request('/api/v1/classify-external', { method: 'POST', headers: { Authorization: `Bearer ${issued.key}` }, body: form })).status, 200);
      assert.equal((await store.list())[0].requestCount, 2);
    });
    await t.test('rejects bad MIME, malformed JSON and oversized images without usage', async () => {
      const headers = { 'x-api-key': issued.key, 'Content-Type': 'application/json' };
      for (const body of ['{', JSON.stringify({ imageBase64: 'nonsense!' }), JSON.stringify({ imageBase64: jpeg.toString('base64'), mimeType: 'image/png' })]) assert.ok([400, 415].includes((await request('/api/v1/classify-external', { method: 'POST', headers, body })).status));
      const form = new FormData(); form.append('image', new Blob([Buffer.alloc(8 * 1024 * 1024 + 1)], { type: 'image/jpeg' }), 'large.jpg');
      assert.equal((await request('/api/v1/classify-external', { method: 'POST', headers: { 'x-api-key': issued.key }, body: form })).status, 413);
      assert.equal((await store.list())[0].requestCount, 2);
    });
    await t.test('provider errors do not leak details or increase usage', async () => {
      fail = true;
      const result = await request('/api/v1/classify-external', { method: 'POST', headers: { 'x-api-key': issued.key, 'Content-Type': 'application/json' }, body: imageBody });
      assert.equal(result.status, 503); assert.ok(!JSON.stringify(result.body).includes('private-provider-details'));
      assert.equal((await store.list())[0].requestCount, 2); fail = false;
    });
    await t.test('revokes immediately and rejects expired keys', async () => {
      assert.equal((await request(`/api/keys/${issued.id}/revoke`, { method: 'POST', headers: adminHeaders })).status, 200);
      const revoked = await request('/api/v1/classify-external', { method: 'POST', headers: { 'x-api-key': issued.key, 'Content-Type': 'application/json' }, body: imageBody });
      assert.equal(revoked.status, 401); assert.match(revoked.body.error, /revoked/);
      const expired = await store.generate('expired', '2000-01-01T00:00:00.000Z');
      await assert.rejects(store.authenticate(expired.key), /expired/);
    });
    await t.test('serializes concurrent writes without losing counters', async () => {
      const key = await store.generate('parallel');
      await Promise.all(Array.from({ length: 20 }, () => store.increment(key.id)));
      assert.equal((await store.list()).find(record => record.id === key.id).requestCount, 20);
    });
    await t.test('limits authenticated classification calls per key', async () => {
      const key = await store.generate('rate test');
      for (let i = 0; i < 10; i++) assert.equal((await request('/api/v1/classify-external', { method: 'POST', headers: { 'x-api-key': key.key, 'Content-Type': 'application/json' }, body: imageBody })).status, 200);
      assert.equal((await request('/api/v1/classify-external', { method: 'POST', headers: { 'x-api-key': key.key, 'Content-Type': 'application/json' }, body: imageBody })).status, 429);
    });
    await t.test('fails closed on serverless instead of issuing nonpersistent keys', async () => {
      process.env.VERCEL = '1';
      assert.equal((await request('/api/keys/generate', { method: 'POST', headers: adminHeaders, body: '{}' })).status, 503);
    });
  } finally {
    server.close(); await once(server, 'close');
    await rm(directory, { recursive: true, force: true });
    if (previousAdmin === undefined) delete process.env.ECO_ADMIN_SECRET; else process.env.ECO_ADMIN_SECRET = previousAdmin;
    if (previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel;
  }
});

test('parser validates ranges, categories, empty scenes, and report format', () => {
  assert.equal(parseWasteResponse(modelText).detectedItems.length, 2);
  assert.deepEqual(parseWasteResponse('### BACKEND_DATA\n\n### FRONTEND_REPORT\nNo waste visible.').detectedItems, []);
  for (const text of [modelText.replace('|900', '|1001'), modelText.replace('Recyclable', 'Unknown'), modelText.replace('Recyclable', '__proto__'), modelText.replace('|100|200|500|600', '|500|200|100|600'), 'invalid response']) assert.throws(() => parseWasteResponse(text));
  assert.equal(validateImage({ imageBase64: `data:image/jpeg;base64,${jpeg.toString('base64')}` }).mimeType, 'image/jpeg');
});

test('classification uses the real provider adapter with private system instructions', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousBackup = process.env.GEMINI_API_KEY_BACKUP;
  const previousFetch = globalThis.fetch;
  try {
    delete process.env.GEMINI_API_KEY_BACKUP;
    delete process.env.GEMINI_API_KEY;
    await assert.rejects(classifyImage({ data: jpeg, mimeType: 'image/jpeg' }), /not configured/);
    process.env.GEMINI_API_KEY = 'test-only';
    globalThis.fetch = async (url, init) => {
      assert.match(String(url), /generativelanguage.googleapis.com/);
      const payload = JSON.parse(init.body);
      assert.match(JSON.stringify(payload.systemInstruction), /BACKEND_DATA/);
      return new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: modelText }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    assert.equal((await classifyImage({ data: jpeg, mimeType: 'image/jpeg' })).detectedItems.length, 2);
  } finally {
    if (previousBackup === undefined) delete process.env.GEMINI_API_KEY_BACKUP;
    else process.env.GEMINI_API_KEY_BACKUP = previousBackup;
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
  }
});
