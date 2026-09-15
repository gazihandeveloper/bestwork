// ============================================
// BestWork - Binary ağaç tuvali (d3 yerleşim + zoom/pan)
//
// Yalnızca GENİŞLETİLMİŞ düğümlerin çocukları yerleşime girer. Verisi henüz
// getirilmemiş ama var olduğu bilinen dallar "ghost" yer tutucu olarak çizilir;
// tıklanınca /tree/level ile o dal getirilir. Böylece ağaç, üye sayısından
// bağımsız olarak yalnızca ekranda görünen kadarıyla büyür.
// ============================================
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Maximize, Minus, Network, Plus, RotateCcw } from '@/components/icons'
import { GhostNode, NodeCard } from './NodeCard'
import {
  CARD_H,
  FO_H,
  FO_PAD,
  FO_W,
  GHOST_H,
  GHOST_W,
  NODE_DX,
  NODE_DY,
  type NodeRec,
} from './types'

type LayoutItem =
  | { kind: 'node'; id: number; children: LayoutItem[] }
  | { kind: 'ghost'; parentId: number; side: 'L' | 'R'; children: LayoutItem[] }

type HPoint = d3.HierarchyPointNode<LayoutItem>

interface BinaryTreeCanvasProps {
  nodes: Record<number, NodeRec>
  loaded: Record<number, boolean>
  expanded: Record<number, boolean>
  busy: Record<number, boolean>
  rootId: number | null
  /** Alt hat sayaçları (aktif/toplam). */
  stats: { toplam: number; aktif: number } | null
  /** Değiştiğinde ağaç yeniden ekrana sığdırılır (dönem değişimi). */
  fitKey: string
  focusId: number | null
  selectedId: number | null
  onSelect: (id: number) => void
  onToggle: (id: number) => void
  onExpandAll: () => void
}

function buildLayout(
  id: number,
  nodes: Record<number, NodeRec>,
  loaded: Record<number, boolean>,
  expanded: Record<number, boolean>
): LayoutItem | null {
  const rec = nodes[id]
  if (!rec) return null
  const isLoaded = !!loaded[id]
  const children: LayoutItem[] = []

  if (isLoaded && expanded[id]) {
    if (rec.leftId) {
      const c = buildLayout(rec.leftId, nodes, loaded, expanded)
      if (c) children.push(c)
    }
    if (rec.rightId) {
      const c = buildLayout(rec.rightId, nodes, loaded, expanded)
      if (c) children.push(c)
    }
  } else {
    const hasL = isLoaded ? rec.leftId != null : rec.has_left
    const hasR = isLoaded ? rec.rightId != null : rec.has_right
    if (hasL) children.push({ kind: 'ghost', parentId: id, side: 'L', children: [] })
    if (hasR) children.push({ kind: 'ghost', parentId: id, side: 'R', children: [] })
  }

  return { kind: 'node', id, children }
}

function linkD(s: HPoint, t: HPoint) {
  const sy = s.y + CARD_H / 2
  const targetHalf = t.data.kind === 'ghost' ? GHOST_H / 2 : CARD_H / 2
  const ty = t.y - targetHalf - 4
  const my = (sy + ty) / 2
  return `M${s.x},${sy} C${s.x},${my} ${t.x},${my} ${t.x},${ty}`
}

const BADGE_TONES = {
  green: { box: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  red: { box: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  gray: { box: 'bg-gray-100 text-gray-600 ring-gray-200', dot: 'bg-gray-400' },
} as const

function CountBadge({
  tone,
  value,
  label,
  title,
}: {
  tone: keyof typeof BADGE_TONES
  value: number | null
  label: string
  title: string
}) {
  const t = BADGE_TONES[tone]
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] fw-700 ring-1 ${t.box}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      <span className="font-mono tabular-nums">{value == null ? '—' : value}</span>
      <span className="text-[10px] fw-500 opacity-80">{label}</span>
    </span>
  )
}

export function BinaryTreeCanvas({
  nodes,
  loaded,
  expanded,
  busy,
  rootId,
  stats,
  fitKey,
  focusId,
  selectedId,
  onSelect,
  onToggle,
  onExpandAll,
}: BinaryTreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const interactedRef = useRef(false)
  const fitKeyRef = useRef('')
  const pendingFocusRef = useRef<number | null>(null)

  const [size, setSize] = useState({ w: 0, h: 0 })
  const [zoomLevel, setZoomLevel] = useState(1)

  /* ── Responsive ölçüm ── */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      const w = Math.max(320, Math.round(r.width))
      const h = Math.max(360, Math.round(r.height))
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ── d3 yerleşim (yalnız açık düğümler) ── */
  const layout = useMemo(() => {
    if (rootId == null) return null
    const root = buildLayout(rootId, nodes, loaded, expanded)
    if (!root) return null
    const hier = d3.hierarchy<LayoutItem>(root, (d) => (d.children.length ? d.children : undefined))
    const rt = d3.tree<LayoutItem>().nodeSize([NODE_DX, NODE_DY])(hier)
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    rt.each((n) => {
      x0 = Math.min(x0, n.x)
      x1 = Math.max(x1, n.x)
      y0 = Math.min(y0, n.y)
      y1 = Math.max(y1, n.y)
    })
    return { rt, x0, x1, y0, y1 }
  }, [rootId, nodes, loaded, expanded])

  /* ── Zoom + pan davranışı (bir kez) ── */
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const zb = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.08, 2.5])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (event.sourceEvent) interactedRef.current = true
        if (gRef.current) d3.select(gRef.current).attr('transform', event.transform.toString())
        setZoomLevel(event.transform.k)
      })
    zoomRef.current = zb
    d3.select(svg).call(zb).on('dblclick.zoom', null)
    return () => {
      d3.select(svg).on('.zoom', null)
    }
  }, [])

  /* ── Ekrana sığdırma yardımcıları ── */
  const computeTransform = (
    ignoreFloor: boolean
  ): d3.ZoomTransform | null => {
    if (!layout || size.w <= 0) return null
    const { rt, x0, x1, y0, y1 } = layout
    const padX = size.w < 640 ? 12 : 48
    const padY = size.w < 640 ? 20 : 40
    const minX = x0 - FO_W / 2
    const maxX = x1 + FO_W / 2
    const minY = y0 - FO_H / 2
    const maxY = y1 + FO_H / 2
    const contentW = maxX - minX
    const contentH = maxY - minY
    const fit = Math.min(
      (size.w - padX * 2) / contentW,
      (size.h - padY * 2) / contentH
    )
    const floor = ignoreFloor ? 0.05 : size.w < 1024 ? 0.45 : 0.3
    const scale = Math.min(1.1, Math.max(Math.max(fit, 0), floor))
    let tx: number
    let ty: number
    if (scale > fit + 0.001) {
      // Ağaç sığmıyor: kökü üst-orta hizala, gerisi kaydırmayla görülsün.
      tx = size.w / 2 - rt.x * scale
      ty = padY - minY * scale
    } else {
      tx = (size.w - contentW * scale) / 2 - minX * scale
      ty = (size.h - contentH * scale) / 2 - minY * scale
    }
    return d3.zoomIdentity.translate(tx, ty).scale(scale)
  }

  const applyTransform = (t: d3.ZoomTransform | null, duration: number) => {
    const svg = svgRef.current
    const zb = zoomRef.current
    if (!svg || !zb || !t) return
    d3.select(svg).transition().duration(duration).call(zb.transform, t)
  }

  /* ── fitKey değişince (yeni dönem) veya ilk yerleşimde sığdır ── */
  useEffect(() => {
    if (!layout || size.w <= 0) return
    const changed = fitKeyRef.current !== fitKey
    if (!changed && interactedRef.current) return
    if (changed) {
      fitKeyRef.current = fitKey
      interactedRef.current = false
    }
    applyTransform(computeTransform(false), changed ? 0 : 220)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, size, fitKey])

  /* ── Arama ile odaklanan düğüme ortala ── */
  useEffect(() => {
    if (focusId != null) pendingFocusRef.current = focusId
  }, [focusId])

  useEffect(() => {
    const id = pendingFocusRef.current
    if (!layout || id == null || size.w <= 0) return
    const pt = layout.rt.descendants().find((n) => n.data.kind === 'node' && n.data.id === id)
    if (!pt) return
    pendingFocusRef.current = null
    interactedRef.current = true
    const scale = 0.9
    const t = d3.zoomIdentity
      .translate(size.w / 2 - pt.x * scale, size.h / 2 - pt.y * scale)
      .scale(scale)
    applyTransform(t, 420)
  }, [layout, size, focusId])

  const zoomBy = (factor: number) => {
    const svg = svgRef.current
    const zb = zoomRef.current
    if (!svg || !zb) return
    interactedRef.current = true
    d3.select(svg).transition().duration(200).call(zb.scaleBy, factor)
  }

  const controls = (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Uzaklaştır"
        onClick={() => zoomBy(1 / 1.2)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        aria-label="Yakınlaştır"
        onClick={() => zoomBy(1.2)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
      >
        <Plus size={14} />
      </button>
      <button
        type="button"
        aria-label="Kökü ortala"
        title="Kökü ortala"
        onClick={() => {
          if (!layout) return
          interactedRef.current = true
          applyTransform(
            d3.zoomIdentity
              .translate(size.w / 2 - layout.rt.x, size.h / 2 - layout.rt.y)
              .scale(1),
            300
          )
        }}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
      >
        <RotateCcw size={14} />
      </button>
      <button
        type="button"
        title="Tüm alt ağacı yükle ve aç"
        onClick={onExpandAll}
        className="flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs fw-700 text-gray-600 transition-colors hover:bg-gray-50"
      >
        <Network size={13} /> Tümünü Aç
      </button>
      <button
        type="button"
        onClick={() => {
          interactedRef.current = true
          applyTransform(computeTransform(true), 260)
        }}
        className="flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs fw-700 text-gray-600 transition-colors hover:bg-gray-50"
      >
        <Maximize size={13} /> Sığdır
      </button>
      <span className="w-10 text-center text-xs fw-700 text-gray-400">%{Math.round(zoomLevel * 100)}</span>
    </div>
  )

  const links = layout?.rt.links() ?? []
  const points = layout?.rt.descendants() ?? []

  /* Sayaçlar: alt hat (aktif/pasif/toplam) + kökün kendisi. */
  const rootActive = rootId != null && nodes[rootId]?.is_active !== false
  const teamTotal = stats ? stats.toplam : null
  const teamActive = stats ? stats.aktif : null
  const aktif = teamActive == null ? null : teamActive + (rootActive ? 1 : 0)
  const pasif = teamActive == null || teamTotal == null ? null : teamTotal - teamActive + (rootActive ? 0 : 1)
  const toplam = teamTotal == null ? null : teamTotal + 1

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gray-100 px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-3 text-[11px] font-medium text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> SOL CV
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-400" /> SAĞ CV
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <CountBadge tone="green" value={aktif} label="Aktif" title="Ağaçtaki aktif üye sayısı" />
            <CountBadge tone="red" value={pasif} label="Pasif" title="Ağaçtaki pasif üye sayısı" />
            <CountBadge tone="gray" value={toplam} label="Toplam" title="Ağaçtaki toplam kişi sayısı" />
          </div>
        </div>
        {controls}
      </div>

      <div
        ref={wrapRef}
        className="relative h-[calc(100vh-260px)] min-h-[360px] w-full overflow-hidden bg-[radial-gradient(#e9eef5_1px,transparent_1px)] [background-size:22px_22px] sm:min-h-[440px] lg:min-h-[600px]"
      >
        <svg ref={svgRef} className="block h-full w-full cursor-grab touch-none active:cursor-grabbing">
          <g ref={gRef}>
            {links.map((l, i) => {
              const target = l.target
              const side =
                target.data.kind === 'ghost'
                  ? target.data.side
                  : nodes[target.data.id]?.position ?? (target.x < l.source.x ? 'L' : 'R')
              const color = side === 'L' ? '#38bdf8' : '#a78bfa'
              return (
                <path
                  key={`link-${i}`}
                  d={linkD(l.source, l.target)}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              )
            })}

            {points.map((n) => {
              const item = n.data
              if (item.kind === 'ghost') {
                return (
                  <g
                    key={`ghost-${item.parentId}-${item.side}`}
                    transform={`translate(${n.x},${n.y})`}
                  >
                    <foreignObject
                      x={-GHOST_W / 2}
                      y={-GHOST_H / 2}
                      width={GHOST_W}
                      height={GHOST_H}
                    >
                      <GhostNode
                        side={item.side}
                        busy={!!busy[item.parentId]}
                        onLoad={() => onToggle(item.parentId)}
                      />
                    </foreignObject>
                  </g>
                )
              }

              const rec = nodes[item.id]
              if (!rec) return null
              const canCollapse =
                !!loaded[item.id] && !!expanded[item.id] && (rec.leftId != null || rec.rightId != null)
              return (
                <g key={`node-${item.id}`} transform={`translate(${n.x},${n.y})`}>
                  <foreignObject x={-FO_W / 2} y={-FO_H / 2} width={FO_W} height={FO_H}>
                    <div style={{ padding: FO_PAD }}>
                      <NodeCard
                        rec={rec}
                        isRoot={item.id === rootId}
                        selected={selectedId === item.id}
                        canCollapse={canCollapse}
                        onSelect={onSelect}
                        onCollapse={onToggle}
                      />
                    </div>
                  </foreignObject>
                </g>
              )
            })}
          </g>
        </svg>
      </div>
    </div>
  )
}
