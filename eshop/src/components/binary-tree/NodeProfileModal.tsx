// ============================================
// BestWork - Kişi Profil Ekranı (modal, sekmeli)
//
// Karta tıklanınca açılır. Sekme 0: zengin üye kartı (bacak oranları, CV/PV/EK,
// kişisel bakiye, alt ekip, kariyer, sponsor). Diğer sekmeler: kişinin alt
// hattı, seviyelere (nesillere) göre gruplanmış liste.
// ============================================
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Award, X } from '@/components/icons'
import { rawGet } from '@/lib/raw'
import { fmt, initials, toAbs, type NodeRec } from './types'

interface UserCardApi {
  user_id?: number
  name?: string
  member_code?: string
  rank?: string | null
  package?: string | null
  is_active?: boolean
  position?: string | null
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

interface DownlineRowApi {
  user_id: number
  name: string
  member_code: string
  position: string | null
  rank: string | null
  package: string | null
  is_active: boolean
  seviye: number
  ilk_bacak: string | null
}

const listCache = new Map<number, UserCardApi>()

function StatCell({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
      <div className="text-[10px] fw-700 tracking-wider text-gray-400 uppercase">{label}</div>
      <div className={`font-mono text-[15px] fw-800 tabular-nums ${cls}`}>{value}</div>
    </div>
  )
}

export function NodeProfileModal({
  nodeId,
  rec,
  onClose,
}: {
  nodeId: number
  rec: NodeRec | null
  onClose: () => void
}) {
  const [card, setCard] = useState<UserCardApi | null>(() => listCache.get(nodeId) ?? null)
  const [cardLoading, setCardLoading] = useState(!listCache.has(nodeId))
  const [rows, setRows] = useState<DownlineRowApi[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [tab, setTab] = useState(0)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!listCache.has(nodeId)) {
      rawGet<{ card: UserCardApi }>(`/user/card?id=${nodeId}`)
        .then((r) => {
          if (cancelled || !r.card) return
          listCache.set(nodeId, r.card)
          setCard(r.card)
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setCardLoading(false)
        })
    }
    rawGet<{ users: DownlineRowApi[] }>(`/tree/downline?kok=${nodeId}&sirala=seviye&limit=200`)
      .then((r) => {
        if (!cancelled) setRows(Array.isArray(r.users) ? r.users : [])
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setListLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nodeId])

  const seviyeler = useMemo(() => {
    const m = new Map<number, DownlineRowApi[]>()
    for (const u of rows) {
      const arr = m.get(u.seviye)
      if (arr) arr.push(u)
      else m.set(u.seviye, [u])
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0])
  }, [rows])

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

  const tabs = ['Kart', ...seviyeler.map(([s]) => `${s}. Seviye`)]

  return (
    <div
      className="bw-tree-ui fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Üye profili"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-extrabold text-gray-900">Üye Profili</h3>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sekmeler */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(i)}
              className={`shrink-0 cursor-pointer border-b-2 px-3 py-2 text-xs fw-700 whitespace-nowrap transition-colors ${
                tab === i
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
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
                  <div className="font-mono text-xs text-gray-400">{code}</div>
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
            <LevelList loading={listLoading} rows={seviyeler[tab - 1]?.[1] ?? []} />
          )}
        </div>
      </div>
    </div>
  )
}

function LevelList({ loading, rows }: { loading: boolean; rows: DownlineRowApi[] }) {
  if (loading) {
    return (
      <div className="py-10 text-center">
        <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }
  if (rows.length === 0) {
    return <p className="py-6 text-center text-xs text-gray-400">Bu seviyede üye yok.</p>
  }
  return (
    <ul className="divide-y divide-gray-50 rounded-xl border border-gray-100">
      {rows.map((u) => (
        <li key={u.user_id} className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] fw-800 text-white ${
                u.is_active ? 'bg-emerald-500' : 'bg-red-400'
              }`}
            >
              {initials(u.name)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[12px] fw-700 text-gray-800">{u.name}</div>
              <div className="font-mono text-[10px] text-gray-400">{u.member_code}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {u.ilk_bacak && (
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] fw-700 ${
                  u.ilk_bacak === 'L' ? 'bg-sky-50 text-sky-600' : 'bg-violet-50 text-violet-600'
                }`}
              >
                {u.ilk_bacak === 'L' ? 'SOL' : 'SAĞ'}
              </span>
            )}
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] fw-700 ${
                u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}
            >
              {u.is_active ? 'Aktif' : 'Pasif'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
