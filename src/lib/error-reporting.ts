type ErrorKind = 'react' | 'window' | 'promise';

let reporting = false;
const recent = new Map<string, number>();

function redact(value: string, maxLength: number): string {
  return value
    .slice(0, maxLength)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '[uuid]')
    .replace(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, '[token]')
    .replace(/sb_(?:secret|publishable)_[a-zA-Z0-9_-]{12,}/g, '[key]');
}

function normalizeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return {
      name: redact(error.name || 'Error', 80),
      message: redact(error.message || 'Client error', 240),
    };
  }

  if (typeof error === 'string') {
    return { name: 'Error', message: redact(error, 240) };
  }

  return { name: 'Error', message: 'Unhandled client error' };
}

export function reportClientError(kind: ErrorKind, error: unknown): void {
  if (!import.meta.env.PROD || reporting || typeof window === 'undefined') return;

  const normalized = normalizeError(error);
  const path = window.location.pathname.slice(0, 160) || '/';
  const key = `${kind}|${normalized.name}|${normalized.message}|${path}`;
  const now = Date.now();
  const lastSeen = recent.get(key) ?? 0;

  if (now - lastSeen < 30_000) return;
  recent.set(key, now);

  reporting = true;
  void fetch('/api/client-error', {
    method: 'POST',
    credentials: 'same-origin',
    keepalive: true,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      kind,
      name: normalized.name,
      message: normalized.message,
      path,
    }),
  })
    .catch(() => undefined)
    .finally(() => {
      reporting = false;
    });
}

export function installGlobalErrorReporting(): void {
  if (!import.meta.env.PROD || typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    if (event.error) reportClientError('window', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError('promise', event.reason);
  });
}
