// ============================================
// BestWork - Admin Sipariş Detayı
// ============================================
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Package } from '@/lib/google-icons'
import { Button } from '@/components/ui/Button'
import { formatPrice, orderStatusColor, orderStatusText, get, put } from '@/lib/api'
import type { Order } from '@/types'
import toast from 'react-hot-toast'

export default function AdminOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await get<Order>(`/admin/orders/${params.id}`)
        if (res.success) setOrder(res.data)
      } catch {
        // API yok
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [params.id])

  const updateStatus = async (status: string) => {
    setUpdating(true)
    const res = await put(`/admin/orders/${params.id}`, { status })
    if (res.success) {
      setOrder({ ...order!, status: status as Order['status'] })
      toast.success('Sipariş durumu güncellendi')
    } else {
      toast.error(res.error || 'Güncellenemedi')
    }
    setUpdating(false)
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-800">Sipariş bulunamadı</h3>
        <Link href="/admin/orders" className="text-brand-500 hover:underline text-sm mt-2 inline-block">
          Siparişlere dön
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sipariş #{order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            {new Date(order.created_at || '').toLocaleDateString('tr-TR', {
              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
        <span className={`ml-auto text-sm font-bold px-3 py-1.5 rounded-full ${orderStatusColor(order.status)}`}>
          {orderStatusText(order.status)}
        </span>
      </div>

      {/* Durum Güncelleme */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Durum Güncelle</h3>
        <div className="flex flex-wrap gap-2">
          {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => updateStatus(status)}
              disabled={updating || order.status === status}
              className={`px-4 py-2 text-sm rounded-lg font-bold transition-colors ${
                order.status === status
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {orderStatusText(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Sipariş İçeriği */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Sipariş İçeriği</h3>
        <div className="space-y-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
              <Image src={item.productImage || '/images/shop/thumbnail-1.jpg'} alt={item.productName} width={48} height={48} className="w-12 h-12 object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{item.productName}</p>
                <p className="text-xs text-gray-400">{item.quantity} adet × {formatPrice(item.price)}</p>
              </div>
              <p className="text-sm font-bold text-gray-800">{formatPrice(item.total)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ödeme & Adres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Ödeme Bilgileri</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Ara Toplam</span><span className="font-bold">{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Kargo</span><span className="font-bold">{order.shipping > 0 ? formatPrice(order.shipping) : 'Ücretsiz'}</span></div>
            {order.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">İndirim</span><span className="text-red-500">-{formatPrice(order.discount)}</span></div>}
            <hr className="border-gray-100" />
            <div className="flex justify-between text-base"><span className="font-bold text-gray-800">Toplam</span><span className="font-bold text-brand-500">{formatPrice(order.total)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ödeme Yöntemi</span><span className="font-bold capitalize">{order.paymentMethod}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ödeme Durumu</span><span className={`font-bold ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>{order.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Teslimat Adresi</h3>
          {order.shippingAddress ? (
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-bold text-gray-800">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.address}</p>
              <p>{order.shippingAddress.city} / {order.shippingAddress.district}</p>
              <p>{order.shippingAddress.phone}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Adres bilgisi yok</p>
          )}
          {order.trackingNumber && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Kargo Takip No: <span className="font-bold text-gray-800">{order.trackingNumber}</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
