// ============================================
// BestWork - Ana Sayfa (SSR/ISR sarmalayıcı)
// Katalog verisi sunucuda çekilir (kök HTML'de içerik), 5 dk'da bir tazelenir.
// ============================================
import type { Metadata } from 'next'
import HomeClient from './home-client'
import type { Product } from '@/types'

export const metadata: Metadata = {
  title: 'BestWork - Online Market Alışverişi',
  description:
    'En taze meyve, sebze, süt ürünleri ve daha fazlası. BestWork ile kapınıza kadar gelsin!',
}

export const revalidate = 300

const API = 'http://127.0.0.1:8090'

async function fetcher<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(API + path, { next: { revalidate: 300 }, headers: { accept: 'application/json' } })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

export default async function HomePage() {
  // API kapalı/hatalıysa client yine kendi fetch'iyle dener; boş düşmek yok.
  const [prod, cats] = await Promise.all([
    fetcher<{ success: boolean; data?: { items?: Product[] } }>('/api/eshop/products?page=1&limit=10'),
    fetcher<{ success: boolean; data?: any[] }>('/api/eshop/categories'),
  ])
  const initialProducts = prod?.success && Array.isArray(prod.data?.items) ? prod.data!.items! : []
  const initialCategories = cats?.success && Array.isArray(cats.data) ? cats.data : []

  return (
    <HomeClient initialProducts={initialProducts} initialCategories={initialCategories} />
  )
}
