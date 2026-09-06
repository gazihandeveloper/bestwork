// ============================================
// BestWork - Liderlik Primi (Matching) — BestWork
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { House, Trophy, ChevronLeft, ChevronRight } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { get } from '@/lib/api'
import { rawGet } from '@/lib/raw'

interface MatchItem {
  id: number
  amount: number
  from_user_id: number | null
  related_cv: number | null
  created_at: string
}

interface DashBrief {
  total_matching_earnings?: number
}

const tl = (v: number) => v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'

export default function LeadershipBonusPage() {
  const [items, setItems] = useState<MatchItem[]>([])
  const [total, setTotal] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const limit = 10

  useEffect(() => {
    get<DashBrief>('/eshop/dashboard')
      .then((r) => {
        if (r.success && r.data) setGrandTotal(Number(r.data.total_matching_earnings) || 0)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    rawGet<{ commissions?: MatchItem[]; total?: number }>(
      `/commissions?type=matching&limit=${limit}&offset=${page * limit}`,
    )
      .then((r) => {
        if (!alive) return
        setItems(Array.isArray(r.commissions) ? r.commissions : [])
        setTotal(Number(r.total) || 0)
        setError('')
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Primler yüklenemedi.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [page])

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Liderlik Primi</h1>
          <p className="text-sm text-gray-400">
            Ekibinizin binary kazançlarından 5 nesle kadar aldığınız liderlik primleri.
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Trophy size={26} />
          </span>
          <div>
            <p className="text-xs font-bold tracking-wider text-white/80 uppercase">Toplam Liderlik Primi</p>
            <p className="text-2xl font-extrabold">{tl(grandTotal)}</p>
          </div>
        </div>
        <p className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">Toplam {total.toLocaleString('tr-TR')} kayıt</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-gray-900 text-left text-white">
                <th className="px-4 py-2.5 font-bold">Tarih</th>
                <th className="px-4 py-2.5 text-right font-bold">Kazanç</th>
                <th className="px-4 py-2.5 font-bold">Kazandıran Üye</th>
                <th className="px-4 py-2.5 text-right font-bold">İlgili CV</th>
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
                    Henüz liderlik primi kazanmadınız.
                  </td>
                </tr>
              ) : (
                items.map((c, i) => (
                  <tr key={c.id} className={`border-t border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''} hover:bg-amber-50/40`}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                      {new Date(c.created_at).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-green-600">+{tl(c.amount)}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {c.from_user_id != null ? `Üye #${c.from_user_id}` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">
                      {c.related_cv != null ? `${Number(c.related_cv).toLocaleString('tr-TR')} CV` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-sm">
          <span className="text-gray-400">Toplam {total.toLocaleString('tr-TR')} kayıt</span>
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
