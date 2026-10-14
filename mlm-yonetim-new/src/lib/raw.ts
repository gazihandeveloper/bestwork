// ============================================
// BestWork Panel - Ham (envelope'suz) API istekleri
//
// /tree/* gibi sarmalayıcısız uçlar için doğrudan fetch.
// Panel oturumu cookie tabanlıdır: credentials include + X-Admin-Scope + CSRF.
// ============================================

import { API_URL } from '@/lib/api'

export class RawApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function rawFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'X-Admin-Scope': '1',
    'X-CSRF-Protection': '1',
    ...((options.headers as Record<string, string>) ?? {}),
  }
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  const body = (await res.json().catch(() => ({}))) as unknown
  if (!res.ok) {
    const message = (body as { error?: string })?.error || `İstek başarısız (${res.status})`
    throw new RawApiError(message, res.status, body)
  }
  return body as T
}

// ── GET cache: TTL + in-flight dedup ──
const rawCache = new Map<string, { promise: Promise<unknown>; ts: number }>()
function rawTTL(endpoint: string): number {
  return /(\/me(\?|$)|career|commissions|binary|wallet|pending)/.test(endpoint)
    ? 20_000
    : 120_000
}
export function rawGet<T>(endpoint: string): Promise<T> {
  const hit = rawCache.get(endpoint)
  if (hit && Date.now() - hit.ts < rawTTL(endpoint)) {
    return hit.promise as Promise<T>
  }
  const promise = rawFetch<T>(endpoint)
  rawCache.set(endpoint, { promise, ts: Date.now() })
  promise.catch(() => {
    rawCache.delete(endpoint)
  })
  return promise
}

/** Yazma işlemlerinden sonra ilgili GET önbelleğini temizler. */
export function rawCacheGecersiz(prefix: string) {
  for (const k of Array.from(rawCache.keys())) {
    if (k.startsWith(prefix)) rawCache.delete(k)
  }
}

export function rawPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return rawFetch<T>(endpoint, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function rawPut<T>(endpoint: string, body?: unknown): Promise<T> {
  return rawFetch<T>(endpoint, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function rawDel<T>(endpoint: string): Promise<T> {
  return rawFetch<T>(endpoint, { method: 'DELETE' })
}
