// ============================================
// BestWork - Sepet Sayfası (yeni tasarım)
// Hızlı ürün ekle + CV/PV rozetli ürün kartları + gelişmiş sipariş özeti.
// ============================================
'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  ArrowLeft,
  ArrowRight,
  Zap,
  DollarSign,
  Diamond,
  Tag,
  Lock,
  ShieldCheck,
  Truck,
  BadgeCheck,
  Headset,
} from '@/components/icons'
import { MainLayout } from '@/app/main-layout'
import { Button } from '@/components/ui/Button'
import { formatPV, get } from '@/lib/api'
import { useCart } from '@/contexts/CartContext'

function QtyField({ value, stock, onChange }: { value: number; stock?: number; onChange: (n: number) => void }) {
  const max = stock && stock > 0 ? stock : 999999
  const [text, setText] = useState(String(value))
  const [focus, setFocus] = useState(false)
  useEffect(() => {
    if (!focus) setText(String(value))
  }, [value, focus])

  const commit = () => {
    const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10)
    let n = Number.isNaN(parsed) ? value : parsed
    if (n < 1) n = 1
    if (n > max) n = max
    setText(String(n))
    if (n !== value) onChange(n)
  }

  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        aria-label="Azalt"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        className="px-3 py-2 text-gray-500 transition-colors hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={14} />
      </button>
      <input
        value={text}
        inputMode="numeric"
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, '')
          setText(v)
          if (v !== '') {
            const p = parseInt(v, 10)
            if (p >= 1 && p <= max && p !== value) onChange(p)
          }
        }}
        onFocus={() => setFocus(true)}
        onBlur={() => {
          setFocus(false)
          commit()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="w-12 border-x border-gray-200 py-2 text-center text-sm fw-700 text-gray-800 outline-none focus:bg-gray-50"
      />
      <button
        type="button"
        aria-label="Artır"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="px-3 py-2 text-gray-500 transition-colors hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

/** Fiyat biçimi: ₺ SONDА (1.215,50 ₺). */
const tl = (cents: number) =>
  `${((Number(cents) || 0) / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₺`

/** CV (yeşil) ve PV (mor) rozetleri — ürün sayfasındaki ana badge stili (dolu). */
function CvPvBadges({ cv, pv }: { cv: number; pv: number }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-[#29a56c] px-2.5 py-1 text-[12px] fw-700 text-white shadow">
        <DollarSign size={13} /> {formatPV(cv)} CV
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500 px-2.5 py-1 text-[12px] fw-700 text-white shadow">
        <Diamond size={13} /> {formatPV(pv)} PV
      </span>
    </div>
  )
}

export default function CartPage() {
  const { cart, loading, updateQuantity, removeFromCart, clearCart, addToCart } = useCart()

  // Hızlı ürün ekle
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<any | null>(null)
  const [qqty, setQqty] = useState(1)
  const [openDrop, setOpenDrop] = useState(false)

  useEffect(() => {
    get<any>('/eshop/products')
      .then((r) => {
        if (r.success) {
          const d = r.data
          setAllProducts(Array.isArray(d) ? d : d?.items || [])
        }
      })
      .catch(() => undefined)
  }, [])

  const results = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('tr-TR')
    if (s.length < 1 || sel) return []
    return allProducts
      .filter((p) =>
        `${p.name} ${p.sku || ''} ${p.barcode || ''}`.toLocaleLowerCase('tr-TR').includes(s)
      )
      .slice(0, 8)
  }, [q, allProducts, sel])

  const quickAdd = () => {
    if (!sel) return
    void addToCart(sel, qqty)
    setSel(null)
    setQ('')
    setQqty(1)
  }

  const cartItemsArr = (cart?.items || []) as any[]
  const totalQty = cartItemsArr.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
  const totalPV = cartItemsArr.reduce(
    (sum, it) => sum + (Number(it.product?.pv ?? it.pv) || 0) * (Number(it.quantity) || 0),
    0
  )
  const totalCV = cartItemsArr.reduce(
    (sum, it) => sum + (Number(it.product?.cv ?? it.cv) || 0) * (Number(it.quantity) || 0),
    0
  )
  // Satış tutarı (indirimsiz), ödenecek (indirimli) ve toplam indirim.
  const saleTotal = cartItemsArr.reduce((sum, it) => {
    const unit = Number(it.unit_price || it.price || 0)
    const cmp = Number(it.product?.comparePrice || 0)
    const base = cmp > unit ? cmp : unit
    return sum + base * (Number(it.quantity) || 0)
  }, 0)
  const payable = cartItemsArr.reduce(
    (sum, it) => sum + Number(it.unit_price || it.price || 0) * (Number(it.quantity) || 0),
    0
  )
  const totalDiscount = Math.max(0, saleTotal - payable)

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-200" />
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="bw-cart container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-brand-500">
            Ana Sayfa
          </Link>
          <span>/</span>
          <span className="text-gray-600">Sepet</span>
        </div>

        {/* Hızlı Ürün Ekle */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm sm:p-4">
          <span className="inline-flex items-center gap-2 text-sm font-extrabold tracking-wide text-brand-600">
            <Zap size={18} /> HIZLI ÜRÜN EKLE
          </span>

          <div className="relative min-w-[200px] flex-1">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setSel(null)
                setOpenDrop(true)
              }}
              onFocus={() => setOpenDrop(true)}
              onBlur={() => setTimeout(() => setOpenDrop(false), 150)}
              placeholder="Ürün adı veya kodu ile arayın..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            {openDrop && results.length > 0 && (
              <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white p-1 shadow-lg">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSel(p)
                      setQ(p.name)
                      setOpenDrop(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-brand-50/60"
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-gray-50">
                      {p.thumbnail && (
                        <Image src={p.thumbnail} alt={p.name} width={36} height={36} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm fw-700 text-gray-800">{p.name}</div>
                      <div className="text-[11px] text-gray-400">{p.sku || ''}</div>
                    </div>
                    <span className="shrink-0 text-xs fw-700 text-brand-600">{tl(Number(p.price))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <QtyField value={qqty} stock={Number(sel?.stock) || 0} onChange={setQqty} />

          <Button variant="brand" size="lg" onClick={quickAdd} disabled={!sel} className="w-full sm:w-auto">
            <ShoppingCart size={16} /> Sepete Ekle
          </Button>
        </div>

        {cartItemsArr.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm">
            <ShoppingBag size={64} className="mx-auto mb-6 text-gray-300" />
            <h2 className="mb-2 text-2xl font-bold text-gray-800">Sepetiniz boş</h2>
            <p className="mb-8 text-gray-500">Alışverişe başlamak için ürünleri keşfedin.</p>
            <Link href="/products">
              <Button variant="brand" size="lg">
                <ArrowLeft size={18} /> Alışverişe Başla
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            {/* Ürünler */}
            <div className="space-y-3 lg:col-span-2">
              {cartItemsArr.map((item) => {
                const unit = Number(item.unit_price || item.price || 0)
                const cmp = Number(item.product?.comparePrice || 0)
                const cv = Number(item.product?.cv ?? item.cv) || 0
                const pv = Number(item.product?.pv ?? item.pv) || 0
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm sm:p-4"
                  >
                    {/* Görsel */}
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 sm:h-24 sm:w-24">
                      {item.product_image || item.product?.thumbnail ? (
                        <Image
                          src={item.product_image || item.product?.thumbnail || '/images/shop/product-1-1.jpg'}
                          alt={item.product_name || item.product?.name || 'Ürün'}
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ShoppingBag size={30} className="text-gray-300" />
                      )}
                    </div>

                    {/* Ad + rozetler */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.product_slug || item.product?.slug || '#'}`}
                        className="line-clamp-1 text-sm font-extrabold tracking-wide text-gray-800 uppercase hover:text-brand-500"
                      >
                        {item.product_name || item.product?.name || 'Ürün'}
                      </Link>
                      <div className="mt-1.5">
                        <CvPvBadges cv={cv} pv={pv} />
                      </div>
                    </div>

                    {/* Miktar */}
                    <QtyField
                      value={item.quantity}
                      stock={Number(item.stock_quantity ?? item.product?.stock) || 0}
                      onChange={(n) => updateQuantity(item.id, n)}
                    />

                    {/* Fiyat + kaldır */}
                    <div className="flex w-full items-center justify-between gap-3 border-t border-gray-100 pt-3 sm:w-auto sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                      <div className="text-right">
                        <div className="text-[11px] text-gray-400">
                          {cmp > unit && <span className="mr-1 line-through">{tl(cmp)}</span>}
                          <span className="fw-700 text-gray-600">{tl(unit)} / ad.</span>
                        </div>
                        <div className="text-lg fw-800 text-brand-600">{tl(unit * item.quantity)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 transition-colors hover:text-red-500"
                      >
                        <Trash2 size={14} /> Kaldır
                      </button>
                    </div>
                  </div>
                )
              })}

              <div className="flex items-center justify-end">
                <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-600">
                  Sepeti Temizle
                </button>
              </div>
            </div>

            {/* Sipariş Özeti */}
            <div className="sticky top-24 h-fit rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-gray-900">Sipariş Özeti</h3>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs fw-700 text-sky-700 ring-1 ring-sky-100">
                  {totalQty} Ürün
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Toplam Satış Tutarı</span>
                  <span className="fw-700 text-gray-800">{tl(saleTotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="inline-flex items-center gap-1.5 text-gray-500">
                      <Tag size={14} className="text-green-600" /> Toplam İndiriminiz
                    </span>
                    <span className="fw-700 text-green-600">− {tl(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Toplam CV</span>
                  <span className="fw-700 text-[#29a56c]">{formatPV(totalCV)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Toplam PV</span>
                  <span className="fw-700 text-purple-600">{formatPV(totalPV)}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3.5">
                <span className="text-sm fw-800 text-gray-800">Ödenecek Tutar</span>
                <span className="text-2xl fw-800 text-brand-600">{tl(payable)}</span>
              </div>

              <Link href="/checkout" className="mt-5 block">
                <Button variant="brand" size="lg" fullWidth>
                  <Lock size={17} /> Siparişi Tamamla <ArrowRight size={17} />
                </Button>
              </Link>
              <Link
                href="/products"
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
              >
                <ShoppingBag size={16} /> ALIŞVERİŞE DEVAM ET
              </Link>

              <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-gray-100 pt-4 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-brand-500" /> 256-Bit SSL Güvenlik
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Truck size={15} className="text-brand-500" /> Hızlı Güvenli Kargo
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck size={15} className="text-brand-500" /> %100 Orijinal Ürün
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Headset size={15} className="text-brand-500" /> Müşteri Desteği
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
