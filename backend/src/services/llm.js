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

async function callPageGrid({ system, user, maxTokens }) {
  const apiKey = process.env.PAGEGRID_API_KEY;
  const apiUrl = process.env.PAGEGRID_API_URL || 'https://api.pagegrid.in';
  const model = process.env.PAGEGRID_MODEL || 'claude-sonnet-4-6';

  const response = await fetch(`${apiUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      system,
      messages: [
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('LLM API error', { provider: 'pagegrid', status: response.status, error });
    throw new Error(`LLM API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  if (!text) {
    logger.warn('LLM returned empty response', { provider: 'pagegrid', data });
  }
  return text;
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

// A per-day (TPD) rate limit won't clear within an in-process backoff (Groq
// reports waits of minutes-to-hours), so retrying just spins doomed attempts and
// re-runs upstream LLM steps. Treat it as a distinct, non-retryable condition.
function isDailyLimit(errMessage) {
  return /tokens per day|\bTPD\b/i.test(errMessage || '');
}

async function callLLM({ system, user, maxTokens = 2000 }) {
  const provider = (
    process.env.LLM_PROVIDER || (process.env.GROQ_API_KEY ? 'groq' : 'pagegrid')
  ).toLowerCase();

  const hasKey = provider === 'groq' ? !!process.env.GROQ_API_KEY : !!process.env.PAGEGRID_API_KEY;
  if (!hasKey) {
    logger.warn(`LLM provider "${provider}" has no API key set, returning mock response`);
    return mockResponse();
  }

  const maxAttempts = parseInt(process.env.LLM_MAX_RETRIES, 10) || 4;
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return provider === 'groq'
        ? await callGroq({ system, user, maxTokens })
        : await callPageGrid({ system, user, maxTokens });
    } catch (err) {
      lastErr = err;
      const isRateLimit = /\b429\b/.test(err.message) || /rate limit/i.test(err.message);
      if (isRateLimit && isDailyLimit(err.message)) {
        logger.warn('LLM daily token limit reached; not retrying', { provider });
        err.code = 'LLM_DAILY_LIMIT';
        throw err;
      }
      if (isRateLimit && attempt < maxAttempts - 1) {
        const delay = retryDelayMs(err.message, attempt);
        logger.warn('LLM rate limited, backing off', { provider, attempt: attempt + 1, delay });
        await sleep(delay);
        continue;
      }
      logger.error('LLM call failed', { provider, error: err.message });
      throw err;
    }
  }
  throw lastErr;
}

module.exports = { callLLM };
