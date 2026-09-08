// ============================================
// BestWork - Yerleşim Bekleyenler — BestWork
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { House, Clock, TriangleAlert, ChevronsLeft, ChevronsRight } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { get } from '@/lib/api'
import { rawPost } from '@/lib/raw'
import toast from 'react-hot-toast'

interface PendingUser {
  id: number
  name?: string
  email?: string
  member_code?: string
  pending_since?: string | null
  total_pv_accumulated?: number
  total_cv_accumulated?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export default function PendingPage() {
  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [placing, setPlacing] = useState<number | null>(null)

  const load = () => {
    get<PendingUser[]>('/eshop/pending-pool')
      .then((r) => {
        if (r.success && Array.isArray(r.data)) setUsers(r.data)
        else if (r?.error) setError(r.error)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Bekleyenler yüklenemedi.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
     
  }, [])

  const place = async (userId: number, position: 'L' | 'R', name: string) => {
    setPlacing(userId)
    setError('')
    try {
      await rawPost<{ message?: string }>('/pending-pool/place', { user_id: userId, position })
      toast.success(`${name}, ${position === 'L' ? 'sol' : 'sağ'} bacağa yerleştirildi.`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Yerleştirme başarısız.')
      load()
    } finally {
      setPlacing(null)
    }
  }

  const now = Date.now()
  const overdueCount = users.filter((u) => {
    if (!u.pending_since) return false
    return (now - new Date(u.pending_since).getTime()) / DAY_MS > 10
  }).length

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <Clock size={24} className="text-brand-600" /> Yerleşim Bekleyenler
          </h1>
          <p className="text-sm text-gray-400">
            Sponsorluğunuzu yaptığınız ve henüz ağaca yerleştirmediğiniz üyeler. Sol veya sağ bacağa yerleştirin.
          </p>
        </div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-4 text-white shadow-md">
          <p className="text-[11px] font-bold tracking-wider text-white/80 uppercase">Bekleyen Üye</p>
          <p className="mt-1 text-xl font-extrabold">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">10+ Gün Bekleyen</p>
          <p className={`mt-1 text-xl font-extrabold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueCount}</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:col-span-1">
          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Yerleşim Kuralı</p>
          <p className="mt-1 text-sm font-semibold text-gray-600">Üyeler eklendikleri ay içinde yerleştirilmelidir.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <Clock size={40} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">Bekleyen üyeniz yok. 🎉</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((u) => {
            const ms = u.pending_since ? now - new Date(u.pending_since).getTime() : 0
            const days = Math.max(0, Math.floor(ms / DAY_MS))
            const overdue = days > 10
            const busy = placing === u.id
            return (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-gray-900">{u.name || '—'}</h3>
                    {overdue && <TriangleAlert size={16} className="shrink-0 text-red-500" />}
                  </div>
                  <p className="truncate text-xs text-gray-400">
                    {u.email || ''}
                    {u.email && u.member_code ? ' · ' : ''}
                    <span className="font-mono">{u.member_code || ''}</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                      {(Number(u.total_pv_accumulated) || 0).toLocaleString('tr-TR')} PV
                    </span>
                    <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">
                      {(Number(u.total_cv_accumulated) || 0).toLocaleString('tr-TR')} CV
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        overdue ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {days} gündür bekliyor
                    </span>
                  </div>
                  {overdue && (
                    <p className="mt-1 text-xs font-bold text-red-600">10 günden fazladır bekliyor!</p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => place(u.id, 'L', u.name || '')}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronsLeft size={16} /> {busy ? 'Yerleştiriliyor...' : 'Sola Yerleştir'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => place(u.id, 'R', u.name || '')}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sağa Yerleştir <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
