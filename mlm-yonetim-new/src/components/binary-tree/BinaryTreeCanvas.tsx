// ============================================
// BestWork - Binary ağaç tuvali (React Flow)
//
// NEDEN REACT FLOW: pan/zoom + mobil dokunma/pinch + Safari uyumu kütüphanenin
// içinde gelir; d3.zoom'un React/WebKit uyumsuzluklarından tamamen kurtuluruz.
// Yerleşim yalnızca d3-hierarchy (saf matematik) ile hesaplanır; düğümler React
// bileşeni olarak (NodeCard) çizilir.
// ============================================
'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import * as d3 from 'd3'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  useReactFlow,
  useStore,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeProps,
} from '@xyflow/react'
import { Expand, Maximize, Minus, Plus, RotateCcw, Shrink, TreePine } from './icons'
import { NodeCard } from './NodeCard'
import { TreeReportModal } from './TreeReportModal'
import { CARD_H, CARD_W, NODE_DX, NODE_DY, type NodeRec } from './types'

interface LayoutNode {
  id: number
  children: LayoutNode[]
}

interface BinaryTreeCanvasProps {
  nodes: Record<number, NodeRec>
  loaded: Record<number, boolean>
  expanded: Record<number, boolean>
  busy: Record<number, boolean>
  rootId: number | null
  companyLabel?: string
  stats: { toplam: number; aktif: number } | null
  fitKey: string
  focusId: number | null
  selectedId: number | null
  onSelect: (id: number) => void
  onToggle: (id: number) => void
}

interface MemberData extends Record<string, unknown> {
  rec: NodeRec
  isRoot: boolean
  isCompany: boolean
  selected: boolean
  hasChildren: boolean
  isOpen: boolean
  busy: boolean
  onSelect: (id: number) => void
  onToggle: (id: number) => void
}

type MemberNode = RFNode<MemberData, 'member'>

function buildLayout(
  id: number,
  nodes: Record<number, NodeRec>,
  loaded: Record<number, boolean>,
  expanded: Record<number, boolean>
): LayoutNode | null {
  const rec = nodes[id]
  if (!rec) return null
  const children: LayoutNode[] = []
  if (loaded[id] && expanded[id]) {
    if (rec.leftId) {
      const c = buildLayout(rec.leftId, nodes, loaded, expanded)
      if (c) children.push(c)
    }
    if (rec.rightId) {
      const c = buildLayout(rec.rightId, nodes, loaded, expanded)
      if (c) children.push(c)
    }
  }
  return { id, children }
}

/** Şirket kökü sanal düğümü: ağacın en üstünde "BESTWORK" kartı olarak çizilir. */
const COMPANY_ID = 0
const COMPANY_REC: NodeRec = {
  user_id: COMPANY_ID,
  name: 'BESTWORK',
  member_code: 'ŞİRKET MERKEZİ',
  position: null,
  package: null,
  rank: null,
  image_path: null,
  total_pv_accumulated: 0,
  total_cv_accumulated: 0,
  total_pv_left: 0,
  total_pv_right: 0,
  total_cv_left: 0,
  total_cv_right: 0,
  is_active: true,
  role: 'company',
  has_left: true,
  has_right: false,
  leftId: null,
  rightId: null,
}

function CompanyCard() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-amber-400 bg-gradient-to-b from-slate-900 to-slate-700 px-2 py-2 text-center shadow-lg"
      style={{ width: CARD_W, height: CARD_H }}
      title="BESTWORK — Şirket Merkezi (Ağaç Kökü)"
    >
      <span className="text-[12px] font-extrabold tracking-[0.18em] text-amber-300">BESTWORK</span>
      <span className="text-[9px] font-bold text-white/85">ŞİRKET MERKEZİ</span>
      <span className="text-[8px] font-semibold text-white/45">BİNARY AĞAÇ KÖKÜ</span>
    </div>
  )
}

/** React Flow özel düğümü: mevcut kart + gizli bağlantı noktaları (üst/alt). */
function MemberNode({ data }: NodeProps<MemberNode>) {
  const hidden: CSSProperties = { opacity: 0, width: 1, height: 1, border: 0, background: 'transparent' }
  return (
    // "nopan": React Flow bu düğümde kaydırma başlatmaz → kart tıklaması, pin
    // ve +/- butonları güvenilir çalışır. Kaydırma, tuval boşluğundan yapılır.
    <div className="nopan relative">
      <Handle type="target" position={Position.Top} style={hidden} isConnectable={false} />
      {data.isCompany ? (
        <CompanyCard />
      ) : (
        <NodeCard
          rec={data.rec}
          isRoot={data.isRoot}
          selected={data.selected}
          hasChildren={data.hasChildren}
          isOpen={data.isOpen}
          busy={data.busy}
          onSelect={data.onSelect}
          onToggle={data.onToggle}
        />
      )}
      <Handle type="source" position={Position.Bottom} style={hidden} isConnectable={false} />
    </div>
  )
}

const nodeTypes = { member: MemberNode }

/** React Flow'u ölçmek için düğüm yüksekliği (kart + pin/+- taşması payı). */
const NODE_BOX_H = CARD_H

function Inner({
  nodes,
  loaded,
  expanded,
  busy,
  rootId,
  companyLabel,
  stats,
  fitKey,
  focusId,
  selectedId,
  onSelect,
  onToggle,
}: BinaryTreeCanvasProps) {
  const rf = useReactFlow()
  const rfWidth = useStore((s) => s.width)
  const interactedRef = useRef(false)
  const fitKeyRef = useRef('')
  const pendingFocusRef = useRef<number | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [rfReady, setRfReady] = useState(false)
  const [full, setFull] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportTab, setReportTab] = useState<'aktif' | 'pasif' | null>(null)

  const openReport = (tab: 'aktif' | 'pasif' | null) => {
    setReportTab(tab)
    setShowReport(true)
  }

  /* ── d3 yerleşim (yalnız açık düğümler) ── */
  const layout = useMemo(() => {
    if (rootId == null) return null
    const root = buildLayout(rootId, nodes, loaded, expanded)
    if (!root) return null
    const displayRoot: LayoutNode = companyLabel ? { id: COMPANY_ID, children: [root] } : root
    const hier = d3.hierarchy<LayoutNode>(displayRoot, (d) => (d.children.length ? d.children : undefined))
    const rt = d3.tree<LayoutNode>().nodeSize([NODE_DX, NODE_DY])(hier)
    return { rt, x0: 0, x1: 0, y0: 0, y1: 0 }
  }, [rootId, nodes, loaded, expanded, companyLabel])

  /* ── React Flow düğüm/kenarları ── */
  const { rfNodes, rfEdges } = useMemo(() => {
    const outNodes: MemberNode[] = []
    const outEdges: RFEdge[] = []
    if (!layout) return { rfNodes: outNodes, rfEdges: outEdges }

    for (const n of layout.rt.descendants()) {
      const item = n.data
      const isCompany = !!companyLabel && item.id === COMPANY_ID
      const rec = isCompany ? COMPANY_REC : nodes[item.id]
      if (!rec) continue
      const isLoaded = !!loaded[item.id]
      const isOpen = isCompany ? true : isLoaded && !!expanded[item.id]
      const hasChildren = isCompany
        ? true
        : isLoaded
          ? rec.leftId != null || rec.rightId != null
          : rec.has_left || rec.has_right
      outNodes.push({
        id: String(item.id),
        type: 'member',
        position: { x: n.x - CARD_W / 2, y: n.y - NODE_BOX_H / 2 },
        data: {
          rec,
          isRoot: !isCompany && item.id === rootId,
          isCompany,
          selected: selectedId === item.id,
          hasChildren,
          isOpen,
          busy: !!busy[item.id],
          onSelect,
          onToggle,
        },
        draggable: false,
        selectable: false,
        connectable: false,
        width: CARD_W,
        height: NODE_BOX_H,
      })
    }

    for (const l of layout.rt.links()) {
      const rec = nodes[l.target.data.id]
      const side = rec?.position ?? (l.target.x < l.source.x ? 'L' : 'R')
      outEdges.push({
        id: `e-${l.source.data.id}-${l.target.data.id}`,
        source: String(l.source.data.id),
        target: String(l.target.data.id),
        type: 'default',
        style: { stroke: side === 'L' ? '#38bdf8' : '#a78bfa', strokeWidth: 2 },
        selectable: false,
        focusable: false,
      })
    }
    return { rfNodes: outNodes, rfEdges: outEdges }
  }, [layout, nodes, loaded, expanded, rootId, companyLabel, selectedId, busy, onSelect, onToggle])

  const centerRoot = useCallback(
    (duration = 0) => {
      const centerTarget = companyLabel ? COMPANY_ID : rootId
      const id = centerTarget != null ? String(centerTarget) : null
      if (!id) return
      const rn = rfNodes.find((n) => n.id === id)
      if (!rn) return
      const k = 1
      // Yatayda ortala, dikeyde kökü üstten biraz aşağıda konumlandır.
      const topPad = CARD_H / 2 + 52
      if (rfWidth > 0) {
        rf.setViewport(
          { x: rfWidth / 2 - (rn.position.x + CARD_W / 2) * k, y: topPad - (rn.position.y + NODE_BOX_H / 2) * k, zoom: k },
          { duration }
        )
      } else {
        rf.setCenter(rn.position.x + CARD_W / 2, rn.position.y + NODE_BOX_H / 2, { zoom: k, duration })
      }
    },
    [rf, rfNodes, rootId, companyLabel, rfWidth]
  )

  /* ── İlk/dönem değişiminde kökü ortala ── */
  useEffect(() => {
    if (!rfReady || !layout || rfNodes.length === 0) return
    const changed = fitKeyRef.current !== fitKey
    if (changed) {
      fitKeyRef.current = fitKey
      interactedRef.current = false
    }
    if (interactedRef.current) return
    let id = 0
    let tries = 0
    const run = () => {
      if (interactedRef.current) return
      centerRoot(0)
      // Ölçüm gecikirse birkaç kez tekrar dene
      if (tries++ < 3) id = window.setTimeout(run, 120)
    }
    id = window.setTimeout(run, 60)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfReady, layout, rfNodes.length, fitKey, rfWidth])

  /* ── Arama ile odaklanan düğüme ortala ── */
  useEffect(() => {
    if (focusId != null) pendingFocusRef.current = focusId
  }, [focusId])

  useEffect(() => {
    const id = pendingFocusRef.current
    if (!layout || id == null) return
    const rn = rfNodes.find((n) => n.id === String(id))
    if (!rn) return
    pendingFocusRef.current = null
    interactedRef.current = true
    rf.setCenter(rn.position.x + CARD_W / 2, rn.position.y + NODE_BOX_H / 2, { zoom: 0.9, duration: 500 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfNodes, focusId])

  const zoomBy = (factor: number) => {
    interactedRef.current = true
    rf.zoomTo(rf.getZoom() * factor, { duration: 200 })
  }

  const fitAll = () => {
    interactedRef.current = true
    rf.fitView({ padding: 0.2, minZoom: 0.05, maxZoom: 1, duration: 260 })
  }

  const rootActive = rootId != null && nodes[rootId]?.is_active !== false
  const teamTotal = stats ? stats.toplam : null
  const teamActive = stats ? stats.aktif : null
  const aktif = teamActive == null ? null : teamActive + (rootActive ? 1 : 0)
  const pasif = teamActive == null || teamTotal == null ? null : teamTotal - teamActive + (rootActive ? 0 : 1)
  const toplam = teamTotal == null ? null : teamTotal + 1

  const controls = (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
          interactedRef.current = true
          centerRoot(300)
        }}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
      >
        <RotateCcw size={14} />
      </button>
      <button
        type="button"
        onClick={fitAll}
        className="flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs fw-700 text-gray-600 transition-colors hover:bg-gray-50"
      >
        <Maximize size={13} /> Sığdır
      </button>
      <button
        type="button"
        title="Ağaç durumu raporu"
        aria-label="Ağaç durumu"
        onClick={() => openReport(null)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
      >
        <TreePine size={15} />
      </button>
      <button
        type="button"
        title={full ? 'Tam ekrandan çık' : 'Tam ekran'}
        aria-label={full ? 'Tam ekrandan çık' : 'Tam ekran'}
        onClick={() => setFull((v) => !v)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
      >
        {full ? <Shrink size={15} /> : <Expand size={15} />}
      </button>
      <span className="w-10 text-center text-xs fw-700 text-gray-400">%{Math.round(zoomLevel * 100)}</span>
    </div>
  )

  return (
    <div
      className={
        full
          ? 'fixed inset-0 z-[60] flex h-[100dvh] flex-col rounded-none border border-gray-100 bg-white shadow-sm'
          : 'w-full min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm'
      }
    >
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-2 border-b border-gray-100 px-3 py-2 sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:justify-start">
          <div className="flex items-center gap-3 text-[11px] font-medium text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> SOL HAT
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-400" /> SAĞ HAT
            </span>
          </div>
        </div>
        {controls}
      </div>

      <div
        className={
          full
            ? 'relative h-full min-h-0 w-full flex-1 overflow-hidden bg-[#f8fbff]'
            : 'relative h-[calc(100vh-260px)] min-h-[360px] w-full max-w-full overflow-hidden bg-[#f8fbff] sm:min-h-[440px] lg:min-h-[600px]'
        }
      >
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onInit={() => setRfReady(true)}
          onMoveStart={(e) => {
            if (e) interactedRef.current = true
          }}
          onMove={(_e, vp) => setZoomLevel(vp.zoom)}
          minZoom={0.05}
          maxZoom={2.5}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll={false}
          zoomOnScroll
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
          fitView={false}
        >
          <Background id="minor" variant={BackgroundVariant.Lines} gap={20} lineWidth={1} color="#e2eefb" />
          <Background id="major" variant={BackgroundVariant.Lines} gap={100} lineWidth={1.2} color="#c2dcf5" />
        </ReactFlow>
      </div>

      {showReport && (
        <TreeReportModal
          onClose={() => setShowReport(false)}
          aktif={aktif}
          pasif={pasif}
          toplam={toplam}
          initialTab={reportTab}
          kokId={rootId ?? 0}
        />
      )}
    </div>
  )
}

export function BinaryTreeCanvas(props: BinaryTreeCanvasProps) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  )
}
