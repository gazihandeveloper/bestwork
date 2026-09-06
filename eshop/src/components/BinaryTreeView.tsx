// ============================================
// BestWork - BinaryTreeView (D3) — gelişmiş
// Düğüm → detay (SPONSOR + gerçek EK sayıları /user/card ile)
// ============================================
'use client'

import { useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { rawGet } from '@/lib/raw'

export interface TreeNode {
  user_id: number
  name: string
  member_code: string
  position: string | null
  package: string | null
  rank: string | null
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

function pctPair(node: TreeNode): { sol: number; sag: number } {
  const l = teamCount(node.left_child)
  const r = teamCount(node.right_child)
  const tot = l + r
  const sol = tot > 0 ? Math.round((l / tot) * 100) : 50
  return { sol, sag: 100 - sol }
}

function weaker(node: TreeNode): string {
  const l = teamCount(node.left_child)
  const r = teamCount(node.right_child)
  return l === r ? 'EŞİT' : l < r ? 'SAĞ' : 'SOL'
}

export function BinaryTreeView({ root }: { root: TreeNode }) {
  const [selected, setSelected] = useState<TreeNode | null>(null)
  const [card, setCard] = useState<UserCard | null>(null)
  const [zoom, setZoom] = useState(1)
  const cardCache = useRef<Map<number, UserCard>>(new Map())

  const openDetail = (node: TreeNode) => {
    setSelected(node)
    setCard(null)
    const cached = cardCache.current.get(node.user_id)
    if (cached) {
      setCard(cached)
      return
    }
    rawGet<{ card?: UserCard }>(`/user/card?id=${node.user_id}`)
      .then((r) => {
        const c = r?.card
        if (c) {
          cardCache.current.set(node.user_id, c)
          setCard(c)
        }
      })
      .catch(() => {})
  }

  const layout = useMemo(() => {
    const data = d3.hierarchy<any>(root, (d) => [d.left_child, d.right_child].filter(Boolean))
    const rt = d3.tree<any>().nodeSize([240, 165])(data)
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

  if (!layout) return null
  const { rt, x0, x1, y1 } = layout
  const W = Math.max(1100, x1 - x0 + 300)
  const H = Math.max(760, y1 + 240)
  const tx = 150 - x0
  const ty = 60
  const links = rt.links()
  const nodes = rt.descendants()
  const sel = selected

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-extrabold text-blue-600">SOL {pctPair(root).sol}%</span>
            <span className="text-gray-400">
              Zayıf: <b className="text-gray-800">{weaker(root)}</b>
            </span>
            <span className="font-extrabold text-purple-600">{pctPair(root).sag}% SAĞ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Uzaklaştır"
              onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
            >
              −
            </button>
            <button
              type="button"
              aria-label="Yakınlaştır"
              onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(2)))}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
            >
              +
            </button>
            <span className="w-10 text-center text-xs font-bold text-gray-400">%{Math.round(zoom * 100)}</span>
          </div>
        </div>
        <div className="h-2 bg-gray-100">
          <div className="flex h-full">
            <div className="bg-blue-600" style={{ width: `${pctPair(root).sol}%` }} />
            <div className="bg-purple-600" style={{ width: `${pctPair(root).sag}%` }} />
          </div>
        </div>

        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 900 }} className="block h-auto">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="27" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#d3ddec" />
              </marker>
            </defs>
            <g transform={`translate(${tx},${ty}) scale(${zoom})`}>
              {links.map((l, i) => (
                <path
                  key={i}
                  d={
                    d3
                      .linkVertical<any, any>()
                      .x((d) => d.x)
                      .y((d) => d.y)({ source: l.source, target: l.target }) ?? ''
                  }
                  fill="none"
                  stroke="#dbe3ef"
                  strokeWidth={2}
                  markerEnd="url(#arrow)"
                />
              ))}
              {nodes.map((n, i) => {
                const d = n.data as TreeNode
                const isRoot = d.user_id === root.user_id
                const color = isRoot ? '#2563eb' : d.position === 'L' ? '#2563eb' : d.position === 'R' ? '#9333ea' : '#64748b'
                const dim = d.is_active === false
                return (
                  <g key={i} transform={`translate(${n.x},${n.y})`} className="cursor-pointer" onClick={() => openDetail(d)}>
                    <circle r={30} fill="#fff" stroke={color} strokeWidth={4} opacity={dim ? 0.45 : 1} />
                    <circle r={30} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={10} />
                    <text y={2} textAnchor="middle" fontSize={17} fontWeight={800} fill={color} opacity={dim ? 0.45 : 1}>
                      {initials(d.name)}
                    </text>
                    <text y={46} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="#334155" opacity={dim ? 0.4 : 1}>
                      {d.name?.slice(0, 15)}
                    </text>
                    <text y={62} textAnchor="middle" fontSize={10} fill="#94a3b8" opacity={dim ? 0.4 : 1}>
                      {d.member_code}
                    </text>
                    {isRoot && (
                      <g>
                        <rect x={-24} y={-78} width={48} height={18} rx={9} fill="#2563eb" />
                        <text y={-65} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">
                          KÖK
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Detay paneli */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {!sel ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-400">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.4" className="mx-auto">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Detay görmek için ağaçta bir düğüme tıklayın
          </div>
        ) : (
          <MemberCard node={sel} card={card} isRoot={sel.user_id === root.user_id} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  )
}

function MemberCard({
  node,
  card,
  isRoot,
  onClose,
}: {
  node: TreeNode
  card: UserCard | null
  isRoot: boolean
  onClose: () => void
}) {
  const display = card ?? {}
  const name = display.name || node.name
  const code = display.member_code || node.member_code
  const active = display.is_active !== undefined ? display.is_active : node.is_active !== false
  const lTeam = card?.left_team_count != null ? Number(card.left_team_count) : teamCount(node.left_child)
  const rTeam = card?.right_team_count != null ? Number(card.right_team_count) : teamCount(node.right_child)
  const tot = lTeam + rTeam
  const solPct = tot > 0 ? Math.round((lTeam / tot) * 100) : 50
  const sagPct = 100 - solPct
  const weak = lTeam === rTeam ? 'EŞİT' : lTeam < rTeam ? 'SAĞ' : 'SOL'
  const lCv = display.total_cv_left ?? node.total_cv_left
  const rCv = display.total_cv_right ?? node.total_cv_right
  const lPv = display.total_pv_left ?? node.total_pv_left
  const rPv = display.total_pv_right ?? node.total_pv_right
  const rank = display.rank || node.rank
  const pkg = display.package || node.package

  return (
    <div>
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 p-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white ${active ? 'bg-blue-600' : 'bg-gray-400'}`}>
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold text-gray-900">{name}</p>
            <p className="font-mono text-xs text-gray-400">{code}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Kapat"
          onClick={onClose}
          className="shrink-0 cursor-pointer rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Rozetler */}
        <div className="flex flex-wrap items-center gap-2">
          {isRoot && <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">KÖK</span>}
          {pkg && <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{pkg}</span>}
          <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">{rank || 'GİRİŞİMCİ'}</span>
          <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {active ? 'AKTİF' : 'PASİF'}
          </span>
        </div>

        {/* Zayıf + bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-bold">
            <span className="text-blue-600">SOL {solPct}%</span>
            <span className="text-gray-500">Zayıf: <b className="text-gray-800">{weak}</b></span>
            <span className="text-purple-600">{sagPct}% SAĞ</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="flex h-full">
              <div className="bg-blue-600" style={{ width: `${solPct}%` }} />
              <div className="bg-purple-600" style={{ width: `${sagPct}%` }} />
            </div>
          </div>
        </div>

        {/* Metrikler */}
        <div className="overflow-hidden rounded-xl border border-gray-100">
          {[
            { label: 'SOL.CV', val: lCv, cls: 'text-blue-600' },
            { label: 'SAĞ.CV', val: rCv, cls: 'text-purple-600' },
            { label: 'SOL.EK', val: lTeam, cls: 'text-blue-600' },
            { label: 'SAĞ.EK', val: rTeam, cls: 'text-purple-600' },
            { label: 'SOL.PV', val: lPv, cls: 'text-blue-600' },
            { label: 'SAĞ.PV', val: rPv, cls: 'text-purple-600' },
          ].map((m, i) => (
            <div key={m.label} className={`flex items-center justify-between px-3 py-2 ${i % 2 === 0 ? 'bg-gray-50/70' : ''}`}>
              <p className="text-[11px] font-bold tracking-wide text-gray-400 uppercase">{m.label}</p>
              <p className={`text-base font-extrabold ${m.cls}`}>{fmt(m.val)}</p>
            </div>
          ))}
        </div>

        {/* Sponsor + Cüzdan */}
        <div className="grid grid-cols-1 gap-2 text-sm">
          {card && display.sponsor_name && (
            <div className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <span className="text-xs font-bold text-gray-400">SPONSOR</span>
              <span className="font-bold text-gray-800">{display.sponsor_name}</span>
            </div>
          )}
          {(display.wallet_balance != null || display.chip_balance != null) && (
            <div className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
              <span className="text-xs font-bold text-gray-400">BAKİYE</span>
              <span className="font-bold text-green-600">
                {fmt(display.wallet_balance)} TL {display.chip_balance != null && `· ${fmt(display.chip_balance)} chip`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
