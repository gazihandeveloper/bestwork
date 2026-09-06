// ============================================
// BestWork - Referans ve Ekip Ağacı — BestWork (yeni tasarım)
// Sponsorluğunuzla gelen tüm üyeler ve durumları.
// ============================================
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { House, Users, Search, ShieldCheck, ShoppingBag, CircleCheck, Clock, Package as PackageIcon } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { get } from '@/lib/api'

interface TeamUser {
  id: number
  name?: string
  email?: string
  member_code?: string
  role?: string
  package_id?: number | null
  package_name?: string
  is_active?: boolean
  is_in_pending_pool?: boolean
  total_pv_accumulated?: number
}

function initials(name?: string) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR')
}

export default function SponsorTreePage() {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    get<{ count: number; users: TeamUser[] }>('/eshop/sponsored')
      .then((r) => {
        if (r.success && r.data) setUsers(Array.isArray(r.data.users) ? r.data.users : [])
        else if (r?.error) setError(r.error)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ekip yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    if (!q) return users
    return users.filter((u) =>
      `${u.name} ${u.member_code} ${u.email}`.toLocaleLowerCase('tr-TR').includes(q),
    )
  }, [users, query])

  const activeCount = users.filter((u) => u.is_active !== false && !u.is_in_pending_pool).length
  const pendingCount = users.filter((u) => u.is_in_pending_pool).length
  const packedCount = users.filter((u) => u.package_id != null).length
  const totalPV = users.reduce((s, u) => s + (Number(u.total_pv_accumulated) || 0), 0)

  const statCards = [
    { label: 'Toplam Üye', value: users.length, icon: <Users size={18} />, cls: 'bg-brand-50 text-brand-600' },
    { label: 'Aktif / Ağaçta', value: activeCount, icon: <CircleCheck size={18} />, cls: 'bg-green-50 text-green-600' },
    { label: 'Bekleyen', value: pendingCount, icon: <Clock size={18} />, cls: 'bg-amber-50 text-amber-600' },
    { label: 'Paketli', value: packedCount, icon: <PackageIcon size={18} />, cls: 'bg-blue-50 text-blue-600' },
    { label: 'Toplam PV', value: totalPV.toLocaleString('tr-TR'), icon: <PackageIcon size={18} />, cls: 'bg-violet-50 text-violet-600' },
  ]

  const roleBadge = (u: TeamUser) => {
    if (u.role === 'admin' || u.role === 'super_admin')
      return { label: 'Admin', icon: <ShieldCheck size={12} />, cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
    if (u.role === 'customer')
      return { label: 'Müşteri', icon: <ShoppingBag size={12} />, cls: 'bg-green-50 text-green-700 ring-green-200' }
    return { label: 'Üye', icon: <Users size={12} />, cls: 'bg-blue-50 text-blue-700 ring-blue-200' }
  }

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <Users size={24} className="text-brand-600" /> Referans ve Ekip Ağacı
          </h1>
          <p className="text-sm text-gray-400">
            Sponsorluğunuzla gelen üyeler ve onların referansları ({users.length} kişi). Müşteriler de zincirde görünür.
          </p>
        </div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
            <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${c.cls}`}>{c.icon}</span>
            <p className="text-lg font-extrabold text-gray-900">{c.value}</p>
            <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Arama */}
      <div className="relative max-w-sm">
        <Search size={17} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="İsim, üye no veya e-posta ara..."
          className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-4 pl-10 text-sm placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <Users size={40} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">{users.length === 0 ? 'Henüz üye yok.' : 'Aramanızla eşleşen üye yok.'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col">
            {filtered.map((u) => {
              const rb = roleBadge(u)
              const dim = u.is_active === false
              return (
                <div
                  key={u.id}
                  className={`flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 px-4 py-3 transition-colors last:border-b-0 hover:bg-brand-50/30 ${
                    dim ? 'opacity-55' : ''
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-700">
                      {initials(u.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-gray-800">
                        {u.name || '—'}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${rb.cls}`}>
                          {rb.icon}
                          {rb.label}
                        </span>
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        <span className="font-mono">{u.member_code || '-'}</span>
                        {u.email ? ` · ${u.email}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {u.package_id != null && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                        Paketli
                      </span>
                    )}
                    {u.is_in_pending_pool ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Bekliyor
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          dim ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                        }`}
                      >
                        {dim ? 'Pasif' : 'Aktif'}
                      </span>
                    )}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                      {(Number(u.total_pv_accumulated) || 0).toLocaleString('tr-TR')} PV
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
