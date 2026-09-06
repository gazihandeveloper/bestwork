// ============================================
// BestWork - Admin Dashboard
// ============================================
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShoppingBag, ShoppingCart, Users, DollarSign, Package,
  Plus, TrendingUp, Clock, AlertCircle, CheckCircle,
} from '@/lib/google-icons'
import { formatPrice, orderStatusColor, orderStatusText, get } from '@/lib/api'
import type { DashboardStats } from '@/types'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await get<any>('/admin/dashboard')
        if (res.success) {
          const d = res.data
          // Backend snake_case → camelCase mapping
          setStats({
            totalOrders: d.total_orders || 0,
            totalRevenue: d.total_revenue || 0,
            totalUsers: d.total_customers || 0,
            totalProducts: d.total_products || 0,
            pendingOrders: d.pending_orders || 0,
            dailyOrders: d.daily_orders || 0,
            monthlyRevenue: d.monthly_revenue || 0,
            recentOrders: (d.recent_orders || []).map((o: any) => ({
              id: o.id, orderNumber: o.orderNumber, status: o.status, total: o.total, created_at: o.created_at,
            })),
            topProducts: (d.top_products || []).map((p: any) => ({
              id: p.id, name: p.name, price: p.price,
            })),
            dailySales: d.daily_sales || [],
            recentActivities: d.recent_activities || [],
          } as any)
        }
      } catch { /* */ }
      finally { setLoading(false) }
    }
    loadStats()
  }, [])

  const statCards = [
    { label: 'Toplam Gelir', value: stats?.totalRevenue ? formatPrice(stats.totalRevenue) : '0,00 TL', icon: DollarSign, color: 'bg-green-500' },
    { label: 'Toplam Sipariş', value: stats?.totalOrders?.toString() || '0', icon: ShoppingCart, color: 'bg-blue-500' },
    { label: 'Toplam Ürün', value: stats?.totalProducts?.toString() || '0', icon: Package, color: 'bg-purple-500' },
    { label: 'Toplam Kullanıcı', value: stats?.totalUsers?.toString() || '0', icon: Users, color: 'bg-orange-500' },
  ]

  const miniStats = [
    { label: 'Bekleyen Sipariş', value: stats?.pendingOrders || 0, icon: Clock, color: 'text-yellow-500 bg-yellow-50' },
    { label: 'Bugünkü Sipariş', value: stats?.dailyOrders || 0, icon: TrendingUp, color: 'text-green-500 bg-green-50' },
    { label: 'Aylık Gelir', value: stats?.monthlyRevenue ? formatPrice(stats.monthlyRevenue) : '0 TL', icon: DollarSign, color: 'text-blue-500 bg-blue-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Mağaza istatistiklerine genel bakış</p>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-sm text-gray-400 mt-1">{card.label}</p>
            </div>
          )
        })}
      </div>

      {/* Mini İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {miniStats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-lg font-bold text-gray-800">{s.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Hızlı Erişim */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: '/admin/products/new', icon: Plus, label: 'Yeni Ürün Ekle', sub: 'Ürün eklemek için tıklayın', bg: 'bg-brand-50', ic: 'text-brand-500' },
          { href: '/admin/orders', icon: ShoppingCart, label: 'Siparişler', sub: `${stats?.pendingOrders || 0} bekleyen sipariş`, bg: 'bg-blue-50', ic: 'text-blue-500' },
          { href: '/admin/products', icon: ShoppingBag, label: 'Ürünler', sub: `${stats?.totalProducts || 0} ürün`, bg: 'bg-purple-50', ic: 'text-purple-500' },
          { href: '/admin/users', icon: Users, label: 'Kullanıcılar', sub: `${stats?.totalUsers || 0} kayıtlı kullanıcı`, bg: 'bg-orange-50', ic: 'text-orange-500' },
        ].map((item) => {
          const I = item.icon
          return (
            <Link key={item.href} href={item.href}
              className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-all group">
              <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <I size={20} className={item.ic} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Satış Özeti + Son Etkinlikler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Satış Grafiği */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">Satış Özeti</h3>
            <span className="text-xs text-gray-400">Son 7 gün</span>
          </div>
          {(stats as any)?.dailySales?.length > 0 ? (
            <div className="flex items-end gap-2 h-48">
              {((stats as any)?.dailySales || []).map((d: any) => {
                const maxCount = Math.max(...((stats as any)?.dailySales || []).map((x: any) => x.count), 1)
                const h = maxCount > 0 ? (d.count / maxCount) * 100 : 0
                const dayName = new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short' })
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] text-gray-400">{d.count}</span>
                    <div className="w-full bg-gradient-to-t from-brand-400 to-brand-200 rounded-t-md transition-all" style={{ height: `${Math.max(h, 4)}%` }} />
                    <span className="text-[10px] text-gray-500 mt-1">{dayName}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-12">Henüz sipariş verisi yok</p>
          )}
        </div>

        {/* Son Etkinlikler */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Son Etkinlikler</h3>
          <div className="space-y-4">
            {((stats as any)?.recentActivities || []).length > 0 ? (
              ((stats as any)?.recentActivities || []).map((item: any, i: number) => {
                const icons: any = { order: CheckCircle, product: Package, user: Users }
                const colors: any = { order: 'text-green-500', product: 'text-purple-500', user: 'text-blue-500' }
                const I = icons[item.type] || Clock
                return (
                  <div key={i} className="flex gap-3">
                    <I size={16} className={`${colors[item.type] || 'text-gray-400'} mt-0.5 shrink-0`} />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 line-clamp-1">{item.text}</p>
                      <p className="text-[10px] text-gray-400">{item.time}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-center text-gray-400 py-4 text-sm">Henüz etkinlik yok</p>
            )}
          </div>
        </div>
      </div>

      {/* Son Siparişler & En Çok Satanlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Son Siparişler */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Son Siparişler</h3>
            <Link href="/admin/orders" className="text-sm text-brand-500 hover:underline">Tümünü Gör</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-3 font-semibold text-gray-600">Sipariş</th>
                  <th className="pb-3 font-semibold text-gray-600">Tarih</th>
                  <th className="pb-3 font-semibold text-gray-600">Tutar</th>
                  <th className="pb-3 font-semibold text-gray-600">Durum</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentOrders || []).length > 0 ? (
                  stats?.recentOrders?.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50">
                      <td className="py-3"><Link href={`/admin/orders/${order.id}`} className="font-bold text-gray-800 hover:text-brand-500">#{order.orderNumber}</Link></td>
                      <td className="py-3 text-gray-500">{new Date(order.created_at || '').toLocaleDateString('tr-TR')}</td>
                      <td className="py-3 font-semibold text-gray-800">{formatPrice(order.total)}</td>
                      <td className="py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${orderStatusColor(order.status)}`}>{orderStatusText(order.status)}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">Henüz sipariş bulunmuyor</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* En Çok Satanlar */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">En Çok Satanlar</h3>
            <Link href="/admin/products" className="text-sm text-brand-500 hover:underline">Tümünü Gör</Link>
          </div>
          {(stats?.topProducts || []).length > 0 ? (
            <div className="space-y-3">
              {stats?.topProducts?.map((product, i) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-300 w-5">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 line-clamp-1">{product.name}</p>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${Math.max(10, 100 - i * 25)}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{formatPrice(product.price)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">Veri bulunamadı</p>
          )}
        </div>
      </div>
    </div>
  )
}
