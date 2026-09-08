// ============================================
// BestWork - Ödeme Sayfası
// ============================================
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CreditCard, Truck, ShieldCheck } from '@/lib/google-icons'
import { MainLayout } from '@/app/main-layout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatPrice } from '@/lib/api'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'

export default function CheckoutPage() {
  const router = useRouter()
  const { cart } = useCart()
  const { isAuthenticated } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const subtotal = cart?.items?.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ) || 0

  if (!cart?.items?.length) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-gray-800">Sepetiniz boş</h2>
          <Link href="/products" className="text-brand-500 hover:underline mt-4 inline-block">
            Alışverişe başla
          </Link>
        </div>
      </MainLayout>
    )
  }

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    const fd = new FormData(e.currentTarget as HTMLFormElement)
    const method = String(fd.get('payment') || 'transfer')
    if (method !== 'transfer') {
      setError('Kredi kartı / kapıda ödeme henüz aktif değil. Lütfen Havale / EFT seçin.')
      return
    }
    setSubmitting(true)
    try {
      const items = cart.items.map((it) => ({
        product_id: Number(it.productId ?? it.product?.id),
        quantity: it.quantity,
      }))
      const res = await fetch('/api/orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, payment_method: 'eft_havale', retail: false }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Sipariş oluşturulamadı')
      router.push('/account/orders')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sipariş oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Ödeme</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sol - Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Teslimat Adresi */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Truck size={20} className="text-brand-500" />
                  Teslimat Adresi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Ad Soyad" placeholder="Adınız Soyadınız" required />
                  <Input label="Telefon" placeholder="05XX XXX XX XX" required />
                  <Input label="İl" placeholder="İl" required />
                  <Input label="İlçe" placeholder="İlçe" required />
                  <div className="md:col-span-2">
                    <Input label="Adres" placeholder="Mahalle, Sokak, No, Daire" required />
                  </div>
                  <Input label="Posta Kodu" placeholder="34XXX" />
                </div>
              </div>

              {/* Ödeme Yöntemi */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <CreditCard size={20} className="text-brand-500" />
                  Ödeme Yöntemi
                </h3>
                <p className="text-xs text-gray-400 mb-2">
                  Şu an yalnızca Havale / EFT ile sipariş alınabilmektedir.
                </p>
                <div className="space-y-3">
                  {[
                    { id: 'credit-card', label: 'Kredi Kartı / Banka Kartı', icon: '/images/theme/payment-method.png' },
                    { id: 'transfer', label: 'Havale / EFT' },
                    { id: 'cod', label: 'Kapıda Ödeme' },
                  ].map((method) => (
                    <label
                      key={method.id}
                      className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-brand-200 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
                    >
                      <input
                        type="radio"
                        name="payment"
                        defaultChecked={method.id === 'transfer'}
                        className="text-brand-500 focus:ring-brand-300"
                      />
                      <span className="text-sm font-bold text-gray-700">{method.label}</span>
                      {method.icon && (
                        <Image src={method.icon} alt="Kartlar" width={120} height={24} className="ml-auto h-5 w-auto" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Sipariş Notu */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Sipariş Notu (İsteğe bağlı)
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                  placeholder="Siparişinizle ilgili not..."
                />
              </div>
            </div>

            {/* Sağ - Sipariş Özeti */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 h-fit sticky top-24">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Sipariş Özeti</h3>

              {/* Ürünler */}
              <div className="space-y-3 mb-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={item.product.thumbnail || '/images/shop/thumbnail-1.jpg'}
                        alt={item.product.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-700 line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-gray-400">Adet: {item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <hr className="border-gray-100 mb-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ara Toplam</span>
                  <span className="font-bold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kargo</span>
                  <span className="font-bold text-green-600">Ücretsiz</span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between text-base">
                  <span className="font-bold text-gray-800">Toplam</span>
                  <span className="font-bold text-brand-500">
                    {formatPrice(cart.total || subtotal)}
                  </span>
                </div>
              </div>

              {error && (
                <p className="mt-4 text-xs font-medium text-red-600">{error}</p>
              )}
              <Button
                type="submit"
                variant="brand"
                size="lg"
                fullWidth
                loading={submitting}
                className="mt-6"
              >
                <ShieldCheck size={18} />
                Güvenli Ödeme
              </Button>

              <p className="text-[10px] text-gray-400 text-center mt-3">
                Ödeme sayfanız güvenli bağlantı ile korunmaktadır.
              </p>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  )
}
