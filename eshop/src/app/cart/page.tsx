// ============================================
// BestWork - Sepet Sayfası
// ============================================
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from '@/lib/google-icons'
import { MainLayout } from '@/app/main-layout'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/api'
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
    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        aria-label="Azalt"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        className="px-2.5 py-2 text-gray-400 transition-colors hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
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
        onBlur={() => { setFocus(false); commit() }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className="w-12 border-x border-gray-200 py-2 text-center text-sm font-bold text-gray-800 outline-none focus:bg-gray-50"
      />
      <button
        type="button"
        aria-label="Artır"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="px-2.5 py-2 text-gray-400 transition-colors hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export default function CartPage() {
  const { cart, loading, updateQuantity, removeFromCart, clearCart } = useCart()

  const subtotal = (cart as any)?.total_amount || cart?.items?.reduce(
    (sum, item: any) => sum + (item.unit_price || item.price || 0) * item.quantity, 0
  ) || 0

  const cartItemsArr = (cart?.items || []) as any[]
  const totalQty = cartItemsArr.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
  const totalPV = cartItemsArr.reduce((sum, it) => sum + (Number(it.product?.pv ?? it.pv) || 0) * (Number(it.quantity) || 0), 0)
  const totalCV = cartItemsArr.reduce((sum, it) => sum + (Number(it.product?.cv ?? it.cv) || 0) * (Number(it.quantity) || 0), 0)

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!cart?.items?.length) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <ShoppingBag size={64} className="mx-auto text-gray-300 mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sepetiniz boş</h2>
          <p className="text-gray-500 mb-8">Alışverişe başlamak için ürünleri keşfedin.</p>
          <Link href="/products">
            <Button variant="brand" size="lg">
              <ArrowLeft size={18} />
              Alışverişe Başla
            </Button>
          </Link>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-brand-500">Ana Sayfa</Link>
          <span>/</span>
          <span className="text-gray-600">Sepet</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-8">Sepetim</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item: any) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
              >
                {/* Görsel */}
                <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                  {(item.product_image || item.product?.thumbnail) ? (
                    <Image
                      src={item.product_image || item.product?.thumbnail || '/images/shop/product-1-1.jpg'}
                      alt={item.product_name || item.product?.name || 'Ürün'}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBag size={30} className="text-gray-300" />
                  )}
                </div>

                {/* Detay */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.product_slug || item.product?.slug || '#'}`}
                    className="text-sm font-semibold text-gray-800 hover:text-brand-500 line-clamp-1"
                  >
                    {item.product_name || item.product?.name || 'Ürün'}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Stok: {item.stock_quantity ?? (item.product?.stock ?? '-')}
                  </p>
                  <p className="text-sm font-bold text-brand-500 mt-1">
                    {formatPrice(item.unit_price || item.price || 0)}
                  </p>
                </div>

                {/* Miktar — adet + altına PV/CV rozetleri */}
                <div className="flex flex-col items-center gap-1">
                  <QtyField
                    value={item.quantity}
                    stock={Number(item.stock_quantity ?? item.product?.stock) || 0}
                    onChange={(n) => updateQuantity(item.id, n)}
                  />
                  <div className="flex items-center gap-1">
                    <span className="bg-green-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                      {Number(item.product?.pv || item.pv) || 0} PV
                    </span>
                    <span className="bg-purple-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                      {Number(item.product?.cv || item.cv) || 0} CV
                    </span>
                  </div>
                </div>

                {/* Toplam */}
                <div className="text-right min-w-[80px]">
                  <p className="text-sm font-bold text-gray-800">
                    {formatPrice((item.unit_price || item.price || 0) * item.quantity)}
                  </p>
                </div>

                {/* Sil */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-3">
              <button
                onClick={clearCart}
                className="text-sm text-red-500 hover:text-red-600 ml-auto"
              >
                Sepeti Temizle
              </button>
            </div>
          </div>

          {/* Sipariş Özeti */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 h-fit sticky top-24">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Sipariş Özeti</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Ürün Sayısı</span>
                <span className="font-bold text-gray-800">{totalQty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ara Toplam</span>
                <span className="font-bold text-gray-800">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Kargo</span>
                <span className="font-bold text-green-600">Ücretsiz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Toplam PV</span>
                <span className="font-bold text-green-600">{totalPV} PV</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Toplam CV</span>
                <span className="font-bold text-purple-600">{totalCV} CV</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between text-base">
                <span className="font-bold text-gray-800">Toplam</span>
                <span className="font-bold text-brand-500">{formatPrice(subtotal)}</span>
              </div>
            </div>
            <Link href="/checkout" className="block mt-6">
              <Button variant="brand" size="lg" fullWidth>
                Ödemeye Geç
              </Button>
            </Link>
            <Link href="/products" className="block text-center text-sm text-gray-500 hover:text-brand-500 mt-3">
              Alışverişe Devam Et
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
