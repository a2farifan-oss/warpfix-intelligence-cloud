const { logger } = require('../utils/logger');

// Groq/Llama models sometimes wrap structured answers in markdown fences or
// surrounding prose (e.g. "Here's the JSON: ```json {...} ```"). Many agents
// JSON.parse the result directly, so normalize to the embedded JSON when the
// extracted candidate is valid JSON. Plain prose is returned unchanged.
function sanitizeLLMText(content) {
  if (!content || typeof content !== 'string') return content;
  let t = content.trim();

  const fence = t.match(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)```/);
  if (fence && fence[1].trim()) {
    t = fence[1].trim();
  }

  try {
    JSON.parse(t);
    return t;
  } catch (_) { /* not pure JSON; try to extract a balanced object/array */ }

  const start = t.search(/[{[]/);
  if (start !== -1) {
    const close = t[start] === '{' ? '}' : ']';
    const end = t.lastIndexOf(close);
    if (end > start) {
      const candidate = t.slice(start, end + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch (_) { /* leave as-is */ }
    }
  }

  return t;
}

function mockResponse() {
  return JSON.stringify({
    errorMessage: 'Mock LLM response - configure an LLM provider',
    stackTrace: '',
    rootCause: 'LLM not configured',
    affectedFiles: [],
    type: 'unknown',
    summary: 'LLM not configured',
    severity: 'medium',
  });
}

async function callGroq({ system, user, maxTokens }) {
  const apiKey = process.env.GROQ_API_KEY;
  const apiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('LLM API error', { provider: 'groq', status: response.status, error });
    throw new Error(`LLM API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) {
    logger.warn('LLM returned empty response', { provider: 'groq', data });
  }
  return sanitizeLLMText(text);
}

// GitHub Models (https://models.github.ai/inference) is OpenAI-compatible and
// free with a GitHub token — used as a fallback so a single provider's daily
// cap can't stall repairs. Default model gpt-4o-mini is strong at code fixes.
async function callGitHubModels({ system, user, maxTokens }) {
  const apiKey = process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN;
  const apiUrl = process.env.GITHUB_MODELS_API_URL || 'https://models.github.ai/inference';
  const model = process.env.GITHUB_MODELS_MODEL || 'openai/gpt-4o-mini';

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('LLM API error', { provider: 'github', status: response.status, error });
    throw new Error(`LLM API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) {
    logger.warn('LLM returned empty response', { provider: 'github', data });
  }
  return sanitizeLLMText(text);
}

// Hugging Face Inference Providers expose an OpenAI-compatible router at
// https://router.huggingface.co/v1, so the same chat/completions shape used by
// Groq/GitHub Models works unchanged. We register it twice with different keys:
// `hf` uses a PRO/paid key (HUGGINGFACE_API_KEY) and `hffree` uses a free key
// (HUGGINGFACE_API_KEY_FREE) — so when the paid monthly credits are exhausted
// the chain falls through to the free key automatically, at $0.
async function callHuggingFaceWith(apiKey, providerLabel, { system, user, maxTokens }) {
  const apiUrl = process.env.HUGGINGFACE_API_URL || 'https://router.huggingface.co/v1';
  const model = process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2.5-Coder-32B-Instruct';

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('LLM API error', { provider: providerLabel, status: response.status, error });
    const e = new Error(`LLM API error: ${response.status} - ${error}`);
    e.status = response.status;
    throw e;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) {
    logger.warn('LLM returned empty response', { provider: providerLabel, data });
  }
  return sanitizeLLMText(text);
}

function callHuggingFace(args) {
  return callHuggingFaceWith(process.env.HUGGINGFACE_API_KEY, 'huggingface', args);
}

function callHuggingFaceFree(args) {
  const key = process.env.HUGGINGFACE_API_KEY_FREE || process.env.HUGGINGFACE_API_KEY;
  return callHuggingFaceWith(key, 'huggingface_free', args);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Parse the "try again in 1.63s" / "try again in 2h4m43.968s" hint Groq returns
// on rate limits; fall back to exponential backoff when no hint is present.
function retryDelayMs(errMessage, attempt) {
  const m = /try again in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i.exec(errMessage || '');
  if (m) {
    const ms = ((parseInt(m[1], 10) || 0) * 3600 + (parseInt(m[2], 10) || 0) * 60 + parseFloat(m[3])) * 1000;
    return Math.ceil(ms) + 250;
  }
  return Math.min(8000, 500 * 2 ** attempt);
}

// A per-day rate limit won't clear within an in-process backoff (providers
// report waits of minutes-to-hours), so retrying the same provider just spins
// doomed attempts. Treat it as a distinct condition: fall back to the next
// provider, and only surface to the worker if every provider is daily-capped.
function isDailyLimit(errMessage) {
  return /tokens per day|\bTPD\b|per day|per 86400/i.test(errMessage || '');
}

// A provider whose quota/credits are exhausted can't recover within an
// in-process backoff, so we treat it like a daily cap: stop retrying this
// provider and fall through to the next one in the chain. Covers Groq's
// per-day cap and Hugging Face's monthly-credit exhaustion (HTTP 402 /
// "exceeded your monthly included credits"), so once the paid HF key runs out
// the chain drops to the free HF key (or GitHub) instead of failing.
function isQuotaExhausted(errMessage) {
  return isDailyLimit(errMessage)
    || /\b402\b|payment required|monthly.*credit|exceeded.*credit|insufficient.*(?:credit|balance|quota)|quota.*exceeded/i.test(errMessage || '');
}

const PROVIDER_FNS = {
  groq: callGroq,
  github: callGitHubModels,
  hf: callHuggingFace,
  hffree: callHuggingFaceFree,
};

function providerHasKey(provider) {
  if (provider === 'groq') return !!process.env.GROQ_API_KEY;
  if (provider === 'github') return !!(process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN);
  if (provider === 'hf') return !!process.env.HUGGINGFACE_API_KEY;
  if (provider === 'hffree') return !!(process.env.HUGGINGFACE_API_KEY_FREE || process.env.HUGGINGFACE_API_KEY);
  return false;
}

// Run a single provider with in-process retry/backoff for transient rate limits.
// Throws err.code='LLM_DAILY_LIMIT' immediately on a per-day cap (non-retryable).
async function callOneProvider(provider, { system, user, maxTokens }) {
  const maxAttempts = parseInt(process.env.LLM_MAX_RETRIES, 10) || 4;
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await PROVIDER_FNS[provider]({ system, user, maxTokens });
    } catch (err) {
      lastErr = err;
      const isRateLimit = /\b429\b/.test(err.message) || /rate limit/i.test(err.message);
      // Per-day cap or exhausted paid credits → non-retryable; fall through to
      // the next provider in the chain (e.g. paid HF → free HF → github).
      if (isQuotaExhausted(err.message)) {
        err.code = 'LLM_DAILY_LIMIT';
        throw err;
      }
      if (isRateLimit && attempt < maxAttempts - 1) {
        const delay = retryDelayMs(err.message, attempt);
        logger.warn('LLM rate limited, backing off', { provider, attempt: attempt + 1, delay });
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// LLM_PROVIDER may be a comma-separated fallback chain, e.g. "groq,github".
// Each provider is tried in order; a daily cap (or hard failure) on one falls
// through to the next free provider so repairs keep working at $0.
// `skipProviders` lets a caller exclude providers that already produced a patch
// which failed sandbox verification, so a regeneration tries a DIFFERENT model.
// `_meta` (if passed) is populated with `.provider` = the provider that answered,
// so the caller can track which models it has already tried.
async function callLLM({
  system, user, maxTokens = 2000, skipProviders = [], _meta,
}) {
  const defaultChain = process.env.GROQ_API_KEY ? 'groq' : 'github';
  const skip = new Set((skipProviders || []).map((s) => String(s).toLowerCase()));
  const chain = (process.env.LLM_PROVIDER || defaultChain)
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter((p) => PROVIDER_FNS[p] && !skip.has(p));

  const available = chain.filter(providerHasKey);
  if (available.length === 0) {
    logger.warn(`No API key for LLM chain [${chain.join(',') || 'none'}], returning mock response`);
    return mockResponse();
  }

  let lastErr;
  let allDaily = true;
  for (const provider of available) {
    try {
      const out = await callOneProvider(provider, { system, user, maxTokens });
      if (provider !== available[0]) {
        logger.info('LLM fallback provider succeeded', { provider });
      }
      if (_meta) _meta.provider = provider;
      return out;
    } catch (err) {
      lastErr = err;
      if (err.code !== 'LLM_DAILY_LIMIT') allDaily = false;
      logger.warn('LLM provider failed, trying next in chain', {
        provider, error: err.message, code: err.code,
      });
    }
  }

  // Every provider failed. If all failed on a per-day cap, mark non-retryable so
  // the worker skips cleanly instead of burning BullMQ attempts.
  if (allDaily && lastErr) lastErr.code = 'LLM_DAILY_LIMIT';
  logger.error('All LLM providers failed', { chain: available.join(','), error: lastErr?.message });
  throw lastErr;
}

module.exports = {
  callLLM,
  // Exported for unit tests / introspection.
  PROVIDER_FNS,
  providerHasKey,
  isQuotaExhausted,
};
