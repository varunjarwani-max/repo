import { APICallError } from 'ai';

export function configuredGeminiKeys() {
  return [...new Set([process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP].map(key => key?.trim()).filter(Boolean))];
}

function cooldownDuration(error, now) {
  const retryAfter = error.responseHeaders?.['retry-after'];
  if (!retryAfter) return 60_000;
  const seconds = Number(retryAfter);
  const duration = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - now;
  return Number.isFinite(duration) ? Math.max(1000, duration) : 60_000;
}

export function getApiCallError(error) {
  if (APICallError.isInstance(error)) return error;
  if (error && error.lastError && APICallError.isInstance(error.lastError)) return error.lastError;
  if (error && Array.isArray(error.errors)) {
    const found = error.errors.find(e => APICallError.isInstance(e));
    if (found) return found;
  }
  return null;
}

export function createGeminiKeyFailover({ getKeys = configuredGeminiKeys, now = Date.now } = {}) {
  const cooldowns = new Map();
  return async function withGeminiKey(operation) {
    const keys = [...new Set(getKeys())];
    for (const key of cooldowns.keys()) if (!keys.includes(key)) cooldowns.delete(key);
    let quotaError;
    for (const key of keys) {
      if ((cooldowns.get(key) || 0) > now()) continue;
      try {
        const result = await operation(key);
        cooldowns.delete(key);
        return result;
      } catch (error) {
        const apiError = getApiCallError(error);
        if (!apiError || apiError.statusCode !== 429) throw error;
        quotaError = apiError;
        cooldowns.set(key, now() + cooldownDuration(apiError, now()));
      }
    }
    if (quotaError) throw quotaError;
    if (!keys.length) throw new Error('Gemini API keys are not configured.');
    throw new APICallError({
      message: 'All configured Gemini keys are temporarily quota-limited.',
      url: 'https://generativelanguage.googleapis.com', requestBodyValues: {},
      statusCode: 429, isRetryable: false,
    });
  };
}

export const withGeminiKey = createGeminiKeyFailover();
