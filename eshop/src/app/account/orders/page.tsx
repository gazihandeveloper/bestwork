// ============================================
// BestWork - Siparişlerim
// ============================================
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, ChevronRight } from '@/lib/google-icons'
import { formatPrice, orderStatusColor, orderStatusText, get } from '@/lib/api'
import type { Order } from '@/types'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await get<Order[]>('/eshop/orders')
        if (res.success) setOrders(res.data || [])
      } catch {
        // API yok
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz siparişiniz yok</h3>
        <p className="text-sm text-gray-500 mb-6">Alışverişe başlayın, siparişleriniz burada görünecek.</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm font-bold text-white bg-brand-500 px-5 py-2.5 rounded-lg hover:bg-brand-600 transition-colors"
        >
          Alışverişe Başla
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Siparişlerim</h2>
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/account/orders/${order.id}`}
          className="block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-semibold text-gray-800">
                #{order.orderNumber}
              </span>
              <span className="text-xs text-gray-400 ml-3">
                {new Date(order.created_at || '').toLocaleDateString('tr-TR')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${orderStatusColor(order.status)}`}>
                {orderStatusText(order.status)}
              </span>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {order.items?.length || 0} ürün
            </span>
            <span className="font-bold text-gray-800">
              {formatPrice(order.total)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
