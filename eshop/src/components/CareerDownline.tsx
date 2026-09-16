// ============================================
// BestWork - Neslimden Kariyer Alanlar
// Alt hattı (sol/sağ kol) kariyer (rütbe) ve nesil bilgisiyle listeler.
// Veri: /tree/downline (gerçek alt hat).
// ============================================
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, ArrowLeft, ArrowRight, GitFork } from '@/components/icons'
import { rawGet } from '@/lib/raw'

interface DownlineRow {
  user_id: number
  name: string
  member_code: string
  rank: string | null
  seviye: number
  ilk_bacak: string | null
}

function Panel({
  side,
  rows,
  loading,
}: {
  side: 'L' | 'R'
  rows: DownlineRow[]
  loading: boolean
}) {
  const isLeft = side === 'L'
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <div
        className={`flex items-center gap-2 px-4 py-2.5 text-sm fw-800 tracking-wide uppercase ${
          isLeft ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'
        }`}
      >
        {isLeft ? <ArrowLeft size={15} /> : <ArrowRight size={15} />} {isLeft ? 'Sol Kol' : 'Sağ Kol'}
        <span className="ml-auto text-[11px] fw-700 opacity-70">{rows.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-[10px] fw-700 tracking-wider text-gray-400 uppercase">
              <th className="px-3 py-2 text-left">Üye No</th>
              <th className="px-3 py-2 text-left">Ad Soyad</th>
              <th className="px-3 py-2 text-left">Kariyer</th>
              <th className="px-3 py-2 text-right">Nesil</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-gray-400">
                  Yükleniyor…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-gray-400">
                  Kayıt bulunamadı
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.user_id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-mono text-[12px] text-gray-500">{r.member_code}</td>
                  <td className="px-3 py-2 text-gray-800">{r.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] fw-700 ${
                        isLeft ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'
                      }`}
                    >
                      {r.rank || 'Girişimci'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">{r.seviye}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CareerDownline() {
  const [rows, setRows] = useState<DownlineRow[]>([])
  const [totals, setTotals] = useState<{ L: number; R: number }>({ L: 0, R: 0 })
  const [leg, setLeg] = useState<'all' | 'L' | 'R'>('all')
  const [q, setQ] = useState('')
  const [rank, setRank] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      rawGet<{ users: DownlineRow[] }>('/tree/downline?limit=200&sirala=seviye'),
      rawGet<{ total: number }>('/tree/downline?bacak=L&limit=1'),
      rawGet<{ total: number }>('/tree/downline?bacak=R&limit=1'),
    ])
      .then(([list, l, r]) => {
        if (!alive) return
        setRows(Array.isArray(list.users) ? list.users : [])
        setTotals({ L: Number(l.total) || 0, R: Number(r.total) || 0 })
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const rankOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.rank).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'tr')),
    [rows]
  )

  const apply = (list: DownlineRow[]) => {
    const s = q.trim().toLocaleLowerCase('tr-TR')
    return list.filter((r) => {
      if (rank && (r.rank || '') !== rank) return false
      if (s.length >= 2 && !`${r.name} ${r.member_code}`.toLocaleLowerCase('tr-TR').includes(s)) return false
      return true
    })
  }

  const left = apply(rows.filter((r) => r.ilk_bacak === 'L'))
  const right = apply(rows.filter((r) => r.ilk_bacak === 'R'))

  const segBtn = (active: boolean) =>
    `flex-1 cursor-pointer rounded-lg px-3 py-2 text-xs fw-800 transition-colors ${
      active ? 'bg-brand-600 text-white shadow' : 'bg-white text-gray-600 hover:bg-gray-50'
    }`

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-brand-700 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm fw-800 tracking-wide text-white uppercase">
          <GitFork size={16} /> Neslimden Kariyer Alanlar
        </span>
        <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] fw-700 text-white">
          Sol: {totals.L} | Sağ: {totals.R}
        </span>
      </div>

      {/* Kontroller */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Üye No veya Ad Soyad ile arayın..."
            className="w-full rounded-lg border border-gray-200 py-2 pr-3 pl-9 text-sm placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600"
        >
          <option value="">Tüm Kariyerler</option>
          {rankOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="flex w-full gap-1 rounded-lg bg-gray-100 p-1 sm:w-auto">
          <button type="button" className={segBtn(leg === 'all')} onClick={() => setLeg('all')}>
            TÜMÜ
          </button>
          <button type="button" className={segBtn(leg === 'L')} onClick={() => setLeg('L')}>
            SOL KOL
          </button>
          <button type="button" className={segBtn(leg === 'R')} onClick={() => setLeg('R')}>
            SAĞ KOL
          </button>
        </div>
      </div>

      {/* Paneller */}
      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
        {leg !== 'R' && <Panel side="L" rows={left} loading={loading} />}
        {leg !== 'L' && <Panel side="R" rows={right} loading={loading} />}
      </div>
    </div>
  )
}
