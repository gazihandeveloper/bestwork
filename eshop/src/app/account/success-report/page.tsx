// ============================================
// BestWork - Başarı Raporu (BestWork)
// Son 6 ay: ödenmiş primler, PV/CV ve kariyer zaman çizelgesi
// ============================================
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trophy, TrendingUp, CircleAlert } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { get } from '@/lib/api'
import { rawGet } from '@/lib/raw'

interface MeBrief {
  name?: string
  member_code?: string
}

interface CommissionItem {
  id: number
  amount: number
  status: string
  created_at: string
}

interface BinaryTxn {
  id: number
  transaction_type: string
  pv: number
  cv: number
  created_at: string
}

interface CareerItem {
  rank_id: number
  rank_name?: string
  achieved_at: string
  is_active: boolean
}

interface RankBrief {
  id: number
  name: string
}

const fmt = (v: number) => Math.round(Number(v) || 0).toLocaleString('tr-TR')
const compact = (v: number) => {
  const x = Math.round(Number(v) || 0)
  if (x >= 1_000_000) return `${(x / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}Mn`
  if (x >= 1_000) return `${(x / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}B`
  return String(x)
}
const monthKey = (iso?: string) => (iso ? iso.slice(0, 7) : '')
const monthLabel = (k: string) => {
  const [y, m] = k.split('-')
  return `${Number(m)}.${y.slice(2)}`
}

function lastMonths(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

/* Aylık kazanç alan/çizgi grafiği */
function EarningsChart({ data }: { data: { m: string; v: number }[] }) {
  const W = 660
  const H = 250
  const pl = 48
  const pr = 14
  const pt = 20
  const pb = 30
  const n = data.length
  const maxV = Math.max(...data.map((d) => d.v), 1)
  const top = maxV * 1.15
  const xPos = (i: number) => (n <= 1 ? pl + (W - pl - pr) / 2 : pl + ((W - pl - pr) * i) / (n - 1))
  const yPos = (v: number) => H - pb - ((H - pt - pb) * v) / top
  const ticks = [0, 1, 2, 3, 4].map((i) => (top * i) / 4)

  let line = ''
  let area = `M${xPos(0)} ${H - pb} `
  data.forEach((d, i) => {
    const X = xPos(i)
    const Y = yPos(d.v)
    line += `${i === 0 ? 'M' : 'L'}${X} ${Y} `
    area += `L${X} ${Y} `
  })
  area += `L${xPos(n - 1)} ${H - pb} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
      <defs>
        <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E7D32" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2E7D32" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pl} x2={W - pr} y1={yPos(t)} y2={yPos(t)} stroke="#EDEDED" strokeDasharray="3 3" />
          <text x={pl - 6} y={yPos(t) + 3.5} textAnchor="end" fontSize={10} fill="#9AA0A6">
            {compact(t)}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#earnGrad)" />
      <path d={line} fill="none" stroke="#2E7D32" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.m}>
          <circle cx={xPos(i)} cy={yPos(d.v)} r={4.5} fill="#fff" stroke="#2E7D32" strokeWidth={2.5} />
          {d.v > 0 && (
            <text x={xPos(i)} y={yPos(d.v) - 9} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#2E7D32">
              {compact(d.v)}
            </text>
          )}
          <text x={xPos(i)} y={H - pb + 17} textAnchor="middle" fontSize={10.5} fill="#6B7280">
            {monthLabel(d.m)}
          </text>
        </g>
      ))}
    </svg>
  )
}

/* PV & CV gruplu çubuk grafiği */
function PVCVChart({ data }: { data: { m: string; pv: number; cv: number }[] }) {
  const W = 660
  const H = 250
  const pl = 48
  const pr = 14
  const pt = 20
  const pb = 30
  const n = data.length
  const band = (W - pl - pr) / n
  const groupW = band * 0.55
  const barW = groupW / 2 - 2
  const maxV = Math.max(...data.map((d) => Math.max(d.pv, d.cv)), 1)
  const top = maxV * 1.15
  const yPos = (v: number) => H - pb - ((H - pt - pb) * v) / top
  const ticks = [0, 1, 2, 3, 4].map((i) => (top * i) / 4)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pl} x2={W - pr} y1={yPos(t)} y2={yPos(t)} stroke="#EDEDED" strokeDasharray="3 3" />
          <text x={pl - 6} y={yPos(t) + 3.5} textAnchor="end" fontSize={10} fill="#9AA0A6">
            {compact(t)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const gx = pl + i * band + (band - groupW) / 2
        return (
          <g key={d.m}>
            <rect x={gx} y={yPos(d.pv)} width={barW} height={Math.max(0, H - pb - yPos(d.pv))} rx={4} fill="#1565C0" />
            <rect x={gx + barW + 4} y={yPos(d.cv)} width={barW} height={Math.max(0, H - pb - yPos(d.cv))} rx={4} fill="#8A2BE2" />
            <text x={pl + i * band + band / 2} y={H - pb + 17} textAnchor="middle" fontSize={10.5} fill="#6B7280">
              {monthLabel(d.m)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* Kıyaslama kartı */
function CompareCard({
  title,
  icon,
  now,
  prev,
  unit,
}: {
  title: string
  icon: React.ReactNode
  now: number
  prev: number
  unit?: string
}) {
  const delta = prev > 0 ? ((now - prev) / prev) * 100 : now > 0 ? 100 : 0
  const up = delta >= 0
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-white ${
            up ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {icon}
        </span>
        <p className="text-[11px] font-extrabold tracking-wider text-gray-400 uppercase">{title}</p>
      </div>
      <p className="text-2xl font-extrabold text-gray-900">
        {fmt(now)}
        {unit && <span className="ml-1 text-xs font-semibold text-gray-400">{unit}</span>}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">
        Geçen ay: {fmt(prev)}
        {unit ? ` ${unit}` : ''}
      </p>
      <span
        className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${
          up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}
      >
        {up ? '+' : ''}
        {delta.toFixed(0)}%
      </span>
    </div>
  )
}

/* Kariyer zaman çizelgesi */
function CareerTimeline({ ranks, career }: { ranks: RankBrief[]; career: CareerItem[] }) {
  const achieved = new Map(career.map((c) => [c.rank_id, c]))
  const activeId = career.find((c) => c.is_active)?.rank_id ?? null
  const cards: {
    id: string
    name: string
    achieved: boolean
    active: boolean
    next: boolean
    date: string | null
  }[] = [
    { id: 'g0', name: 'GİRİŞİMCİ', achieved: true, active: activeId == null, next: false, date: null },
    ...ranks.map((r, i) => ({
      id: String(r.id),
      name: r.name.toLocaleUpperCase('tr-TR'),
      achieved: achieved.has(r.id),
      active: r.id === activeId,
      next: !achieved.has(r.id) && (i === 0 || achieved.has(ranks[i - 1].id)),
      date: achieved.get(r.id)?.achieved_at ?? null,
    })),
  ]

  return (
    <div className="flex items-start gap-0.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {cards.map((c, i) => (
        <div key={c.id} className="flex min-w-0 items-start">
          <div className="flex w-[86px] shrink-0 flex-col items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                c.active
                  ? 'bg-brand-600 text-white'
                  : c.achieved
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-300'
              } ${c.next ? 'ring-2 ring-brand-600 ring-offset-2' : ''}`}
            >
              {c.achieved ? (
                <span className="text-lg leading-none">✓</span>
              ) : c.active ? (
                <Trophy size={18} />
              ) : (
                <span className="text-sm">🔒</span>
              )}
            </div>
            <p
              className={`mt-1 text-center text-[9.5px] leading-tight font-extrabold ${
                c.active ? 'text-brand-700' : c.achieved ? 'text-green-700' : c.next ? 'text-brand-700' : 'text-gray-400'
              }`}
            >
              {c.name}
            </p>
            {c.date && (
              <p className="mt-0.5 text-[8.5px] text-gray-400">
                {new Date(c.date).toLocaleDateString('tr-TR')}
              </p>
            )}
          </div>
          {i < cards.length - 1 && (
            <div
              className={`mt-[19px] h-[2.5px] w-3.5 shrink-0 rounded ${
                cards[i + 1].achieved || cards[i + 1].active ? 'bg-green-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function SuccessReportPage() {
  const [me, setMe] = useState<MeBrief | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [earnings, setEarnings] = useState<Record<string, number>>({})
  const [pvByMonth, setPvByMonth] = useState<Record<string, number>>({})
  const [cvByMonth, setCvByMonth] = useState<Record<string, number>>({})
  const [career, setCareer] = useState<CareerItem[]>([])
  const [ranks, setRanks] = useState<RankBrief[]>([])

  useEffect(() => {
    let active = true

    Promise.all([
      rawGet<{ commissions?: CommissionItem[] }>('/commissions?limit=1000&offset=0'),
      rawGet<{ transactions?: BinaryTxn[] }>('/binary-transactions?limit=1000&offset=0'),
      rawGet<{ career?: CareerItem[] }>('/user/career'),
      get<RankBrief[]>('/eshop/ranks'),
      get<MeBrief>('/eshop/me'),
    ])
      .then(([cRes, bRes, carRes, rRes, meRes]) => {
        if (!active) return

        const e: Record<string, number> = {}
        ;(cRes?.commissions || []).forEach((c) => {
          if (c.status === 'paid') {
            const k = monthKey(c.created_at)
            e[k] = (e[k] ?? 0) + (Number(c.amount) || 0)
          }
        })
        const pv: Record<string, number> = {}
        const cv: Record<string, number> = {}
        ;(bRes?.transactions || []).forEach((t) => {
          if (t.transaction_type === 'add') {
            const k = monthKey(t.created_at)
            pv[k] = (pv[k] ?? 0) + (Number(t.pv) || 0)
            cv[k] = (cv[k] ?? 0) + (Number(t.cv) || 0)
          }
        })

        setEarnings(e)
        setPvByMonth(pv)
        setCvByMonth(cv)
        setCareer(Array.isArray(carRes?.career) ? (carRes.career as CareerItem[]) : [])
        if (rRes?.success && Array.isArray(rRes.data)) setRanks(rRes.data)
        if (meRes?.success && meRes.data) setMe(meRes.data)
      })
      .catch(() => {
        if (active) setError('Rapor verileri yüklenemedi.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const months = useMemo(() => lastMonths(6), [])
  const earnSeries = useMemo(() => months.map((m) => ({ m, v: earnings[m] ?? 0 })), [months, earnings])
  const pvcvSeries = useMemo(
    () => months.map((m) => ({ m, pv: pvByMonth[m] ?? 0, cv: cvByMonth[m] ?? 0 })),
    [months, pvByMonth, cvByMonth],
  )
  const cmp = useMemo(() => {
    const cur = months[months.length - 1]
    const prev = months[months.length - 2]
    return {
      earn: { now: earnings[cur] ?? 0, prev: earnings[prev] ?? 0 },
      pv: { now: pvByMonth[cur] ?? 0, prev: pvByMonth[prev] ?? 0 },
      cv: { now: cvByMonth[cur] ?? 0, prev: cvByMonth[prev] ?? 0 },
    }
  }, [months, earnings, pvByMonth, cvByMonth])

  const totalEarned6 = months.reduce((s, m) => s + (earnings[m] ?? 0), 0)

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex items-center justify-between gap-3">
        <Link
          href="/account/profile"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft size={16} /> Profilime Dön
        </Link>
      </div>

      {/* Başlık */}
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md">
          <Trophy size={26} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Başarı Raporu</h1>
          <p className="text-sm text-gray-400">
            {me?.name?.toLocaleUpperCase('tr-TR') || 'Üye'} · {me?.member_code || ''}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <CircleAlert size={18} /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Kıyaslama kartları */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <CompareCard title="AYLIK KAZANÇ" icon={<TrendingUp size={18} />} now={cmp.earn.now} prev={cmp.earn.prev} unit="TL" />
            <CompareCard title="TOPLAM PV" icon={<TrendingUp size={18} />} now={cmp.pv.now} prev={cmp.pv.prev} unit="PV" />
            <CompareCard title="TOPLAM CV" icon={<TrendingUp size={18} />} now={cmp.cv.now} prev={cmp.cv.prev} unit="CV" />
          </div>

          {/* Grafikler */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-gray-900">📈 Aylık Kazanç Grafiği</h2>
              <p className="mb-1 text-xs text-gray-400">
                Son 6 ay · ödenmiş komisyonlar (referans + binary + matching)
              </p>
              <EarningsChart data={earnSeries} />
              <p className="mt-2 border-t border-gray-50 pt-2 text-center text-xs text-gray-400">
                Son 6 ayda toplam: <span className="font-extrabold text-green-600">{fmt(totalEarned6)} TL</span>
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-gray-900">📊 CV & PV Grafiği</h2>
              <div className="mb-1 flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600">
                  <span className="h-3.5 w-3.5 rounded bg-[#1565C0]" /> PV
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600">
                  <span className="h-3.5 w-3.5 rounded bg-[#8A2BE2]" /> CV
                </span>
              </div>
              <PVCVChart data={pvcvSeries} />
            </div>
          </div>

          {/* Kariyer grafiği */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-gray-900">🏆 Kariyer Grafiği</h2>
            <p className="mb-1 text-xs text-gray-400">Kazandığınız rütbeler ve tarihleri</p>
            {ranks.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Kariyer verisi bulunamadı.</p>
            ) : (
              <CareerTimeline ranks={ranks} career={career} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
