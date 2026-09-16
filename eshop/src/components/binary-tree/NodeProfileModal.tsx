// ============================================
// BestWork - Kişi Profil Ekranı (modal, sekmeli)
//
// Sekme 0 "Kart": zengin üye kartı (bacak oranları, CV/PV/EK, bakiye, alt ekip,
// kariyer, sponsor). Sekme 1 "Puan Dağılımı": seçilen aya ait sipariş bazlı
// Sol/Sağ CV-PV tablosu + isme göre arama + toplamlar.
// ============================================
'use client'

import { useEffect, useState } from 'react'
import { Award, Pin, Search, X } from '@/components/icons'
import { rawGet } from '@/lib/raw'
import { fmt, initials, toAbs, type NodeRec } from './types'

interface UserCardApi {
  name?: string
  member_code?: string
  rank?: string | null
  package?: string | null
  is_active?: boolean
  sponsor_name?: string | null
  wallet_balance?: number
  chip_balance?: number
  total_pv_left?: number
  total_pv_right?: number
  total_cv_left?: number
  total_cv_right?: number
  left_team_count?: number
  right_team_count?: number
  total_team_count?: number
}

interface PointRowApi {
  name: string
  date: string
  order_no: string
  left_cv: number
  right_cv: number
  left_pv: number
  right_pv: number
}

const cardCache = new Map<number, UserCardApi>()

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function StatCell({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
      <div className="text-[10px] fw-700 tracking-wider text-gray-400 uppercase">{label}</div>
      <div className={`text-[15px] fw-800 tabular-nums ${cls}`} style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>{value}</div>
    </div>
  )
}

export function NodeProfileModal({
  nodeId,
  rec,
  pinned,
  onTogglePin,
  onClose,
}: {
  nodeId: number
  rec: NodeRec | null
  pinned: boolean
  onTogglePin: () => void
  onClose: () => void
}) {
  const [card, setCard] = useState<UserCardApi | null>(() => cardCache.get(nodeId) ?? null)
  const [cardLoading, setCardLoading] = useState(!cardCache.has(nodeId))
  const [tab, setTab] = useState(0)
  const [imgFailed, setImgFailed] = useState(false)

  // Puan dağılımı
  const [month, setMonth] = useState(currentMonth())
  const [pointsRows, setPointsRows] = useState<PointRowApi[]>([])
  const [pointsTotals, setPointsTotals] = useState<Record<string, number>>({})
  const [pointsLoading, setPointsLoading] = useState(false)
  const [pointsLoaded, setPointsLoaded] = useState(false)
  const [query, setQuery] = useState('')

  /* Kart verisi (modal her açılışta yeniden mount edilir; hata payı için cache). */
  useEffect(() => {
    if (cardCache.has(nodeId) || card !== null) return
    let cancelled = false
    rawGet<{ card: UserCardApi }>(`/user/card?id=${nodeId}`)
      .then((r) => {
        if (cancelled || !r.card) return
        cardCache.set(nodeId, r.card)
        setCard(r.card)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCardLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId])

  const loadPoints = async (m: string) => {
    setPointsLoading(true)
    try {
      const r = await rawGet<{ rows: PointRowApi[]; totals: Record<string, number> }>(
        `/tree/points?id=${nodeId}&month=${m}`
      )
      setPointsRows(Array.isArray(r.rows) ? r.rows : [])
      setPointsTotals(r.totals || {})
      setPointsLoaded(true)
    } catch {
      setPointsRows([])
    } finally {
      setPointsLoading(false)
    }
  }

  const selectTab = (i: number) => {
    setTab(i)
    if (i === 1 && !pointsLoaded) void loadPoints(month)
  }

  const imgSrc = toAbs(rec?.image_path)
  const showImg = !!imgSrc && !imgFailed
  const name = card?.name || rec?.name || '—'
  const code = card?.member_code || rec?.member_code || '—'
  const active = card?.is_active ?? rec?.is_active ?? true
  const rank = card?.rank || rec?.rank || 'GİRİŞİMCİ'

  const lCv = card?.total_cv_left ?? rec?.total_cv_left ?? 0
  const rCv = card?.total_cv_right ?? rec?.total_cv_right ?? 0
  const lPv = card?.total_pv_left ?? rec?.total_pv_left ?? 0
  const rPv = card?.total_pv_right ?? rec?.total_pv_right ?? 0
  const lEk = card?.left_team_count ?? 0
  const rEk = card?.right_team_count ?? 0
  const altEkip = card?.total_team_count ?? 0

  const base = Number(lCv) + Number(rCv) > 0 ? [Number(lCv), Number(rCv)] : [Number(lPv), Number(rPv)]
  const tot = base[0] + base[1]
  const solPct = tot > 0 ? Math.round((base[0] / tot) * 100) : 0
  const sagPct = 100 - solPct
  const zayif = tot <= 0 ? '—' : base[0] === base[1] ? 'EŞİT' : base[0] < base[1] ? 'SOL' : 'SAĞ'

  const q = query.trim().toLocaleLowerCase('tr-TR')
  const filtered = q
    ? pointsRows.filter((p) => (p.name || '').toLocaleLowerCase('tr-TR').includes(q))
    : pointsRows

  const tabs = ['Kart', 'Puan Dağılımı']

  return (
    <div
      className="bw-tree-ui fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Üye profili"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-extrabold text-gray-900">Üye Profili</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title={pinned ? 'Sabitlemeyi kaldır' : 'Bu üyeyi sabitle'}
              aria-label={pinned ? 'Sabitlemeyi kaldır' : 'Bu üyeyi sabitle'}
              onClick={onTogglePin}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                pinned ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <Pin size={17} />
            </button>
            <button
              type="button"
              aria-label="Kapat"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex gap-1 border-b border-gray-100 px-3">
          {tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => selectTab(i)}
              className={`cursor-pointer border-b-2 px-3 py-2 text-xs fw-700 transition-colors ${
                tab === i ? 'border-brand-500 text-brand-700' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === 0 ? (
            <div>
              {/* Üst kimlik */}
              <div className="flex items-center gap-4">
                {showImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgSrc}
                    alt={name}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-white"
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[18px] fw-800 text-white ${
                      active ? 'bg-emerald-500' : 'bg-red-400'
                    }`}
                  >
                    {initials(name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-extrabold text-gray-900">{name}</div>
                  <div className="text-xs fw-700 text-gray-400" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>{code}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] fw-700 text-amber-700">
                      <Award size={11} /> {rank}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] fw-700 ${
                        active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {active ? 'AKTİF' : 'PASİF'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bacak oranı */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] fw-700">
                  <span className="text-sky-600">SOL %{solPct}</span>
                  <span className="text-gray-400">
                    Zayıf bacak: <span className="text-gray-700">{zayif}</span>
                  </span>
                  <span className="text-violet-600">SAĞ %{sagPct}</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="flex h-full">
                    <div className="bg-sky-400" style={{ width: `${solPct}%` }} />
                    <div className="bg-violet-400" style={{ width: `${sagPct}%` }} />
                  </div>
                </div>
              </div>

              {/* CV / PV / EK */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatCell label="SOL.CV" value={fmt(lCv)} cls="text-sky-600" />
                <StatCell label="SAĞ.CV" value={fmt(rCv)} cls="text-sky-600" />
                <StatCell label="SOL.PV" value={fmt(lPv)} cls="text-violet-600" />
                <StatCell label="SAĞ.PV" value={fmt(rPv)} cls="text-violet-600" />
                <StatCell label="SOL.EK" value={fmt(lEk)} cls="text-gray-800" />
                <StatCell label="SAĞ.EK" value={fmt(rEk)} cls="text-gray-800" />
              </div>

              {/* Finans + kariyer + sponsor */}
              <div className="mt-4 divide-y divide-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] fw-700 tracking-wider text-gray-400 uppercase">KİŞ.</span>
                  <span className="font-mono text-sm fw-800 text-emerald-600">
                    {fmt(card?.wallet_balance ?? 0)} ₺
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] fw-700 tracking-wider text-gray-400 uppercase">EK.C.</span>
                  <span className="font-mono text-sm fw-800 text-amber-600">
                    {fmt(card?.chip_balance ?? 0)} ₺
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] fw-700 tracking-wider text-gray-400 uppercase">ALT EKİP</span>
                  <span className="font-mono text-sm fw-800 text-gray-800">{fmt(altEkip)}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] fw-700 tracking-wider text-gray-400 uppercase">KARİYER</span>
                  <span className="text-sm fw-700 text-gray-800">{rank}</span>
                </div>
                <div className="flex items-start justify-between gap-3 px-3 py-2">
                  <span className="shrink-0 text-[11px] fw-700 tracking-wider text-gray-400 uppercase">SPONSOR</span>
                  <span className="text-right text-sm fw-700 text-gray-800">
                    {cardLoading ? '…' : card?.sponsor_name || '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Ay + arama */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="month"
                  value={month}
                  onChange={(e) => {
                    const m = e.target.value
                    if (!m) return
                    setMonth(m)
                    void loadPoints(m)
                  }}
                  className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
                <div className="relative min-w-[160px] flex-1">
                  <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="İsme göre ara..."
                    className="w-full rounded-lg border border-gray-300 py-1.5 pr-3 pl-9 text-sm placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>

              {pointsLoading ? (
                <div className="py-10 text-center">
                  <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400">Bu dönemde kayıt yok.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full min-w-[560px] text-[11px]">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr className="[&>th]:px-2.5 [&>th]:py-2 [&>th]:fw-700 [&>th]:whitespace-nowrap">
                        <th className="text-left">Ad Soyad</th>
                        <th className="text-left">Tarih</th>
                        <th className="text-left">Sipariş No</th>
                        <th className="text-right">Sol CV</th>
                        <th className="text-right">Sağ CV</th>
                        <th className="text-right">Sol PV</th>
                        <th className="text-right">Sağ PV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((p, i) => (
                        <tr key={`${p.order_no}-${i}`} className="hover:bg-gray-50/60">
                          <td className="px-2.5 py-1.5 text-gray-700">{p.name || ''}</td>
                          <td className="px-2.5 py-1.5 whitespace-nowrap text-gray-500">{p.date}</td>
                          <td className="px-2.5 py-1.5 font-mono text-gray-500">{p.order_no || ''}</td>
                          <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-sky-600">
                            {fmt(p.left_cv)}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-sky-600">
                            {fmt(p.right_cv)}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-violet-600">
                            {fmt(p.left_pv)}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono tabular-nums text-violet-600">
                            {fmt(p.right_pv)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 fw-700 text-gray-700">
                      <tr className="[&>td]:px-2.5 [&>td]:py-2">
                        <td colSpan={3} className="text-left">
                          TOPLAM
                        </td>
                        <td className="text-right font-mono tabular-nums">{fmt(pointsTotals.left_cv)}</td>
                        <td className="text-right font-mono tabular-nums">{fmt(pointsTotals.right_cv)}</td>
                        <td className="text-right font-mono tabular-nums">{fmt(pointsTotals.left_pv)}</td>
                        <td className="text-right font-mono tabular-nums">{fmt(pointsTotals.right_pv)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
