const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff',
};

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

function acceptsBrowserReport(request) {
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
  if (!acceptsBrowserReport(request)) {
    return jsonResponse({ error: 'forbidden' }, 403);
  }

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
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
    } catch (error) {
      console.error(error);
      return jsonResponse({ status: 'error', service: 'polatordsolar' }, 503);
    }
  },
};
