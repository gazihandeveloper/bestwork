// ============================================
// BestWork - Binary ağaç düğüm kartı
//
// Minimalist: isim, TR üye kodu, SOL CV / SAĞ CV. Üye aktifse kutu YEŞİL,
// pasifse KIRMIZI. Kart, foreignObject içinde HTML/Tailwind olarak çizilir.
// Kartın ALTINDA tek bir + / − düğmesi vardır: + dalı getirip açar, − gizler.
// ============================================
'use client'

import { useRef, useState } from 'react'
import { Minus, Pin, Plus } from '@/components/icons'
import { CARD_H, CARD_W, fmt, initials, toAbs, type NodeRec } from './types'

interface NodeCardProps {
  rec: NodeRec
  isRoot: boolean
  selected: boolean
  pinned: boolean
  hasChildren: boolean
  isOpen: boolean
  busy: boolean
  onSelect: (id: number) => void
  onToggle: (id: number) => void
  onTogglePin: (id: number) => void
}

export function NodeCard({
  rec,
  isRoot,
  selected,
  pinned,
  hasChildren,
  isOpen,
  busy,
  onSelect,
  onToggle,
  onTogglePin,
}: NodeCardProps) {
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
      className="bw-tree-card relative"
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
        className={`relative flex h-full w-full cursor-pointer flex-col justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
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

        <div className="flex items-center gap-1.5">
          <span className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md bg-sky-100 px-1 py-0.5 text-[8px] fw-700 tracking-wide text-sky-700">
            SOL CV
            <span className="truncate font-mono text-[10px] tabular-nums text-sky-900">
              {fmt(rec.total_cv_left)}
            </span>
          </span>
          <span className="inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md bg-violet-100 px-1 py-0.5 text-[8px] fw-700 tracking-wide text-violet-700">
            SAĞ CV
            <span className="truncate font-mono text-[10px] tabular-nums text-violet-900">
              {fmt(rec.total_cv_right)}
            </span>
          </span>
        </div>

        {isRoot && (
          <span className="absolute -top-1.5 left-2 rounded bg-brand-600 px-1 py-px text-[8px] fw-700 tracking-wide text-white">
            KÖK
          </span>
        )}

        <button
          type="button"
          title={pinned ? 'Sabitlemeyi kaldır' : 'Bu üyeyi sabitle'}
          aria-label={pinned ? 'Sabitlemeyi kaldır' : 'Bu üyeyi sabitle'}
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin(rec.user_id)
          }}
          className={`absolute -top-2 right-2 z-[2] flex h-5 w-5 cursor-pointer items-center justify-center rounded-full shadow-sm transition-colors ${
            pinned ? 'bg-red-600 text-white ring-2 ring-red-200' : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          <Pin size={12} className="-rotate-[20deg]" />
        </button>
      </div>

      {hasChildren && (
        <button
          type="button"
          title={isOpen ? 'Dalları gizle' : 'Dalları göster'}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(rec.user_id)
          }}
          className="absolute -bottom-3 left-1/2 z-[2] flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-sm transition-colors hover:border-brand-500 hover:text-brand-700"
        >
          {busy ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          ) : isOpen ? (
            <Minus size={12} />
          ) : (
            <Plus size={12} />
          )}
        </button>
      )}
    </div>
  )
}
