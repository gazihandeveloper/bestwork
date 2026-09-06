// ============================================
// BestWork - Admin Kullanıcı Detayı
// ============================================
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, Calendar, Shield, User as UserIcon } from '@/lib/google-icons'
import { formatPrice, get } from '@/lib/api'
import type { User, Order, Wallet } from '@/types'

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const [userRes, ordersRes, walletRes] = await Promise.all([
          get<User>(`/admin/users/${params.id}`),
          get<Order[]>(`/admin/users/${params.id}/orders`),
          get<Wallet>(`/admin/users/${params.id}/wallet`),
        ])
        if (userRes.success) setUser(userRes.data)
        if (ordersRes.success) setOrders(ordersRes.data || [])
        if (walletRes.success) setWallet(walletRes.data)
      } catch {
        // API yok
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [params.id])

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-48 bg-gray-200 rounded-xl" />
    </div>
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Kullanıcı bulunamadı</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500">
        <ArrowLeft size={16} /> Geri
      </button>

      {/* Profil */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-brand-600">{user.fullName?.charAt(0) || '?'}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">{user.fullName || user.email}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Mail size={14} /> {user.email}</span>
              {user.phone && <span className="flex items-center gap-1"><Phone size={14} /> {user.phone}</span>}
            </div>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              user.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-600'
            }`}>
              {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
            </span>
            <p className="text-xs text-gray-400 mt-2">
              <Calendar size={12} className="inline mr-1" />
              {new Date(user.created_at || '').toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>
      </div>

      {/* Cüzdan */}
      <div className="bg-gradient-to-r from-brand-500 to-green-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <UserIcon size={18} className="opacity-75" />
          <span className="text-sm opacity-90">Cüzdan Bakiyesi</span>
        </div>
        <p className="text-3xl font-bold">{wallet ? formatPrice(wallet.balance) : formatPrice(0)}</p>
      </div>

      {/* Son Siparişler */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Son Siparişler</h3>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Henüz sipariş yok</p>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-bold text-gray-800">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at || '').toLocaleDateString('tr-TR')}</p>
                </div>
                <span className="text-sm font-bold text-gray-800">{formatPrice(order.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
