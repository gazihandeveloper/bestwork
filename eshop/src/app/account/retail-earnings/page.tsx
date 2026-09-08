// ============================================
// BestWork - Müşteri (Perakende) Kazancı — BestWork (yeni tasarım)
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { House, ShoppingBag, ChevronLeft, ChevronRight, CalendarDays, Receipt } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { rawGet } from '@/lib/raw'

interface RetailItem {
  commission_id: number
  customer_id: number
  customer_name: string
  customer_member_code: string
  order_id: number | null
  order_amount: number | null
  related_cv: number | null
  amount: number
  created_at: string
}

interface RetailData {
  summary?: { total_amount?: number; order_count?: number; total_cv?: number }
  items?: RetailItem[]
  total?: number
  limit?: number
  offset?: number
}

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function RetailEarningsPage() {
  const [data, setData] = useState<RetailData | null>(null)
  const [month, setMonth] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const limit = 10

  useEffect(() => {
    setMonth(currentMonth())
     
  }, [])

  useEffect(() => {
    if (!month) return
    let alive = true
    setLoading(true)
    const q = new URLSearchParams({ month, limit: String(limit), offset: String(page * limit) })
    rawGet<RetailData>(`/retail-earnings?${q.toString()}`)
      .then((r) => {
        if (!alive) return
        setData(r)
        setError('')
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Kazançlar yüklenemedi.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
     
  }, [month, page])

  const summary = data?.summary ?? {}
  const totalRecords = Number(data?.total) || 0

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <ShoppingBag size={24} className="text-brand-600" /> Müşteri Kazancı
          </h1>
          <p className="text-sm text-gray-400">Referans kodunuzla gelen müşterilerin siparişlerinden perakende kazancınız.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600">
            <CalendarDays size={17} className="text-brand-600" /> Ay
          </span>
          <input
            type="month"
            value={month}
            max={currentMonth()}
            onChange={(e) => {
              if (e.target.value) {
                setMonth(e.target.value)
                setPage(0)
              }
            }}
            className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <House size={16} /> Anasayfa
          </Link>
        </div>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-4 text-white shadow-md">
          <p className="text-[11px] font-bold tracking-wider text-white/80 uppercase">Toplam Kazanç</p>
          <p className="mt-1 text-xl font-extrabold">
            {(Number(summary.total_amount) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Müşteri Siparişi</p>
          <p className="mt-1 text-xl font-extrabold text-gray-900">{(Number(summary.order_count) || 0).toLocaleString('tr-TR')}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">Toplam CV</p>
          <p className="mt-1 text-xl font-extrabold text-violet-600">{(Number(summary.total_cv) || 0).toLocaleString('tr-TR')} CV</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-gray-900 text-left text-white">
                <th className="px-4 py-2.5 font-bold">Tarih</th>
                <th className="px-4 py-2.5 font-bold">Müşteri</th>
                <th className="px-4 py-2.5 font-bold">Sipariş</th>
                <th className="px-4 py-2.5 text-right font-bold">Sipariş Tutarı</th>
                <th className="px-4 py-2.5 text-right font-bold">CV</th>
                <th className="px-4 py-2.5 text-right font-bold">Kazancınız</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                  </td>
                </tr>
              ) : !data || (data.items?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    Bu ayda müşteri kazancı bulunamadı.
                  </td>
                </tr>
              ) : (
                data.items!.map((it, i) => (
                  <tr key={it.commission_id ?? i} className={`border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''} hover:bg-brand-50/40`}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                      {new Date(it.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-gray-800">{it.customer_name || '—'}</p>
                      <p className="font-mono text-[11px] text-gray-400">{it.customer_member_code || ''}</p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{it.order_id != null ? `#${it.order_id}` : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {it.order_amount != null
                        ? `${Number(it.order_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-violet-600">{it.related_cv != null ? `${Number(it.related_cv).toLocaleString('tr-TR')} CV` : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-green-600">
                      +{Number(it.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-sm">
          <span className="inline-flex items-center gap-1 text-gray-400">
            <Receipt size={14} /> {totalRecords.toLocaleString('tr-TR')} kayıt
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
              disabled={(page + 1) * limit >= totalRecords}
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
