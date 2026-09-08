// ============================================
// BestWork - Ana Sayfa
// ============================================
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, CupSoda, Zap, Sparkles, Droplets, Package as PkgIcon, Box, Coffee, Leaf, Pill, Apple, HeartPulse, FlaskConical, Tag as TagIcon, Gift, ShieldCheck, ShoppingCart } from '@/lib/google-icons'
import { MainLayout } from './main-layout'
import { ProductCard } from '@/components/product/ProductCard'
import { StarRating } from '@/components/product/StarRating'
import { formatPrice } from '@/lib/api'
import { get } from '@/lib/api'
import { rawGet } from '@/lib/raw'

const ABS = 'https://mahmutgazihanarslan.com.tr'
const absUrl = (p?: string) => (p ? (/^https?:\/\//.test(p) ? p : ABS + (p.startsWith('/') ? '' : '/') + p) : '')
import { useCart } from '@/contexts/CartContext'
import type { Product } from '@/types'

// Minik sepete ekle butonu
function AddToCartBtn({ product }: { product: Product }) {
  const { addToCart } = useCart()
  return (
    <button
      onClick={() => addToCart(product, 1)}
      className="mt-3 w-full bg-brand-50 text-brand-500 text-sm font-bold py-2 rounded-lg hover:bg-brand-500 hover:text-white transition-colors"
    >
      Sepete Ekle
    </button>
  )
}

interface HomeClientProps {
  initialProducts?: Product[]
  initialCategories?: any[]
}

export default function HomeClient({ initialProducts = [], initialCategories = [] }: HomeClientProps) {
  const [heroIndex, setHeroIndex] = useState(0)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [categories, setCategories] = useState<any[]>(initialCategories)
  const [catalogError, setCatalogError] = useState(false)
  const [catalogRetry, setCatalogRetry] = useState(0)

  // Kategori ikon cozucu: admin panelindeki ikon adi oncelikli (yoksa slug)
  const CAT_ICON: Record<string, any> = {
    icecek: CupSoda,
    enerji: Zap,
    bakim: Sparkles,
    'cilt-bakimi': Droplets,
    diger: PkgIcon,
  }
  const ICON_NAME: Record<string, any> = {
    coffee: Coffee,
    cup: CupSoda,
    'cup-soda': CupSoda,
    cupsoda: CupSoda,
    zap: Zap,
    energy: Zap,
    sparkles: Sparkles,
    sparkle: Sparkles,
    droplets: Droplets,
    cilt: Droplets,
    package: PkgIcon,
    box: Box,
    tag: TagIcon,
    gift: Gift,
    'shield-check': ShieldCheck,
    shield: ShieldCheck,
    cart: ShoppingCart,
    leaf: Leaf,
    pill: Pill,
    apple: Apple,
    heart: HeartPulse,
    flask: FlaskConical,
  }
  const catIcon = (c: any) => {
    const iconName = String(c.icon || '').toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-')
    return ICON_NAME[iconName] || CAT_ICON[c.slug] || Box
  }
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 2, minutes: 43, seconds: 29 })

    useEffect(() => {
    let alive = true
    setCatalogError(false)
    get<{ items: Product[] }>('/eshop/products', { page: '1', limit: '10' })
      .then((res) => { if (alive && res.success) setProducts(res.data?.items || []) })
      .catch(() => { if (alive) setCatalogError(true) })
    get<any>('/eshop/categories')
      .then((res) => { if (alive && res.success) setCategories(Array.isArray(res.data) ? res.data : []) })
      .catch(() => { if (alive) setCatalogError(true) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogRetry])

  const [heroSlides, setHeroSlides] = useState<{ title: string; subtitle: string; bg: string }[]>([])

  // Admin panelindeki sliderları yükle (yoksa varsayılanlar kalır)
  useEffect(() => {
    rawGet<{ hero_slides?: any[] }>('/hero-slides')
      .then((r) => {
        const list = Array.isArray(r.hero_slides) ? r.hero_slides : []
        if (list.length > 0) {
          setHeroSlides(
            list.map((s) => ({
              title: s.subtitle || s.title || '',
              subtitle: s.description || s.subtitle || '',
              bg: absUrl(s.image_path),
            }))
          )
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sayaç
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev
        seconds--
        if (seconds < 0) { seconds = 59; minutes-- }
        if (minutes < 0) { minutes = 59; hours-- }
        if (hours < 0) { hours = 23; days-- }
        if (days < 0) { days = 0; hours = 0; minutes = 0; seconds = 0 }
        return { days, hours, minutes, seconds }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <MainLayout>
      {/* ========== HERO SLIDER ========== */}
      {heroSlides.length > 0 && (
      <section className="bg-white">
        <div className="container mx-auto px-4">
          <div className="relative mt-4 overflow-hidden rounded-2xl">
            <div
              className="relative bg-cover bg-center min-h-[300px] md:min-h-[400px] lg:min-h-[500px] flex items-center transition-all duration-700"
              style={{ backgroundImage: `url(${heroSlides[heroIndex].bg})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
              <div className="relative z-10 px-8 md:px-16 py-12 max-w-lg">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight whitespace-pre-line">
                  {heroSlides[heroIndex].title}
                </h1>
              </div>
            </div>

            {/* Slider kontrolleri */}
            <button
              onClick={() => setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)}
              type="button" className="absolute left-4 top-1/2 z-20 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-700" />
            </button>
            <button
              onClick={() => setHeroIndex((i) => (i + 1) % heroSlides.length)}
              type="button" className="absolute right-4 top-1/2 z-20 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronRight size={20} className="text-gray-700" />
            </button>

            {/* Dotlar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === heroIndex ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ========== POPÜLER KATEGORİLER ========== */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800">Öne Çıkan Kategoriler</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 md:flex-wrap md:justify-center md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.length > 0 ? categories.map((cat) => (
              <Link key={cat.id} href={`/products?category=${cat.slug || cat.id}`}
                className="group flex w-32 shrink-0 flex-col items-center justify-between gap-2 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-brand-100 transition-all md:w-40">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-transform group-hover:scale-110 md:h-16 md:w-16">
                  {(() => { const I = catIcon(cat); return <I size={26} /> })()}
                </div>
                <h6 className="text-xs md:text-sm font-semibold text-gray-700 text-center group-hover:text-brand-500 transition-colors">
                  {cat.name}
                </h6>
              </Link>
            )) : (
              catalogError ? (
              <div className="col-span-full text-center py-8">
                <p className="text-red-500 text-sm font-medium mb-3">Kategoriler yüklenemedi. Bağlantınızı kontrol edin.</p>
                <button onClick={() => setCatalogRetry(v => v + 1)} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600">Tekrar Dene</button>
              </div>
            ) : (
              <span className="col-span-full text-center text-gray-400 py-8">Kategori bulunamadı</span>
            )
            )}
          </div>
        </div>
      </section>

      {/* ========== BANNERLAR ========== */}
      <section className="pb-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { img: '/images/banner/banner-1.png', title: 'Her Gün Taze ve Temiz\nÜrünlerimizle', delay: 0 },
              { img: '/images/banner/banner-2.png', title: 'Kahvaltını Sağlıklı\nve Kolay Yap', delay: 0.2 },
              { img: '/images/banner/banner-3.png', title: 'En İyi Organik\nÜrünler Online', delay: 0.4 },
            ].map((banner, i) => (
              <div
                key={i}
                className="relative rounded-2xl overflow-hidden group animate-fadeInUp"
                style={{ animationDelay: `${banner.delay}s` }}
              >
                <Image
                  src={banner.img}
                  alt={banner.title}
                  width={400}
                  height={200}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent p-6 flex flex-col justify-center">
                  <h4 className="text-white text-lg font-bold whitespace-pre-line leading-tight">
                    {banner.title}
                  </h4>
                  <Link
                    href="/products"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-white bg-brand-500 px-4 py-2 rounded-full w-fit hover:bg-brand-600 transition-colors"
                  >
                    Alışverişe Başla <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ========== ÜRÜNLER ========== */}
      <section className="pb-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800">Ürünler</h3>
            <Link href="/products" className="text-sm text-brand-500 font-medium hover:underline">Tümünü Gör</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== ÇOK SATAN / TREND / YENİ / POPÜLER ========== */}
      <section className="pb-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.length > 0 ? (
              (() => {
                const sections = [
                  { title: 'Çok Satanlar', items: products.slice(0, 2) },
                  { title: 'Trend Ürünler', items: products.slice(2, 4) },
                  { title: 'Yeni Eklenenler', items: products.slice(4, 6) },
                  { title: 'En Çok Oy Alanlar', items: products.slice(6, 8) },
                ]
                return sections.filter(s => s.items.length > 0).map((section) => (
                  <div key={section.title}>
                    <h4 className="text-base font-bold text-gray-800 mb-4">{section.title}</h4>
                    <div className="space-y-3">
                      {section.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 bg-white rounded-lg hover:shadow-md transition-all">
                          <Image
                            src={item.thumbnail || '/images/shop/thumbnail-1.jpg'}
                            alt={item.name}
                            width={60}
                            height={60}
                            className="w-14 h-14 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <Link href={`/products/${item.slug}`} className="text-xs font-bold text-gray-700 line-clamp-2 hover:text-brand-500">
                              {item.name}
                            </Link>
                            <StarRating rating={item.rating || 4} size={10} />
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs font-bold text-brand-500">{formatPrice(item.price)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()
            ) : (
              catalogError ? (
                <div className="col-span-4 text-center py-8">
                  <p className="text-red-500 text-sm font-medium mb-3">Ürünler yüklenemedi. Bağlantınızı kontrol edin.</p>
                  <button onClick={() => setCatalogRetry(v => v + 1)} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600">Tekrar Dene</button>
                </div>
              ) : (
                <div className="col-span-4 text-center text-gray-400 py-8">Henüz ürün eklenmedi.</div>
              )
            )}
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
