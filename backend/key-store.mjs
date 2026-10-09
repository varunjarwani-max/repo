import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

export const hashKey = key => createHash('sha256').update(key).digest('hex');
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export class KeyStore {
  constructor(filename = path.resolve('data/api_keys.json')) {
    this.filename = filename;
    this.queue = Promise.resolve();
  }
  async read() {
    try {
      const keys = JSON.parse(await readFile(this.filename, 'utf8'));
      if (!Array.isArray(keys)) throw new Error('Invalid key store');
      return keys;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new ApiError(503, 'Key storage is unavailable. Check the server data directory.');
    }
  }
  transaction(operation) {
    const task = this.queue.then(async () => {
      const keys = await this.read();
      const result = await operation(keys);
      await mkdir(path.dirname(this.filename), { recursive: true, mode: 0o700 });
      const temporary = `${this.filename}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(keys, null, 2), { mode: 0o600 });
      await rename(temporary, this.filename);
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }
  publicKey(key) {
    const { keyHash, ...metadata } = key;
    return { ...metadata, status: key.status === 'active' && key.expiresAt && Date.parse(key.expiresAt) <= Date.now() ? 'expired' : key.status };
  }
  async list() { await this.queue; return (await this.read()).map(key => this.publicKey(key)); }
  async generate(label, expiresAt = null) {
    const secret = `eco_live_${randomBytes(24).toString('hex')}`;
    const record = { id: randomUUID(), label, keyHash: hashKey(secret), maskedKey: `eco_live_••••${secret.slice(-4)}`, createdAt: new Date().toISOString(), expiresAt, requestCount: 0, status: 'active' };
    await this.transaction(keys => { keys.push(record); });
    return { ...this.publicKey(record), key: secret };
  }
  async authenticate(secret) {
    if (!/^eco_live_[a-f0-9]{48}$/.test(secret || '')) throw new ApiError(401, 'Missing or invalid API key. Send x-api-key or Authorization: Bearer <key>.');
    await this.queue;
    const key = (await this.read()).find(key => key.keyHash === hashKey(secret));
    if (!key) throw new ApiError(401, 'Invalid API key.');
    if (key.status !== 'active') throw new ApiError(401, 'This API key has been revoked.');
    if (key.expiresAt && Date.parse(key.expiresAt) <= Date.now()) throw new ApiError(401, 'This API key has expired. Generate a new key.');
    return key;
  }
  revoke(id) {
    return this.transaction(keys => {
      const key = keys.find(key => key.id === id);
      if (!key) throw new ApiError(404, 'API key not found.');
      key.status = 'revoked';
      return this.publicKey(key);
    });
  }
  increment(id) {
    return this.transaction(keys => {
      const key = keys.find(key => key.id === id);
      if (!key || key.status !== 'active' || (key.expiresAt && Date.parse(key.expiresAt) <= Date.now())) throw new ApiError(401, 'API key is no longer active.');
      key.requestCount += 1;
    });
  }
}
export const keyStore = new KeyStore();
