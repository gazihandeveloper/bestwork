'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/app/main-layout'
import { ProductGrid } from '@/components/product/ProductGrid'
import { get } from '@/lib/api'
import type { Product } from '@/types'

interface Category {
  id: number
  name: string
  slug: string
}

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlCat = searchParams.get('category') ?? ''
  const activeCat = urlCat ? (categories.find((c) => c.slug === urlCat || String(c.id) === urlCat) ?? null) : null
  const activeCatId = activeCat ? String(activeCat.id) : ''

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [prodRes, catRes] = await Promise.all([
          get<any>('/eshop/products'),
          get<any>('/eshop/categories'),
        ])
        if (cancelled) return
        if (prodRes.success) {
          const data = prodRes.data
          setProducts(Array.isArray(data) ? data : (data?.items || []))
        }
        if (catRes.success) {
          const data = catRes.data
          setCategories(Array.isArray(data) ? data : [])
        }
      } catch {
        // sessiz
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeCatId) {
        const rawId = (p as any).category_id ?? (p as any).categoryId ?? (p as any).category?.id ?? null
        const id = String(rawId ?? '')
        if (id !== activeCatId) return false
      }
      const price = Number(p.price)
      if (minPrice && !Number.isNaN(price) && price < parseFloat(minPrice) * 100) return false
      if (maxPrice && !Number.isNaN(price) && price > parseFloat(maxPrice) * 100) return false
      return true
    })
  }, [products, activeCatId, minPrice, maxPrice])

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-brand-500">Ana Sayfa</Link>
          <span>/</span>
          <span className="text-gray-600">Tüm Ürünler</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Filtreler */}
          <aside className="lg:w-64 shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
              <h3 className="font-bold text-gray-800 mb-4">Filtrele</h3>

              {/* Kategori */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Kategori</h4>
                <div className="space-y-2">
                  <label className={`flex items-center gap-2 text-sm cursor-pointer ${!activeCatId ? 'text-brand-500 font-medium' : 'text-gray-600 hover:text-brand-500'}`}>
                    <input type="radio" name="cat" checked={!activeCatId} onChange={() => router.replace('/products')} className="border-gray-300 text-brand-500" />
                    Tümü
                  </label>
                  {categories.map((cat) => {
                    const catId = String(cat.id)
                    return (
                      <label key={catId} className={`flex items-center gap-2 text-sm cursor-pointer ${activeCatId === catId ? 'text-brand-500 font-medium' : 'text-gray-600 hover:text-brand-500'}`}>
                        <input type="radio" name="cat" checked={activeCatId === catId} onChange={() => router.replace(`/products?category=${cat.slug || cat.id}`)} className="border-gray-300 text-brand-500" />
                        {cat.name}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Fiyat Aralığı */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Fiyat Aralığı (₺)</h4>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <span className="text-gray-400">-</span>
                  <input type="number" min={0} placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                </div>
              </div>
            </div>
          </aside>

          {/* Ürünler */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{filtered.length}</span> ürün bulundu
              </p>
            </div>

            <ProductGrid products={filtered} loading={loading} />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}


export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsContent />
    </Suspense>
  )
}
