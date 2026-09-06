// ============================================
// BestWork - API Client (Fetch Wrapper)
// ============================================

import type { ApiResponse } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

/** LocalStorage key'leri */
const ACCESS_TOKEN_KEY = 'hb_access_token'
const REFRESH_TOKEN_KEY = 'hb_refresh_token'

/** Token yönetimi */
export const tokenStorage = {
  getAccess: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null,
  getRefresh: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null,
  setAccess: (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token),
  setRefresh: (token: string) => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

/** Refresh işlemi sırasında eşzamanlı istekleri bekleten queue */
let refreshPromise: Promise<boolean> | null = null

/** Access token'ı refresh et */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefresh()
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_BASE}/eshop/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      tokenStorage.clear()
      return false
    }
    const data: ApiResponse<{ accessToken: string; refreshToken: string }> =
      await res.json()
    if (data.success) {
      tokenStorage.setTokens(data.data.accessToken, data.data.refreshToken)
      return true
    }
    tokenStorage.clear()
    return false
  } catch {
    tokenStorage.clear()
    return false
  }
}

/** Auth header'ı oluştur */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = tokenStorage.getAccess()
  if (token) headers['Authorization'] = `Bearer ${token}`
  // Sepet için session token
  if (typeof window !== 'undefined') {
    const sessionId = localStorage.getItem('hb_session_id')
    if (sessionId) headers['X-Session-Token'] = sessionId
  }
  return headers
}

/** API isteği - otomatik token yönetimi ile */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options

  // URL oluştur
  let url = `${API_BASE}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  // Header'ları birleştir
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(fetchOptions.headers as Record<string, string>),
  }

  // Fetch'i dene
  let res = await fetch(url, { ...fetchOptions, headers })

  // 401 ise refresh dene
  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken()
    }
    const refreshed = await refreshPromise
    refreshPromise = null

    if (refreshed) {
      // Yeniden dene
      headers.Authorization = `Bearer ${tokenStorage.getAccess()}`
      res = await fetch(url, { ...fetchOptions, headers })
    } else {
      return { success: false, data: null as T, error: 'Oturum süreniz doldu' }
    }
  }

  const data: ApiResponse<T> = await res.json()
  return data
}

/** GET isteği */
export function get<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET', params })
}

/** POST isteği */
export function post<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/** PUT isteği */
export function put<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/** DELETE isteği */
export function del<T>(
  endpoint: string
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE' })
}

/** Fiyat formatla (cent => TL) */
export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  })
}

/** İndirim yüzdesi hesapla */
export function discountPercentage(price: number, comparePrice: number): number {
  if (!comparePrice || comparePrice <= price) return 0
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}

/** Sipariş durumu etiketi rengi */
export function orderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-indigo-100 text-indigo-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/** Sipariş durumu Türkçe */
export function orderStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: 'Beklemede',
    confirmed: 'Onaylandı',
    processing: 'Hazırlanıyor',
    shipped: 'Kargoya Verildi',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
    refunded: 'İade Edildi',
  }
  return texts[status] || status
}
