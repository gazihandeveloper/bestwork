// ============================================
// BestWork - Prim Detayları (BestWork) — yeni tasarım
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { House, Users, GitFork, Trophy, ChevronLeft, ChevronRight, Receipt } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { get } from '@/lib/api'
import { rawGet } from '@/lib/raw'

interface CommissionItem {
  id: number
  type: string
  amount: number
  related_cv: number | null
  status: string
  created_at: string
}

interface DashTotals {
  total_referral_earnings?: number
  total_binary_earnings?: number
  total_matching_earnings?: number
}

const tl = (v?: number) =>
  (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'

const cv = (v?: number | null) => (v != null ? `${Number(v).toLocaleString('tr-TR')} CV` : '—')

const TYPE_META: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  referral: {
    label: 'Referans',
    cls: 'bg-green-50 text-green-700 ring-green-200',
    icon: <Users size={14} />,
  },
  binary: {
    label: 'Binary',
    cls: 'bg-blue-50 text-blue-700 ring-blue-200',
    icon: <GitFork size={14} />,
  },
  matching: {
    label: 'Matching',
    cls: 'bg-amber-50 text-amber-700 ring-amber-200',
    icon: <Trophy size={14} />,
  },
}

export default function CommissionsPage() {
  const [items, setItems] = useState<CommissionItem[]>([])
  const [total, setTotal] = useState(0)
  const [type, setType] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totals, setTotals] = useState<DashTotals | null>(null)
  const limit = 10

  // Dashboard linklerinden gelen ?type= filtre
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('type') || ''
    if (t) setType(t)
  }, [])

  useEffect(() => {
    get<DashTotals>('/eshop/dashboard')
      .then((r) => {
        if (r.success && r.data) setTotals(r.data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    const q = new URLSearchParams({ limit: String(limit), offset: String(page * limit) })
    if (type) q.set('type', type)
    rawGet<{ commissions?: CommissionItem[]; total?: number }>(`/commissions?${q.toString()}`)
      .then((r) => {
        if (!alive) return
        setItems(Array.isArray(r.commissions) ? r.commissions : [])
        setTotal(Number(r.total) || 0)
        setError('')
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Komisyonlar yüklenemedi.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, page])

  const sum =
    Number(totals?.total_referral_earnings) +
    Number(totals?.total_binary_earnings) +
    Number(totals?.total_matching_earnings)

  const filterBtn = (active: boolean) =>
    `cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
      active ? 'bg-brand-600 text-white shadow' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
    }`

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-gray-900">Prim Detayları</h1>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-4 text-white shadow-md">
          <p className="text-[11px] font-bold tracking-wider text-white/80 uppercase">Toplam Prim</p>
          <p className="mt-1 text-xl font-extrabold">{tl(sum)}</p>
        </div>
        {[
          { label: 'Referans', value: totals?.total_referral_earnings, icon: <Users size={18} />, cls: 'bg-green-50 text-green-600' },
          { label: 'Binary', value: totals?.total_binary_earnings, icon: <GitFork size={18} />, cls: 'bg-blue-50 text-blue-600' },
          { label: 'Matching', value: totals?.total_matching_earnings, icon: <Trophy size={18} />, cls: 'bg-amber-50 text-amber-600' },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.cls}`}>{c.icon}</span>
              <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">{c.label}</p>
            </div>
            <p className="mt-1.5 text-lg font-extrabold text-gray-900">{tl(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400">
          <Receipt size={14} /> Filtre:
        </span>
        {[
          { value: '', label: 'Tümü' },
          { value: 'referral', label: 'Referans' },
          { value: 'binary', label: 'Binary' },
          { value: 'matching', label: 'Matching' },
        ].map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setType(t.value)
              setPage(0)
            }}
            className={filterBtn(type === t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      {/* Liste */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="bg-gray-900 text-left text-white">
                <th className="px-4 py-2.5 font-bold">Tarih</th>
                <th className="px-4 py-2.5 font-bold">Tür</th>
                <th className="px-4 py-2.5 text-right font-bold">İlgili CV</th>
                <th className="px-4 py-2.5 text-right font-bold">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center">
                    <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                    Bu filtrede komisyon kaydı yok.
                  </td>
                </tr>
              ) : (
                items.map((c, i) => {
                  const meta = TYPE_META[c.type] ?? {
                    label: c.type,
                    cls: 'bg-gray-100 text-gray-600 ring-gray-200',
                    icon: <Receipt size={14} />,
                  }
                  return (
                    <tr key={c.id} className={`border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''} hover:bg-brand-50/40`}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                        {new Date(c.created_at).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${meta.cls}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{cv(c.related_cv)}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-extrabold text-green-600">+{tl(c.amount)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-sm">
          <span className="text-gray-400">
            {items.length === 0
              ? '0-0 / 0 kayıt'
              : `${page * limit + 1}-${Math.min((page + 1) * limit, total)} / ${total.toLocaleString('tr-TR')} kayıt`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} /> Önceki
            </button>
            <button
              type="button"
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sonraki <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
