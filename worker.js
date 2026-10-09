const SUPABASE_ORIGIN = 'https://fjmrfxjvqsdrwjucgzla.supabase.co';
const SUPABASE_WS_ORIGIN = 'wss://fjmrfxjvqsdrwjucgzla.supabase.co';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS_ORIGIN}`,
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN}`,
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY_HEADERS = {
  'content-security-policy': CONTENT_SECURITY_POLICY,
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), serial=(), browsing-topics=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'x-permitted-cross-domain-policies': 'none',
  'x-polato-security-layer': 'worker',
};

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
};

function withSecurityHeaders(response) {
  const secured = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    secured.headers.set(name, value);
  }

  // The application has no cross-origin Worker API. Supabase requests go
  // directly to the hosted Supabase origin and are protected by API key + RLS.
  secured.headers.delete('access-control-allow-origin');
  secured.headers.delete('access-control-allow-credentials');

  return secured;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

function redact(value, maxLength = 240) {
  if (typeof value !== 'string') return '';
  return value
    .slice(0, maxLength)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '[uuid]')
    .replace(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, '[token]')
    .replace(/sb_(?:secret|publishable)_[a-zA-Z0-9_-]{12,}/g, '[key]');
}

function safePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';
  return value.split('?')[0].split('#')[0].slice(0, 160);
}

function acceptsBrowserRequest(request) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (origin && origin !== url.origin) return false;
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) return false;
  return true;
}

async function handleHealth(request, env) {
  const indexUrl = new URL('/index.html', request.url);
  let assetsStatus = 'error';

  try {
    const assetResponse = await env.ASSETS.fetch(indexUrl);
    if (assetResponse.ok) assetsStatus = 'ok';
    else console.error(new Error(`health asset check returned ${assetResponse.status}`));
  } catch (error) {
    console.error(error);
  }

  const healthy = assetsStatus === 'ok';
  const payload = {
    status: healthy ? 'ok' : 'degraded',
    service: 'polatordsolar',
    edge: 'ok',
    assets: assetsStatus,
    timestamp: new Date().toISOString(),
  };

  if (request.method === 'HEAD') {
    return new Response(null, { status: healthy ? 200 : 503, headers: JSON_HEADERS });
  }

  return jsonResponse(payload, healthy ? 200 : 503);
}

async function handleClientError(request) {
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > 8192) {
    return jsonResponse({ error: 'payload_too_large' }, 413);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const kind = redact(payload?.kind, 40) || 'unknown';
  const name = redact(payload?.name, 80) || 'Error';
  const message = redact(payload?.message, 240) || 'Client error';
  const path = safePath(payload?.path);

  console.error(new Error(`client:${kind}:${name}: ${message}`), { path });
  return new Response(null, { status: 204 });
}

async function routeRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/') && !acceptsBrowserRequest(request)) {
    return jsonResponse({ error: 'forbidden' }, 403);
  }

  if (url.pathname === '/api/health') {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return jsonResponse({ error: 'method_not_allowed' }, 405);
    }
    return await handleHealth(request, env);
  }

  if (url.pathname === '/api/client-error') {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405);
    }
    return await handleClientError(request);
  }

  return await env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    try {
      return withSecurityHeaders(await routeRequest(request, env));
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(jsonResponse({ status: 'error', service: 'polatordsolar' }, 503));
    }
  },
};
