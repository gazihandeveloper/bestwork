// ============================================
// BestWork - Binary ağaç düğüm kartı + yer tutucu (ghost)
//
// Kart minimalisttir: isim, TR üye kodu ve sol/sağ CV. Üye aktifse kutu YEŞİL,
// pasifse KIRMIZI çizilir. Kart, foreignObject içinde HTML/Tailwind olarak
// çizilir; zoom/pan d3 ile yapılır.
// ============================================
'use client'

import { useRef, useState } from 'react'
import { Minus, Plus } from '@/components/icons'
import { CARD_H, CARD_W, fmt, initials, toAbs, type NodeRec } from './types'

interface NodeCardProps {
  rec: NodeRec
  isRoot: boolean
  selected: boolean
  canCollapse: boolean
  onSelect: (id: number) => void
  onCollapse: (id: number) => void
}

export function NodeCard({ rec, isRoot, selected, canCollapse, onSelect, onCollapse }: NodeCardProps) {
  const down = useRef<{ x: number; y: number } | null>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const active = rec.is_active !== false
  const imgSrc = toAbs(rec.image_path)
  const showImg = !!imgSrc && !imgFailed

  const isDrag = (e: { clientX: number; clientY: number }) => {
    const d = down.current
    return !d || Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 5
  }

  return (
    <div
      className="bw-tree-card"
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY }
      }}
      onClick={(e) => {
        if (!isDrag(e)) onSelect(rec.user_id)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(rec.user_id)
        }
      }}
      style={{ width: CARD_W, height: CARD_H }}
      title={`${rec.name} · ${rec.member_code} · ${active ? 'Aktif' : 'Pasif'}`}
    >
      <div
        className={`relative flex h-full w-full cursor-pointer flex-col justify-center rounded-xl border-2 px-2.5 py-2 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
          active
            ? 'border-emerald-400 bg-emerald-50 hover:shadow-emerald-500/20'
            : 'border-red-400 bg-red-50 hover:shadow-red-500/20'
        } ${selected ? 'ring-2 ring-brand-500/50' : ''} ${isRoot ? 'ring-1 ring-brand-400 ring-offset-1' : ''}`}
      >
        <div className="flex items-center gap-2">
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={rec.name}
              className={`h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white ${active ? '' : 'opacity-80 grayscale'}`}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] fw-800 text-white ${
                active ? 'bg-emerald-500' : 'bg-red-400'
              }`}
            >
              {initials(rec.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className={`truncate text-[12px] fw-700 ${active ? 'text-emerald-900' : 'text-red-900'}`}>
              {rec.name || '—'}
            </div>
            <div className="truncate font-mono text-[10px] text-gray-500">{rec.member_code || '—'}</div>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-[9px] fw-700 tracking-wide text-sky-700">
            SOL
            <span className="font-mono text-[10px] tabular-nums text-sky-900">{fmt(rec.total_cv_left)}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-1.5 py-0.5 text-[9px] fw-700 tracking-wide text-violet-700">
            SAĞ
            <span className="font-mono text-[10px] tabular-nums text-violet-900">{fmt(rec.total_cv_right)}</span>
          </span>
        </div>

        {isRoot && (
          <span className="absolute -top-1.5 left-2 rounded bg-brand-600 px-1 py-px text-[8px] fw-700 tracking-wide text-white">
            KÖK
          </span>
        )}

        {canCollapse && (
          <button
            type="button"
            title="Dalları gizle"
            onClick={(e) => {
              e.stopPropagation()
              onCollapse(rec.user_id)
            }}
            className="absolute -bottom-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-brand-400 hover:text-brand-700"
          >
            <Minus size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

/** Henüz getirilmemiş ama var olduğu bilinen alt dal için yer tutucu. */
export function GhostNode({
  side,
  busy,
  onLoad,
}: {
  side: 'L' | 'R'
  busy: boolean
  onLoad: () => void
}) {
  const cls = side === 'L' ? 'border-sky-300 text-sky-600' : 'border-violet-300 text-violet-600'
  return (
    <div className="bw-tree-card flex h-full w-full items-center justify-center">
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation()
          onLoad()
        }}
        title={side === 'L' ? 'Sol dalı getir' : 'Sağ dalı getir'}
        className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed bg-white/70 ${cls} transition-colors hover:bg-white disabled:opacity-60`}
      >
        {busy ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Plus size={16} />
        )}
        <span className="text-[8px] fw-700 tracking-wide uppercase">{side === 'L' ? 'Sol' : 'Sağ'}</span>
      </button>
    </div>
  )
}
