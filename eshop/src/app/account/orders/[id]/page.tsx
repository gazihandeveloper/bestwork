// ============================================
// BestWork - Sipariş Detayı
// ============================================
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { ArrowLeft, Package } from '@/lib/google-icons'
import { formatPrice, orderStatusColor, orderStatusText, get } from '@/lib/api'
import type { Order } from '@/types'

export default function OrderDetailPage() {
  const params = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await get<Order>(`/eshop/orders/${params.id}`)
        if (res.success) setOrder(res.data)
      } catch {
        // API yok
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [params.id])

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-40 bg-gray-200 rounded-xl" />
    </div>
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-800">Sipariş bulunamadı</h3>
        <Link href="/account/orders" className="text-brand-500 hover:underline text-sm mt-2 inline-block">
          Siparişlerime dön
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500"
      >
        <ArrowLeft size={16} /> Siparişlerime Dön
      </Link>

      {/* Sipariş Bilgisi */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Sipariş #{order.orderNumber}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(order.created_at || '').toLocaleDateString('tr-TR', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
          <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${orderStatusColor(order.status)}`}>
            {orderStatusText(order.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Sipariş Tutarı</span>
            <p className="font-bold text-gray-800 mt-0.5">{formatPrice(order.total)}</p>
          </div>
          <div>
            <span className="text-gray-400">Ödeme</span>
            <p className="font-bold text-gray-800 mt-0.5 capitalize">{order.paymentMethod === 'credit-card' ? 'Kredi Kartı' : order.paymentMethod}</p>
          </div>
          <div>
            <span className="text-gray-400">Durum</span>
            <p className="font-bold text-gray-800 mt-0.5">{order.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}</p>
          </div>
          <div>
            <span className="text-gray-400">Kargo</span>
            <p className="font-bold text-gray-800 mt-0.5">{order.trackingNumber || 'Henüz gönderilmedi'}</p>
          </div>
        </div>
      </div>

      {/* Ürünler */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Sipariş İçeriği</h3>
        <div className="space-y-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
              <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                <Image
                  src={item.productImage || '/images/shop/thumbnail-1.jpg'}
                  alt={item.productName}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.productId}`} className="text-sm font-semibold text-gray-800 hover:text-brand-500 line-clamp-1">
                  {item.productName}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">Adet: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-800">{formatPrice(item.total)}</p>
                <p className="text-xs text-gray-400">{formatPrice(item.price)} / adet</p>
              </div>
            </div>
          ))}
        </div>

        <hr className="border-gray-100 my-4" />
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Ara Toplam</span>
            <span className="font-bold">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Kargo</span>
            <span className="font-bold">{order.shipping > 0 ? formatPrice(order.shipping) : 'Ücretsiz'}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">İndirim</span>
              <span className="font-bold text-red-500">-{formatPrice(order.discount)}</span>
            </div>
          )}
          <hr className="border-gray-100" />
          <div className="flex justify-between text-base">
            <span className="font-bold text-gray-800">Toplam</span>
            <span className="font-bold text-brand-500">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Teslimat Adresi */}
      {order.shippingAddress && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Teslimat Adresi</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-bold text-gray-800">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.address}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.district}</p>
            <p>{order.shippingAddress.phone}</p>
          </div>
        </div>
      )}
    </div>
  )
}
