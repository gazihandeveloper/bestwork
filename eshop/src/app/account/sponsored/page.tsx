// ============================================
// BestWork - Sponsor Olduklarım (BestWork)
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { House, UserPlus, Users } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { get } from '@/lib/api'

interface SponsoredUser {
  id: number
  name?: string
  email?: string
  member_code?: string
  is_in_pending_pool?: boolean
  total_pv_accumulated?: number
  created_at?: string
}

export default function SponsoredPage() {
  const [users, setUsers] = useState<SponsoredUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    get<{ count: number; users: SponsoredUser[] }>('/eshop/sponsored')
      .then((r) => {
        if (r.success && r.data) setUsers(Array.isArray(r.data.users) ? r.data.users : [])
        else if (r?.error) setError(r.error)
      })
      .catch(() => setError('Sponsorlar yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (v?: number) => (Number(v) || 0).toLocaleString('tr-TR')

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <UserPlus size={22} className="text-brand-600" /> Sponsor Olduklarım
          </h1>
          <p className="text-sm text-gray-400">Sponsorluğunu yaptığınız üyeler ({users.length} kişi).</p>
        </div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-10 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <Users size={40} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">Henüz sponsor olduğunuz üye yok.</p>
          <p className="mt-1 text-xs text-gray-300">
            Üye kayıt linkinizle gelen herkes burada listelenir.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {users.map((u) => {
            const pending = !!u.is_in_pending_pool
            return (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800">{u.name || '—'}</p>
                  <p className="truncate text-xs text-gray-400">
                    {u.email || '—'} · <span className="font-mono">{u.member_code || '-'}</span>
                    {u.created_at && (
                      <>
                        {' '}
                        · {new Date(u.created_at).toLocaleDateString('tr-TR')}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      pending ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                    }`}
                  >
                    {pending ? 'Bekliyor' : 'Ağaçta'}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
                    {fmt(u.total_pv_accumulated)} PV
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
