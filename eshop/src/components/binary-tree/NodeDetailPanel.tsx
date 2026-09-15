// ============================================
// BestWork - Seçilen düğüm detay paneli
// Ağaç düğümü özet veriyi taşır; sponsor, ekip sayıları ve cüzdan gibi ek
// bilgiler seçim anında /user/card ucundan (önbellekli) çekilir.
// ============================================
'use client'

import { useEffect, useState } from 'react'
import { Coins, User, Users, Wallet, X } from '@/components/icons'
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

const cache = new Map<number, UserCardApi>()

function Row({ label, value, cls = 'text-gray-800' }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className={`truncate font-mono text-[12px] tabular-nums ${cls}`}>{value}</span>
    </div>
  )
}

export function NodeDetailPanel({
  nodeId,
  rec,
  onClose,
}: {
  nodeId: number | null
  rec: NodeRec | null
  onClose: () => void
}) {
  const [fetched, setFetched] = useState<Record<number, UserCardApi>>({})
  const [failedId, setFailedId] = useState<number | null>(null)

  useEffect(() => {
    if (nodeId == null) return
    if (cache.has(nodeId) || fetched[nodeId]) return
    let cancelled = false
    rawGet<{ card: UserCardApi }>(`/user/card?id=${nodeId}`)
      .then((r) => {
        if (cancelled || !r.card) return
        cache.set(nodeId, r.card)
        setFetched((prev) => ({ ...prev, [nodeId]: r.card as UserCardApi }))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [nodeId, fetched])

  if (nodeId == null) return null

  const card = fetched[nodeId] ?? cache.get(nodeId) ?? null
  const loading = !card
  const imgSrc = toAbs(rec?.image_path)
  const showImg = !!imgSrc && failedId !== nodeId
  const name = card?.name || rec?.name || '—'
  const code = card?.member_code || rec?.member_code || '—'
  const active = card?.is_active ?? rec?.is_active ?? true
  const rank = card?.rank || rec?.rank || 'GİRİŞİMCİ'

  return (
    <div className="bw-tree-ui fixed inset-x-0 bottom-0 z-40 sm:top-24 sm:right-4 sm:bottom-auto sm:left-auto sm:w-80">
      <div className="max-h-[70vh] overflow-y-auto rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:max-h-[calc(100vh-8rem)] sm:rounded-2xl">
        {/* Başlık */}
        <div className="sticky top-0 flex items-start gap-3 border-b border-gray-100 bg-white px-4 py-3">
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={name}
              className="h-11 w-11 rounded-full object-cover"
              onError={() => setFailedId(nodeId)}
            />
          ) : (
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] fw-800 text-white ${
                active ? 'bg-brand-600' : 'bg-gray-400'
              }`}
            >
              {initials(name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm fw-700 text-gray-900">{name}</div>
            <div className="font-mono text-[11px] text-gray-400">{code}</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] fw-700 text-amber-700">{rank}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] fw-700 ${
                  active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}
              >
                {active ? 'Aktif' : 'Pasif'}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3">
          {loading ? (
            <div className="space-y-2 py-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <div>
                <div className="flex items-center gap-1.5 pb-1 text-[10px] fw-700 tracking-wider text-gray-400 uppercase">
                  <User size={12} /> Sponsor
                </div>
                <div className="pb-2 text-[12px] fw-600 text-gray-800">{card?.sponsor_name || '—'}</div>
              </div>

              <div className="py-1">
                <div className="flex items-center gap-1.5 py-1 text-[10px] fw-700 tracking-wider text-gray-400 uppercase">
                  <Users size={12} /> Ekip
                </div>
                <Row label="Sol ekip" value={fmt(card?.left_team_count)} cls="text-sky-600" />
                <Row label="Sağ ekip" value={fmt(card?.right_team_count)} cls="text-violet-600" />
                <Row label="Toplam ekip" value={fmt(card?.total_team_count)} />
              </div>

              <div className="py-1">
                <div className="flex items-center gap-1.5 py-1 text-[10px] fw-700 tracking-wider text-gray-400 uppercase">
                  <Wallet size={12} /> Cüzdan
                </div>
                <Row label="Bakiye" value={`${fmt(card?.wallet_balance)} ₺`} cls="text-brand-700" />
                <Row label="Chip" value={fmt(card?.chip_balance)} cls="text-amber-600" />
              </div>

              <div className="py-1">
                <div className="flex items-center gap-1.5 py-1 text-[10px] fw-700 tracking-wider text-gray-400 uppercase">
                  <Coins size={12} /> Bacak PV / CV
                </div>
                <Row label="SOL PV" value={fmt(card?.total_pv_left ?? rec?.total_pv_left)} cls="text-sky-600" />
                <Row label="SAĞ PV" value={fmt(card?.total_pv_right ?? rec?.total_pv_right)} cls="text-violet-600" />
                <Row label="SOL CV" value={fmt(card?.total_cv_left ?? rec?.total_cv_left)} cls="text-emerald-600" />
                <Row label="SAĞ CV" value={fmt(card?.total_cv_right ?? rec?.total_cv_right)} cls="text-emerald-600" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
