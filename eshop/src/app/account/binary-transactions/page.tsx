// ============================================
// BestWork - Binary Hareketleri — BestWork
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { House, TrendingUp, TrendingDown, RefreshCw, ChevronLeft, ChevronRight, GitFork } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { rawGet } from '@/lib/raw'

interface BinTxn {
  id: number
  position: 'L' | 'R'
  transaction_type: 'add' | 'deduct' | 'reset'
  pv: number
  cv: number
  description: string | null
  related_order_id: number | null
  created_at: string
}

const TYPE_META: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  add: { label: 'Ekleme', cls: 'bg-green-50 text-green-700 ring-green-200', icon: <TrendingUp size={14} /> },
  deduct: { label: 'Eşleşme Düşümü', cls: 'bg-red-50 text-red-700 ring-red-200', icon: <TrendingDown size={14} /> },
  reset: { label: 'Sıfırlama', cls: 'bg-amber-50 text-amber-700 ring-amber-200', icon: <RefreshCw size={14} /> },
}

export default function BinaryTransactionsPage() {
  const [items, setItems] = useState<BinTxn[]>([])
  const [total, setTotal] = useState(0)
  const [position, setPosition] = useState('')
  const [txType, setTxType] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const limit = 10

  useEffect(() => {
    let alive = true
    setLoading(true)
    const q = new URLSearchParams({ limit: String(limit), offset: String(page * limit) })
    if (position) q.set('position', position)
    if (txType) q.set('transaction_type', txType)
    rawGet<{ transactions?: BinTxn[]; total?: number }>(`/binary-transactions?${q.toString()}`)
      .then((r) => {
        if (!alive) return
        setItems(Array.isArray(r.transactions) ? r.transactions : [])
        setTotal(Number(r.total) || 0)
        setError('')
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Hareketler yüklenemedi.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, txType, page])

  const addCV = items.filter((t) => t.transaction_type === 'add').reduce((s, t) => s + (Number(t.cv) || 0), 0)
  const deductCV = items.filter((t) => t.transaction_type === 'deduct').reduce((s, t) => s + (Number(t.cv) || 0), 0)
  const hasDeduct = items.some((t) => t.transaction_type === 'deduct')

  const filterBtn = (active: boolean) =>
    `cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
      active ? 'bg-brand-600 text-white shadow' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
    }`

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Binary Hareketleri</h1>
          <p className="text-sm text-gray-400">Sol ve sağ hatlarınızdaki PV/CV ekleme ve eşleşme düşümlerinin geçmişi.</p>
        </div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-4 text-white shadow-md">
          <p className="text-[11px] font-bold tracking-wider text-white/80 uppercase">Toplam Hareket</p>
          <p className="mt-1 text-xl font-extrabold">{total.toLocaleString('tr-TR')}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <TrendingUp size={18} />
            </span>
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Ekleme CV (sayfa)</p>
          </div>
          <p className="mt-1.5 text-lg font-extrabold text-green-600">{addCV.toLocaleString('tr-TR')} CV</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <TrendingDown size={18} />
            </span>
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Düşüm CV (sayfa)</p>
          </div>
          <p className="mt-1.5 text-lg font-extrabold text-red-600">
            {hasDeduct ? `${deductCV.toLocaleString('tr-TR')} CV` : '0 CV'}
          </p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1 text-xs font-bold text-gray-400">
          <GitFork size={14} /> Hat:
        </span>
        {[
          { value: '', label: 'Tüm Hatlar' },
          { value: 'L', label: 'Sol' },
          { value: 'R', label: 'Sağ' },
        ].map((t) => (
          <button key={`p-${t.value}`} type="button" onClick={() => { setPosition(t.value); setPage(0) }} className={filterBtn(position === t.value)}>
            {t.label}
          </button>
        ))}
        <span className="mx-2 h-5 w-px bg-gray-200" />
        {[
          { value: '', label: 'Tümü' },
          { value: 'add', label: 'Ekleme' },
          { value: 'deduct', label: 'Düşüm' },
        ].map((t) => (
          <button key={`t-${t.value}`} type="button" onClick={() => { setTxType(t.value); setPage(0) }} className={filterBtn(txType === t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="bg-gray-900 text-left text-white">
                <th className="px-4 py-2.5 font-bold">Tarih</th>
                <th className="px-4 py-2.5 font-bold">Hat</th>
                <th className="px-4 py-2.5 font-bold">İşlem</th>
                <th className="px-4 py-2.5 text-right font-bold">PV</th>
                <th className="px-4 py-2.5 text-right font-bold">CV</th>
                <th className="px-4 py-2.5 font-bold">Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    Henüz binary hareketi yok.
                  </td>
                </tr>
              ) : (
                items.map((t, i) => {
                  const meta = TYPE_META[t.transaction_type] ?? {
                    label: t.transaction_type,
                    cls: 'bg-gray-100 text-gray-600 ring-gray-200',
                    icon: <RefreshCw size={14} />,
                  }
                  return (
                    <tr key={t.id} className={`border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''} hover:bg-brand-50/40`}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                        {new Date(t.created_at).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${
                            t.position === 'L'
                              ? 'bg-blue-50 text-blue-700 ring-blue-200'
                              : 'bg-amber-50 text-amber-700 ring-amber-200'
                          }`}
                        >
                          {t.position === 'L' ? 'Sol Hat' : 'Sağ Hat'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${meta.cls}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {t.pv > 0 ? (
                          <span className="font-extrabold text-green-600">+{Number(t.pv).toLocaleString('tr-TR')} PV</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {t.cv > 0 ? (
                          <span className="font-extrabold text-brand-600">+{Number(t.cv).toLocaleString('tr-TR')} CV</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="max-w-[240px] px-4 py-2.5 text-gray-500">
                        <span className="block truncate">
                          {t.description || '—'}
                          {t.related_order_id != null && ` · Sipariş #${t.related_order_id}`}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-sm">
          <span className="text-gray-400">
            {items.length === 0
              ? '0-0 / 0 hareket'
              : `${page * limit + 1}-${Math.min((page + 1) * limit, total)} / ${total.toLocaleString('tr-TR')} hareket`}
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
