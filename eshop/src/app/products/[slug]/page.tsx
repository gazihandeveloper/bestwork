// ============================================
// BestWork - Ürün Detay Sayfası
// ============================================
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ShoppingCart, Share2, Minus, Plus, Check, Heart, Star } from '@/components/icons'
import { MainLayout } from '@/app/main-layout'
import { StarRating } from '@/components/product/StarRating'
import { Button } from '@/components/ui/Button'
import { formatPrice, discountPercentage, get, post, apiRequest } from '@/lib/api'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import toast from 'react-hot-toast'
import type { Product } from '@/types'

interface Review {
  id: number
  author: string
  rating: number
  comment: string
  created_at: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const { addToCart } = useCart()
  const { isAuthenticated } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()

  // ── Yorumlar ──
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  // Yorumları ürün yüklenince çek (cache'siz — yeni yorumlar anında görünsün)
  useEffect(() => {
    if (!product?.id) return
    let alive = true
    setReviewsLoading(true)
    apiRequest<{ items: Review[]; total: number; average: number }>(
      `/eshop/product-reviews/${product.id}`,
      { method: 'GET' }
    )
      .then((res) => {
        if (alive && res.success) setReviews(res.data?.items || [])
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setReviewsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [product?.id])

  async function submitReview() {
    if (!product) return
    if (newComment.trim().length < 3) {
      toast.error('Yorum en az 3 karakter olmalı')
      return
    }
    setSubmitting(true)
    try {
      const res = await post<Review>(`/eshop/product-reviews/${product.id}`, {
        rating: newRating,
        comment: newComment.trim(),
      })
      if (res.success) {
        setNewComment('')
        setNewRating(5)
        toast.success('Yorumunuz alındı! Onaylandıktan sonra yayınlanacak.')
      } else {
        toast.error(res.error || 'Yorum gönderilemedi')
      }
    } catch {
      toast.error('Yorum gönderilemedi')
    } finally {
      setSubmitting(false)
    }
  }

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
  const fav = isFavorite(Number(product.id))

  // Yorumlar yüklüyse gerçek puanı göster, yoksa API'nin verdiğini
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const displayRating = reviews.length > 0 ? avgRating : product.rating
  const displayCount = reviews.length > 0 ? reviews.length : product.reviewCount

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
              {/* Favori kalbi */}
              <button
                onClick={() => toggleFavorite(product)}
                aria-label={fav ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                className={`absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-all hover:scale-110 ${
                  fav ? 'bg-rose-500 text-white' : 'bg-white text-gray-500 hover:text-rose-500'
                }`}
              >
                <Heart size={20} className={fav ? 'fill-white' : ''} />
              </button>
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
              <StarRating rating={displayRating} reviewCount={undefined} size={16} />
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-500">
                <span className="text-brand-500 font-bold">{displayCount}</span> değerlendirme
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
              <button
                onClick={() => toggleFavorite(product)}
                aria-label={fav ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                className={`p-3 rounded-xl border transition-colors ${
                  fav
                    ? 'text-rose-500 border-rose-200 bg-rose-50'
                    : 'text-gray-400 border-gray-200 hover:text-rose-500 hover:border-rose-200'
                }`}
              >
                <Heart size={20} className={fav ? 'fill-rose-500' : ''} />
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

        {/* ── Değerlendirmeler & Yorumlar ── */}
        <div className="mt-12 border-t border-gray-100 pt-8">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-gray-800">Değerlendirmeler & Yorumlar</h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={avgRating} size={16} />
                <span className="text-sm text-gray-500">
                  {avgRating.toFixed(1)} / 5 · {reviews.length} yorum
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Yorum listesi */}
            <div className="space-y-3">
              {reviewsLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-24 bg-gray-100 rounded-2xl" />
                  <div className="h-24 bg-gray-100 rounded-2xl" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                  <p className="text-sm text-gray-500">
                    Henüz yorum yok — ilk yorumu siz yapın!
                  </p>
                </div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-extrabold text-brand-600">
                          {r.author.trim().charAt(0).toLocaleUpperCase('tr-TR')}
                        </span>
                        <span className="text-sm font-bold text-gray-800">{r.author}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(r.created_at).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="mb-1.5">
                      <StarRating rating={r.rating} size={13} />
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
                      {r.comment}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Yorum formu */}
            <div className="h-fit rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <h3 className="mb-1 text-base font-bold text-gray-800">Yorum Yap</h3>
              <p className="mb-3 text-xs text-gray-400">
                Yorumlar yönetici onayından sonra yayınlanır.
              </p>
              {isAuthenticated ? (
                <>
                  <div className="mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Puanınız
                    </span>
                    <div className="mt-1.5 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setNewRating(s)}
                          className="p-0.5 transition-transform hover:scale-110"
                          aria-label={`${s} yıldız`}
                        >
                          <Star
                            size={26}
                            className={s <= newRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-bold text-gray-600">{newRating}/5</span>
                    </div>
                  </div>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Ürünle ilgili deneyiminizi paylaşın..."
                    className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={submitReview}
                    disabled={submitting}
                    className="mt-3 w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Gönderiliyor…' : 'Yorumu Gönder'}
                  </button>
                </>
              ) : (
                <div className="py-4 text-center">
                  <p className="mb-3 text-sm text-gray-500">
                    Yorum yapmak için üye girişi yapmalısınız.
                  </p>
                  <Link
                    href="/login"
                    className="inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-600"
                  >
                    Giriş Yap
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
