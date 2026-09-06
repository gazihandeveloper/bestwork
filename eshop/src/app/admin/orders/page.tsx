// ============================================
// BestWork - Admin Sipariş Listesi
// ============================================
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Eye, ShoppingCart, ShoppingBag, RotateCcw, Bell, Plus, Clock, CheckCircle, AlertCircle } from '@/lib/google-icons'
import { formatPrice, orderStatusColor, orderStatusText, get } from '@/lib/api'
import type { Order } from '@/types'

const orderCards = [
  { href: '/admin/orders', icon: CheckCircle, title: 'Gelen Siparişler', desc: 'Başarılı tüm siparişler', color: 'bg-green-50 text-green-500' },
  { href: '/admin/orders', icon: Clock, title: 'Tamamlanmayan Siparişler', desc: 'Ödeme sayfasına gitmiş ama almamışlar', color: 'bg-yellow-50 text-yellow-500' },
  { href: '/admin/orders/returns', icon: RotateCcw, title: 'İade Talepleri', desc: 'İade etmek istenen siparişler', color: 'bg-red-50 text-red-500' },
  { href: '/admin/orders/carts', icon: ShoppingCart, title: 'Canlı Sepet İzleme', desc: 'Müşteri sepetlerini inceleyin', color: 'bg-blue-50 text-blue-500' },
  { href: '/admin/orders/new', icon: Plus, title: 'Yeni Sipariş Oluştur', desc: 'Fiziksel satışları sisteme ekleyin', color: 'bg-purple-50 text-purple-500' },
  { href: '', icon: Bell, title: 'Sepet Hatırlatma', desc: 'Tamamlamayan müşterilere hatırlatın', color: 'bg-orange-50 text-orange-500', soon: true },
]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await get<Order[]>('/admin/orders')
        if (res.success) setOrders(res.data || [])
      } catch {
        // API yok
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [])

  const filtered = orders.filter((o) => {
    const matchesSearch = !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sipariş Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Tüm siparişleri yönetin</p>
        </div>
      </div>

      {/* Yönetim Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orderCards.map((card) => {
          const Icon = card.icon
          const content = (
            <div className={`bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all ${(card as any).soon ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                {(card as any).soon && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Yakında</span>}
              </div>
              <h3 className="text-sm font-bold text-gray-800">{card.title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{card.desc}</p>
            </div>
          )
          return (card as any).soon ? <div key={card.title}>{content}</div> : <Link key={card.title} href={card.href}>{content}</Link>
        })}
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Sipariş no ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
        >
          <option value="">Tüm Durumlar</option>
          <option value="pending">Beklemede</option>
          <option value="confirmed">Onaylandı</option>
          <option value="processing">Hazırlanıyor</option>
          <option value="shipped">Kargoya Verildi</option>
          <option value="delivered">Teslim Edildi</option>
          <option value="cancelled">İptal Edildi</option>
        </select>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Sipariş No</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Müşteri</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Ürün</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tutar</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Durum</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-5 bg-gray-200 rounded w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Sipariş bulunamadı
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-800">#{order.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-600">Müşteri #{order.userId}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(order.created_at || '').toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{order.items?.length || 0} ürün</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${orderStatusColor(order.status)}`}>
                        {orderStatusText(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-brand-500 hover:text-brand-600 text-xs font-bold"
                      >
                        <Eye size={14} /> Detay
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
