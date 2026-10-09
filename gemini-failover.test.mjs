import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APICallError } from 'ai';
import { createGeminiKeyFailover, configuredGeminiKeys } from './backend/gemini-key-failover.mjs';
import { classifyImage } from './backend/external-classifier.mjs';
import analyse from './api/analyse.mjs';

const quota = headers => new APICallError({ message: 'Quota exhausted', url: 'https://example.test', requestBodyValues: {}, statusCode: 429, responseHeaders: headers });

test('quota failover cools down primary, uses backup, then recovers primary', async () => {
  let clock = 1000;
  const run = createGeminiKeyFailover({ getKeys: () => ['first', 'second'], now: () => clock });
  const attempts = [];
  assert.equal(await run(async key => { attempts.push(key); if (key === 'first') throw quota({ 'retry-after': '120' }); return 'backup result'; }), 'backup result');
  assert.deepEqual(attempts, ['first', 'second']);
  clock += 60_000;
  assert.equal(await run(async key => key), 'second');
  clock += 60_000;
  assert.equal(await run(async key => key), 'first');
});

test('all exhausted keys return 429 without repeated requests or unbounded retries', async () => {
  let clock = 1000;
  let calls = 0;
  const run = createGeminiKeyFailover({ getKeys: () => ['first', 'second'], now: () => clock });
  const operation = async () => { calls++; throw quota(); };
  await assert.rejects(run(operation), error => error.statusCode === 429);
  assert.equal(calls, 2);
  await assert.rejects(run(operation), error => error.statusCode === 429);
  assert.equal(calls, 2);
  clock += 60_000;
  await assert.rejects(run(operation), error => error.statusCode === 429);
  assert.equal(calls, 4);
});

test('non-quota errors never swap keys', async () => {
  for (const statusCode of [400, 401, 403, 500, undefined]) {
    const run = createGeminiKeyFailover({ getKeys: () => ['first', 'second'] });
    let calls = 0;
    const failure = statusCode ? new APICallError({ message: 'Rejected', url: 'https://example.test', requestBodyValues: {}, statusCode }) : new Error('Network or timeout');
    await assert.rejects(run(async () => { calls++; throw failure; }), error => error === failure);
    assert.equal(calls, 1);
  }
});

test('single and duplicate keys are attempted only once; changed configuration clears cooldowns', async () => {
  let keys = ['first', 'first'];
  const run = createGeminiKeyFailover({ getKeys: () => keys });
  let calls = 0;
  await assert.rejects(run(async () => { calls++; throw quota(); }), error => error.statusCode === 429);
  assert.equal(calls, 1);
  keys = ['new-key'];
  assert.equal(await run(async key => key), 'new-key');
  keys = ['first'];
  assert.equal(await run(async key => key), 'first');
  keys = [];
  await assert.rejects(run(async () => assert.fail('must not call provider')), /not configured/);
});

test('HTTP date Retry-After is respected', async () => {
  let clock = Date.parse('2026-10-09T12:00:00Z');
  const run = createGeminiKeyFailover({ getKeys: () => ['first', 'second'], now: () => clock });
  await run(async key => { if (key === 'first') throw quota({ 'retry-after': 'Fri, 09 Oct 2026 12:02:00 GMT' }); return key; });
  clock += 119_000;
  assert.equal(await run(async key => key), 'second');
  clock += 1000;
  assert.equal(await run(async key => key), 'first');
});

test('both classification endpoints use backup through the real Gemini adapter', async t => {
  const previousFetch = globalThis.fetch;
  const previousKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP];
  const response = text => new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10 } }), { headers: { 'content-type': 'application/json' } });
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  try {
    process.env.GEMINI_API_KEY = ' first ';
    process.env.GEMINI_API_KEY_BACKUP = 'first';
    assert.deepEqual(configuredGeminiKeys(), ['first']);
    delete process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY_BACKUP = 'second';
    assert.deepEqual(configuredGeminiKeys(), ['second']);
    for (const endpoint of ['external', 'scan']) {
      await t.test(endpoint, async () => {
        process.env.GEMINI_API_KEY = `${endpoint}-primary`;
        process.env.GEMINI_API_KEY_BACKUP = `${endpoint}-backup`;
        const attempts = [];
        globalThis.fetch = async (url, init) => {
          const key = new Headers(init.headers).get('x-goog-api-key');
          attempts.push(key);
          if (key === `${endpoint}-primary`) return new Response(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exhausted' } }), { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '60' } });
          assert.equal(key, `${endpoint}-backup`);
          return response(endpoint === 'scan' ? '{"items":[]}' : '### BACKEND_DATA\n\n### FRONTEND_REPORT\nNo visible waste.');
        };
        if (endpoint === 'external') {
          assert.deepEqual((await classifyImage({ data: jpeg, mimeType: 'image/jpeg' })).detectedItems, []);
        } else {
          let result;
          const res = { setHeader() {}, end(text) { result = JSON.parse(text); }, statusCode: 200 };
          await analyse({ method: 'POST', headers: { host: 'localhost:3000', 'content-type': 'application/json' }, body: { image: jpeg.toString('base64'), imageWidth: 640, imageHeight: 480 }, socket: { remoteAddress: 'failover-test' } }, res);
          assert.equal(res.statusCode, 200);
          assert.deepEqual(result.items, []);
        }
        assert.deepEqual(attempts, [`${endpoint}-primary`, `${endpoint}-backup`]);
      });
    }
  } finally {
    globalThis.fetch = previousFetch;
    for (const [index, name] of ['GEMINI_API_KEY', 'GEMINI_API_KEY_BACKUP'].entries()) {
      if (previousKeys[index] === undefined) delete process.env[name]; else process.env[name] = previousKeys[index];
    }
  }
});
