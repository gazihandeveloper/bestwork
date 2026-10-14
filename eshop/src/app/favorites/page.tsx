// ============================================
// BestWork - Favorilerim Sayfası
// Header'daki kalp ikonundan ulaşılır; liste localStorage'da tutulur.
// ============================================
'use client'

import Link from 'next/link'
import { MainLayout } from '@/app/main-layout'
import { ProductCard } from '@/components/product/ProductCard'
import { useFavorites } from '@/contexts/FavoritesContext'
import { Heart } from '@/components/icons'

export default function FavoritesPage() {
  const { items, count } = useFavorites()

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Başlık */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
            <Heart size={22} className="fill-rose-500" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Favorilerim</h1>
            <p className="text-sm text-gray-400">
              {count > 0 ? `${count} ürün favori listesinde` : 'Henüz favori ürününüz yok'}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
            <Heart size={42} className="mx-auto mb-3 text-gray-300" />
            <p className="mb-4 text-gray-500">
              Beğendiğiniz ürünlerdeki kalp ikonuna tıklayarak favorilerinize ekleyebilirsiniz.
            </p>
            <Link
              href="/products"
              className="inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-600"
            >
              Ürünleri Keşfet
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((it) => (
              <ProductCard key={it.id} product={it.product} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
