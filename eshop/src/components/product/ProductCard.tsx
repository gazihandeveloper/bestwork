// ============================================
// BestWork - Ürün Kartı Bileşeni
// ============================================
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Eye } from '@/lib/google-icons'
import { StarRating } from './StarRating'
import { formatPrice, discountPercentage } from '@/lib/api'
import { useCart } from '@/contexts/CartContext'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()
  const discount = discountPercentage(product.price, product.comparePrice || 0)

  return (
    <div className="group product-card bg-white rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Görsel Alanı */}
      <div className="relative overflow-hidden bg-gray-50">
        <Link href={`/products/${product.slug}`}>
          <div className="aspect-square relative">
            <Image
              src={product.thumbnail || '/images/shop/product-1-1.jpg'}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          </div>
        </Link>

        {/* Rozetler */}
        {discount > 0 && (
          <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{discount}%
          </span>
        )}
        {/* Sağ üst: PV (yeşil) + CV (mor) rozetleri */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {product.isFeatured && (
            <span className="bg-orange-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow">
              Öne Çıkan
            </span>
          )}
          {(product as any).pv > 0 && (
            <span className="bg-green-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow">
              {(product as any).pv} PV
            </span>
          )}
          {(product as any).cv > 0 && (
            <span className="bg-purple-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow">
              {(product as any).cv} CV
            </span>
          )}
        </div>

        {/* Hover Aksiyonları */}
        <div className="absolute right-3 bottom-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={() => addToCart(product)}
            className="bg-white text-gray-700 p-2 rounded-full shadow-md hover:bg-brand-500 hover:text-white transition-colors"
            aria-label="Sepete Ekle"
          >
            <ShoppingCart size={16} />
          </button>
          <Link
            href={`/products/${product.slug}`}
            className="bg-white text-gray-700 p-2 rounded-full shadow-md hover:text-brand-500 transition-colors"
            aria-label="Hızlı Bak"
          >
            <Eye size={16} />
          </Link>
        </div>
      </div>

      {/* İçerik Alanı */}
      <div className="p-4">
        {/* Kategori */}
        {product.category && (
          <Link
            href={`/products?category=${product.category.slug}`}
            className="text-xs text-gray-400 uppercase tracking-wider hover:text-brand-500 transition-colors"
          >
            {product.category.name}
          </Link>
        )}

        {/* Ürün Adı */}
        <Link href={`/products/${product.slug}`}>
          <h3 className="text-sm font-semibold text-gray-800 mt-1 mb-2 line-clamp-2 hover:text-brand-500 transition-colors min-h-[2.5rem]">
            {product.name}
          </h3>
        </Link>

        {/* Değerlendirme */}
        <div className="mb-3">
          <StarRating rating={product.rating} reviewCount={product.reviewCount} size={12} />
        </div>

        {/* Fiyat & Sepet */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-brand-500">
              {formatPrice(product.price)}
            </span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>
          <button
            onClick={() => addToCart(product)}
            className="flex items-center gap-1 bg-brand-50 text-brand-500 px-3 py-2 rounded-lg text-sm font-bold hover:bg-brand-500 hover:text-white transition-colors"
          >
            <ShoppingCart size={14} />
            Ekle
          </button>
        </div>
      </div>
    </div>
  )
}
