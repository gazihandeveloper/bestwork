// ============================================
// BestWork - Ürün Detay Sayfası
// ============================================
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ShoppingCart, Share2, Minus, Plus, Check } from '@/lib/google-icons'
import { MainLayout } from '@/app/main-layout'
import { StarRating } from '@/components/product/StarRating'
import { Button } from '@/components/ui/Button'
import { formatPrice, discountPercentage } from '@/lib/api'
import { useCart } from '@/contexts/CartContext'
import { get } from '@/lib/api'
import type { Product } from '@/types'

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const { addToCart } = useCart()

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await get<Product>(`/eshop/products/slug/${slug}`)
        if (res.success) setProduct(res.data)
      } catch {
        // Demo veri
        setProduct(null)
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [slug])

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-6 bg-gray-200 rounded w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 rounded-2xl" />
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-12 bg-gray-200 rounded w-1/4" />
                <div className="h-20 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-gray-800">Ürün bulunamadı</h2>
          <p className="text-gray-500 mt-2">Aradığınız ürün mevcut değil.</p>
          <Link
            href="/products"
            className="inline-block mt-6 text-brand-500 font-bold hover:underline"
          >
            Tüm ürünlere dön
          </Link>
        </div>
      </MainLayout>
    )
  }

  const discount = discountPercentage(product.price, product.comparePrice || 0)
  const images = product.images?.length ? product.images : [product.thumbnail]

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-brand-500">Ana Sayfa</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-brand-500">Ürünler</Link>
          <span>/</span>
          <span className="text-gray-600">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Sol - Görseller */}
          <div>
            <div className="relative bg-gray-50 rounded-2xl overflow-hidden mb-4 aspect-square">
              <Image
                src={images[selectedImage] || '/images/shop/product-1-1.jpg'}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              {discount > 0 && (
                <span className="absolute top-4 left-4 bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  -{discount}%
                </span>
              )}
            </div>
            {/* Thumbnail'ler */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                      i === selectedImage ? 'border-brand-500' : 'border-gray-200'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} - ${i + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sağ - Detay */}
          <div>
            {/* Kategori */}
            {product.category && (
              <Link
                href={`/products?category=${product.category.slug}`}
                className="text-xs text-gray-400 uppercase tracking-wider hover:text-brand-500"
              >
                {product.category.name}
              </Link>
            )}

            {/* Başlık */}
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mt-2 mb-4">
              {product.name}
            </h1>

            {/* Değerlendirme */}
            <div className="flex items-center gap-3 mb-4">
              <StarRating rating={product.rating} reviewCount={product.reviewCount} size={16} />
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-500">
                <span className="text-brand-500 font-bold">{product.reviewCount}</span> değerlendirme
              </span>
            </div>

            {/* Fiyat */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-brand-500">
                {formatPrice(product.price)}
              </span>
              {product.comparePrice && product.comparePrice > product.price && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(product.comparePrice)}
                  </span>
                  <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                    %{discount} İndirim
                  </span>
                </>
              )}
            </div>

            {/* Stok Durumu */}
            <div className="flex items-center gap-2 mb-6">
              {product.stock > 0 ? (
                <>
                  <Check size={16} className="text-green-500" />
                  <span className="text-sm text-green-700 font-bold">Stokta</span>
                  <span className="text-sm text-gray-400">({product.stock} adet)</span>
                </>
              ) : (
                <span className="text-sm text-red-500 font-bold">Stokta Yok</span>
              )}
            </div>

            {/* Açıklama */}
            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                {product.description}
              </p>
            )}

            {/* Miktar Sepete Ekle */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-gray-200 rounded-xl">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-gray-500 hover:text-brand-500 hover:bg-gray-50 rounded-l-xl transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="w-12 text-center font-bold text-gray-800">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="p-3 text-gray-500 hover:text-brand-500 hover:bg-gray-50 rounded-r-xl transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <Button
                variant="brand"
                size="lg"
                onClick={() => addToCart(product, quantity)}
                disabled={product.stock === 0}
              >
                <ShoppingCart size={18} />
                Sepete Ekle
              </Button>
              <button className="p-3 text-gray-400 hover:text-brand-500 border border-gray-200 rounded-xl hover:border-brand-200 transition-colors">
                <Share2 size={20} />
              </button>
            </div>

            {/* Ürün Bilgileri */}
            <div className="border-t border-gray-100 pt-6 space-y-3 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-700">SKU:</span>
                <span>{product.sku}</span>
              </div>
              {product.brand && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700">Marka:</span>
                  <span className="text-brand-500">{product.brand.name}</span>
                </div>
              )}
              {product.category && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700">Kategori:</span>
                  <Link href={`/products?category=${product.category.slug}`} className="text-brand-500 hover:underline">
                    {product.category.name}
                  </Link>
                </div>
              )}
              {product.tags?.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700">Etiketler:</span>
                  <div className="flex gap-1">
                    {product.tags.map((tag) => (
                      <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
