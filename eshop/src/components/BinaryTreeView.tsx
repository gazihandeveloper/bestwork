// ============================================
// BestWork - BinaryTreeView (D3) — kullanıcı kartı görünümü
// Her düğüm, referans HTML'deki ".card" tasarımıyla SVG <foreignObject>
// içinde HTML/CSS olarak çizilir. Zoom + pan d3.zoom ile yapılır.
// Düğüme tıklayınca /user/card verisi çekilip kart (sponsor + EK) zenginleşir.
// ============================================
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { rawGet } from '@/lib/raw'

export interface TreeNode {
  user_id: number
  name: string
  member_code: string
  position: string | null
  package: string | null
  rank: string | null
  image_path?: string | null
  total_pv_accumulated: number
  total_cv_accumulated: number
  total_pv_left: number
  total_pv_right: number
  total_cv_left: number
  total_cv_right: number
  is_active: boolean
  role: string
  left_child: TreeNode | null
  right_child: TreeNode | null
}

interface UserCard {
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

const fmt = (v?: number) => (Number(v) || 0).toLocaleString('tr-TR')

/** Yükleme yolunu tam URL'e çevirir (uploads/... → https://…/uploads/...) */
const UPLOAD_BASE = 'https://mahmutgazihanarslan.com.tr'
function toAbs(p?: string | null): string | null {
  if (!p) return null
  if (/^https?:\/\//.test(p)) return p
  return UPLOAD_BASE + (p.startsWith('/') ? '' : '/') + p
}

function teamCount(node: TreeNode | null): number {
  if (!node) return 0
  return 1 + teamCount(node.left_child) + teamCount(node.right_child)
}

function initials(name?: string) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR')
}

/**
 * Bacak istatistikleri — tek doğruluk kaynağı (BUG-1, BUG-2, BUG-5).
 * Kart verisi varsa onu, yoksa alt ağaç sayımını kullanır.
 * Küçük bacak "zayıf"tır; iki bacak da boşsa yön belirsizdir.
 */
function legStats(node: TreeNode, card?: UserCard) {
  const l = card?.left_team_count != null ? Number(card.left_team_count) : teamCount(node.left_child)
  const r = card?.right_team_count != null ? Number(card.right_team_count) : teamCount(node.right_child)
  const tot = l + r
  if (tot === 0) return { l, r, tot, sol: 0, sag: 0, weak: '—' }
  const sol = Math.round((l / tot) * 100)
  return { l, r, tot, sol, sag: 100 - sol, weak: l === r ? 'EŞİT' : l < r ? 'SOL' : 'SAĞ' }
}

/* ── Kart ölçüleri (referans kart: 360px / 20px / 16px padding) ── */
const CARD_W = 360
const CARD_H = 396
const FO_PAD = 14
const FO_W = CARD_W + FO_PAD * 2
const FO_H = CARD_H + FO_PAD * 2
const H_GAP = 64
const V_GAP = 104
const NODE_DX = CARD_W + H_GAP
const NODE_DY = CARD_H + V_GAP

/* Parent alt kenarından child üst kenarına dik eğri bağlantı */
function linkPath(s: d3.HierarchyPointNode<TreeNode>, t: d3.HierarchyPointNode<TreeNode>) {
  const sx = s.x
  const sy = s.y + CARD_H
  const tx = t.x
  const ty = t.y - 6
  const my = (sy + ty) / 2
  return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`
}

export function BinaryTreeView({ root }: { root: TreeNode }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [cards, setCards] = useState<Record<number, UserCard>>({})
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState({ w: 1024, h: 620 })

  const cardCache = useRef<Map<number, UserCard>>(new Map())
  const svgRef = useRef<SVGSVGElement | null>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const initialRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
  const draggedRef = useRef(false)
  const interactedRef = useRef(false)
  const fittedRootRef = useRef<TreeNode | null>(null)

  /* ── Responsive ölçüm ── */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      const w = Math.max(320, Math.round(r.width))
      const h = Math.max(420, Math.round(r.height))
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ── Düğüm detayı: /user/card (cache'li) ── */
  // Senkron setState içermez; effect'lerden güvenle çağrılabilir.
  const fetchCard = useCallback((node: TreeNode): Promise<UserCard | undefined> => {
    const cached = cardCache.current.get(node.user_id)
    if (cached) return Promise.resolve(cached)
    return rawGet<{ card?: UserCard }>(`/user/card?id=${node.user_id}`)
      .then((r) => {
        const c = r?.card
        if (c) cardCache.current.set(node.user_id, c)
        return c
      })
      .catch(() => undefined)
  }, [])

  const loadCard = useCallback(
    (node: TreeNode, select = true) => {
      if (select) setSelected(node.user_id)
      void fetchCard(node).then((c) => {
        if (c) setCards((m) => (m[node.user_id] ? m : { ...m, [node.user_id]: c }))
      })
    },
    [fetchCard]
  )

  /* ── Kök kartını otomatik çek: özet bar ile kök kart aynı oranı göstersin (BUG-2).
     Dönem değişince sayfa `loading` ile bu bileşeni söküp yeniden taktığı için
     cards/selected/cardCache kendiliğinden sıfırlanır (BUG-4). ── */
  useEffect(() => {
    let cancelled = false
    void fetchCard(root).then((c) => {
      if (!cancelled && c) setCards((m) => (m[root.user_id] ? m : { ...m, [root.user_id]: c }))
    })
    return () => {
      cancelled = true
    }
  }, [root, fetchCard])

  const handleSelect = (node: TreeNode) => {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    loadCard(node)
  }

  /* ── D3 hiyerarşi + tree layout ── */
  const layout = useMemo(() => {
    const data = d3.hierarchy<TreeNode>(root, (d) =>
      [d.left_child, d.right_child].filter(Boolean) as TreeNode[]
    )
    const rt = d3.tree<TreeNode>().nodeSize([NODE_DX, NODE_DY])(data)
    let x0 = Infinity
    let x1 = -Infinity
    let y0 = Infinity
    let y1 = -Infinity
    rt.each((n) => {
      x0 = Math.min(x0, n.x ?? 0)
      x1 = Math.max(x1, n.x ?? 0)
      y0 = Math.min(y0, n.y ?? 0)
      y1 = Math.max(y1, n.y ?? 0)
    })
    return { rt, x0, x1, y0, y1 }
  }, [root])

  const { rt, x0, x1, y0, y1 } = layout

  /* ── Zoom + pan davranışını bir kez bağla ── */
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const zb = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2.5])
      .on('start', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (event.sourceEvent) draggedRef.current = false
      })
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (event.sourceEvent) {
          draggedRef.current = true
          interactedRef.current = true
        }
        if (gRef.current) d3.select(gRef.current).attr('transform', event.transform.toString())
        setZoom(event.transform.k)
      })

    zoomRef.current = zb
    d3.select(svg).call(zb).on('dblclick.zoom', null)

    return () => {
      d3.select(svg).on('.zoom', null)
    }
  }, [])

  /* ── Genişlik + yükseklik sığdırması (BUG-3) ──
     Ağaç değişince yeniden sığdır; kullanıcı zoom yaptıysa pencere
     yeniden boyutlanınca mevcut görünümü koru. */
  useEffect(() => {
    const svg = svgRef.current
    const zb = zoomRef.current
    if (!svg || !zb) return

    const rootChanged = fittedRootRef.current !== root
    if (!rootChanged && interactedRef.current) return

    const padX = 56
    const padY = 40
    const contentW = x1 - x0 + CARD_W
    const contentH = y1 - y0 + CARD_H
    const fit = Math.min(
      1,
      Math.max(0.2, Math.min((size.w - padX * 2) / contentW, (size.h - padY * 2) / contentH))
    )
    const tx = (size.w - contentW * fit) / 2 - x0 * fit + (CARD_W / 2) * fit
    const ty = (size.h - contentH * fit) / 2 - y0 * fit
    const initial = d3.zoomIdentity.translate(tx, ty).scale(fit)
    initialRef.current = initial

    if (rootChanged) {
      fittedRootRef.current = root
      interactedRef.current = false
    }

    d3.select(svg).call(zb.transform, initial)
  }, [rt, x0, x1, y0, y1, size, root])

  const zoomBy = (factor: number) => {
    const svg = svgRef.current
    const zb = zoomRef.current
    if (!svg || !zb) return
    interactedRef.current = true
    d3.select(svg).transition().duration(220).call(zb.scaleBy, factor)
  }

  const resetZoom = () => {
    const svg = svgRef.current
    const zb = zoomRef.current
    if (!svg || !zb) return
    interactedRef.current = false
    d3.select(svg).transition().duration(260).call(zb.transform, initialRef.current)
  }

  const links = rt.links()
  const nodes = rt.descendants()
  const rootStats = legStats(root, cards[root.user_id])

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Özet bar + zoom kontrolleri */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-extrabold text-blue-600">SOL {rootStats.sol}%</span>
          <span className="text-gray-400">
            Zayıf: <b className="text-gray-800">{rootStats.weak}</b>
          </span>
          <span className="font-extrabold text-purple-600">{rootStats.sag}% SAĞ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Uzaklaştır"
            onClick={() => zoomBy(1 / 1.2)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Yakınlaştır"
            onClick={() => zoomBy(1.2)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Sığdır"
            onClick={resetZoom}
            className="flex h-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 px-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Sığdır
          </button>
          <span className="w-10 text-center text-xs font-bold text-gray-400">%{Math.round(zoom * 100)}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100">
        <div className="flex h-full">
          <div className="bg-blue-600" style={{ width: `${rootStats.sol}%` }} />
          <div className="bg-purple-600" style={{ width: `${rootStats.sag}%` }} />
        </div>
      </div>

      {/* Tuval */}
      <div
        ref={wrapRef}
        className="relative h-[calc(100vh-240px)] min-h-[620px] w-full overflow-hidden bg-[radial-gradient(#e9eef5_1px,transparent_1px)] [background-size:22px_22px]"
      >
        <svg ref={svgRef} className="block h-full w-full cursor-grab touch-none active:cursor-grabbing">
          <defs>
            <marker
              id="bw-arrow-left"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#93c5fd" />
            </marker>
            <marker
              id="bw-arrow-right"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#d8b4fe" />
            </marker>
          </defs>

          <g ref={gRef}>
            {links.map((l, i) => {
              const isLeft = l.target.data.position === 'L' || (l.target.x ?? 0) < (l.source.x ?? 0)
              return (
                <path
                  key={`link-${i}`}
                  d={linkPath(l.source, l.target)}
                  fill="none"
                  stroke={isLeft ? '#93c5fd' : '#d8b4fe'}
                  strokeWidth={2.5}
                  markerEnd={isLeft ? 'url(#bw-arrow-left)' : 'url(#bw-arrow-right)'}
                />
              )
            })}

            {nodes.map((n) => {
              const d = n.data
              return (
                <g key={d.user_id} transform={`translate(${n.x},${n.y})`}>
                  <foreignObject x={-FO_W / 2} y={-FO_PAD} width={FO_W} height={FO_H}>
                    <div style={{ padding: FO_PAD }}>
                      <NodeCard
                        node={d}
                        card={cards[d.user_id]}
                        isRoot={d.user_id === root.user_id}
                        selected={selected === d.user_id}
                        onSelect={() => handleSelect(d)}
                      />
                    </div>
                  </foreignObject>
                </g>
              )
            })}
          </g>
        </svg>

        <div className="pointer-events-none absolute bottom-2 left-3 rounded-lg bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-gray-400 shadow-sm backdrop-blur">
          Sürükle: kaydır · Tekerlek: yakınlaştır · Karta tıkla: detay
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Düğüm kartı — referans HTML'deki ".card" tasarımı
   ───────────────────────────────────────────────────────────── */
function NodeCard({
  node,
  card,
  isRoot,
  selected,
  onSelect,
}: {
  node: TreeNode
  card?: UserCard
  isRoot: boolean
  selected: boolean
  onSelect: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)

  const display = card ?? {}
  const name = display.name || node.name || '—'
  const code = display.member_code || node.member_code || '—'
  const active = display.is_active !== undefined ? display.is_active : node.is_active !== false
  const rank = display.rank || node.rank || 'GİRİŞİMCİ'
  const pkg = display.package || node.package
  const imgSrc = toAbs(node.image_path)
  const showImg = !!imgSrc && !imgFailed

  const { l: lTeam, r: rTeam, sol: solPct, sag: sagPct, weak } = legStats(node, card)

  const lCv = display.total_cv_left ?? node.total_cv_left
  const rCv = display.total_cv_right ?? node.total_cv_right
  const lPv = display.total_pv_left ?? node.total_pv_left
  const rPv = display.total_pv_right ?? node.total_pv_right
  const sponsor = display.sponsor_name

  const rows: Array<{ l: string; lv?: number; r: string; rv?: number }> = [
    { l: 'SOL.CV', lv: lCv, r: 'SAĞ.CV', rv: rCv },
    { l: 'SOL.PV', lv: lPv, r: 'SAĞ.PV', rv: rPv },
    { l: 'SOL.EK', lv: lTeam, r: 'SAĞ.EK', rv: rTeam },
  ]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`flex select-none flex-col rounded-[20px] border-[3px] border-[#3b82f6] bg-white p-4 text-left shadow-[0_8px_20px_rgba(59,130,246,0.15)] transition-shadow ${
        selected ? 'ring-4 ring-[#3b82f6]/25' : ''
      }`}
      style={{ width: CARD_W, height: CARD_H }}
    >
      {/* Üst profil + rozet */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 gap-3">
          <div className="relative shrink-0">
            {showImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt={name}
                className="h-[52px] w-[52px] rounded-full object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div
                className={`flex h-[52px] w-[52px] items-center justify-center rounded-full text-[18px] font-extrabold text-white ${
                  active ? 'bg-[#3b82f6]' : 'bg-[#94a3b8]'
                }`}
              >
                {initials(name)}
              </div>
            )}
            <span
              className="absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full border-2 border-white"
              style={{ backgroundColor: active ? '#22c55e' : '#ef4444' }}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-[3px]">
            <div
              className="max-w-[170px] truncate text-[18px] leading-tight font-extrabold text-[#1e293b]"
              title={name}
            >
              {name}
            </div>
            <div className="text-[13px] leading-tight font-medium text-[#94a3b8]">{code}</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              {isRoot && (
                <span className="rounded bg-[#e2e8f0] px-1.5 py-0.5 text-[11px] font-bold text-[#64748b]">
                  KÖK
                </span>
              )}
              {pkg && <span className="text-[12px] font-extrabold tracking-wide text-[#d97706]">{pkg}</span>}
            </div>
            {!active && (
              <div className="mt-0.5 text-[12px] font-extrabold tracking-[0.5px] text-[#ef4444]">PASİF</div>
            )}
          </div>
        </div>

        {/* Elmas rozet + iğne */}
        <div className="relative flex shrink-0 flex-col items-center">
          <span className="absolute -top-2 right-1 z-[2] h-4 w-4 rounded-full bg-[#ef4444] shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
          <div className="mt-2 mb-2 h-11 w-11 rotate-45 rounded-md border-2 border-white bg-gradient-to-br from-[#cbd5e1] to-[#94a3b8] shadow-[0_2px_8px_rgba(0,0,0,0.15)]" />
          <span className="max-w-[74px] truncate text-[11px] font-bold tracking-[0.5px] text-[#64748b] uppercase">
            {rank}
          </span>
        </div>
      </div>

      {/* Yüzde + zayıf yön */}
      <div className="mt-1 mb-1.5 flex items-center justify-between text-[12px] font-bold">
        <span className="text-[#3b82f6]">SOL {solPct}%</span>
        <span className="font-semibold text-[#64748b]">Zayıf: {weak}</span>
        <span className="text-[#a855f7]">{sagPct}% SAĞ</span>
      </div>

      {/* İlerleme çubuğu: mavi → mor oranlı dolgu */}
      <div className="mb-3 h-2 w-full overflow-hidden rounded bg-[#e2e8f0]">
        <div className="flex h-full">
          <div className="bg-[#38bdf8]" style={{ width: `${solPct}%` }} />
          <div className="bg-[#a855f7]" style={{ width: `${sagPct}%` }} />
        </div>
      </div>

      {/* İstatistik kutusu */}
      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
        {rows.map((row) => (
          <div key={row.l} className="flex border-b border-[#e2e8f0] last:border-b-0">
            <div className="flex-1 border-r border-[#e2e8f0] px-3 py-2">
              <div className="text-[11px] font-bold tracking-[0.5px] text-[#94a3b8]">{row.l}</div>
              <div className="font-mono text-[20px] leading-tight font-extrabold text-[#38bdf8]">
                {fmt(row.lv)}
              </div>
            </div>
            <div className="flex-1 px-3 py-2">
              <div className="text-[11px] font-bold tracking-[0.5px] text-[#94a3b8]">{row.r}</div>
              <div className="font-mono text-[20px] leading-tight font-extrabold text-[#a855f7]">
                {fmt(row.rv)}
              </div>
            </div>
          </div>
        ))}

        {/* Sponsor */}
        <div className="border-t border-[#e2e8f0] px-3 py-2">
          <div className="mb-1 text-[11px] font-bold tracking-[0.5px] text-[#94a3b8]">SPONSOR</div>
          <div className="truncate text-[13px] font-extrabold text-[#0f172a]" title={sponsor || '—'}>
            {sponsor || '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
