// ============================================
// BestWork Panel - Binary Ağaç (/bestmanager/agac)
//
// Eshop'taki "Binary Ağacım" görünümünün PANEL sürümü: lazy yükleme + arama
// + sabitleme + dönem filtresi aynen korunur. Yönetici olduğu için tüm ağaçta
// gezinebilir (backend id bağımsız düğüm yetkisi verir).
// ============================================
'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BinaryTreeCanvas,
  NodeProfileModal,
  useBinaryTree,
  type SearchResult,
} from '@/components/binary-tree'
import { CalendarDays, GitFork, Search, X } from '@/components/binary-tree/icons'
import { getMemberCounts, type MemberCounts } from '@/lib/api'

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AgacPage() {
  const [period, setPeriod] = useState(currentMonth())
  const [rootNode, setRootNode] = useState<{ id: number; name: string } | null>(null)
  const [counts, setCounts] = useState<MemberCounts | null>(null)

  useEffect(() => {
    let alive = true
    getMemberCounts()
      .then((d) => {
        if (alive) setCounts(d)
      })
      .catch(() => {
        if (alive) setCounts({ total: 0, active: 0, passive: 0, root_id: null })
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="bw-tree-ui space-y-4 overflow-x-hidden">
      {/* Sistem sayaçları — aktif / pasif / toplam üye */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
            Aktif Üye
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {counts ? counts.active.toLocaleString('tr-TR') : '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/25 dark:bg-red-500/10">
          <div className="text-xs font-semibold uppercase tracking-wide text-red-700/80 dark:text-red-300/80">
            Pasif Üye
          </div>
          <div className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">
            {counts ? counts.passive.toLocaleString('tr-TR') : '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-500/25 dark:bg-brand-500/10">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-700/80 dark:text-brand-300/80">
            Toplam Üye
          </div>
          <div className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-300">
            {counts ? counts.total.toLocaleString('tr-TR') : '—'}
          </div>
        </div>
      </div>

      {counts === null ? (
        <div className="py-16 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <TreeExplorer
          key={`${period}:${rootNode?.id ?? counts.root_id ?? 'self'}`}
          period={period}
          onPeriodChange={setPeriod}
          rootId={rootNode?.id ?? null}
          defaultRootId={counts.root_id ?? null}
          rootName={rootNode?.name ?? null}
          onOpenRoot={(id, name) => setRootNode({ id, name })}
          onBackToSelf={() => setRootNode(null)}
        />
      )}
    </div>
  )
}

function TreeExplorer({
  period,
  onPeriodChange,
  rootId,
  defaultRootId,
  rootName,
  onOpenRoot,
  onBackToSelf,
}: {
  period: string
  onPeriodChange: (month: string) => void
  rootId: number | null
  defaultRootId: number | null
  rootName: string | null
  onOpenRoot: (id: number, name: string) => void
  onBackToSelf: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [focusId, setFocusId] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ağaç, şirket kökünden (varsayılan) yüklenir; pin ile bir kök seçilirse ondan.
  const tree = useBinaryTree(period, rootId ?? defaultRootId)
  const { search } = tree

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  const handleQuery = (value: string) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    const q = value.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    timerRef.current = setTimeout(() => {
      search(q)
        .then((r) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 300)
  }

  const pickResult = async (r: SearchResult) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setQuery('')
    setResults([])
    setSelectedId(r.node.user_id)
    const id = await tree.revealPath(r.path)
    if (id != null) setFocusId(id)
  }

  const selectedRec = selectedId != null ? tree.nodes[selectedId] ?? null : null

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900 dark:text-white/90">
            <GitFork size={24} className="text-brand-600" /> Binary Ağaç
          </h1>
          <p className="text-sm text-gray-400">
            Aktif üyeler yeşil, pasif üyeler kırmızı çerçevelidir. Kartlarda sol/sağ CV görünür.
          </p>
        </div>
      </div>

      {rootName && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-100 bg-brand-50/60 px-3 py-2">
          <span className="text-xs fw-700 text-brand-700">
            Görüntülenen kök: <span className="text-gray-800">{rootName}</span> ve alt ekibi
          </span>
          <button
            type="button"
            onClick={onBackToSelf}
            className="cursor-pointer rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs fw-700 text-brand-700 transition-colors hover:bg-brand-50"
          >
            Kendi ağacıma dön
          </button>
        </div>
      )}

      {/* Dönem + arama (tek satırda) */}
      <div className="flex flex-wrap items-center gap-2">
        <label
          title={tree.minMonth ? `En eski kayıt: ${tree.minMonth}` : undefined}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900"
        >
          <CalendarDays size={16} className="text-brand-600" />
          <input
            type="month"
            value={period}
            min={tree.minMonth || '2024-01'}
            max={currentMonth()}
            onChange={(e) => {
              if (e.target.value && e.target.value !== period) onPeriodChange(e.target.value)
            }}
            className="cursor-pointer bg-transparent text-sm text-gray-700 outline-none dark:text-gray-200"
          />
        </label>

        <div className="relative min-w-[180px] flex-1">
          <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Tüm ağaçta isim veya üye kodu ara..."
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-10 pl-10 text-sm placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          />
          {query && (
            <button
              type="button"
              aria-label="Temizle"
              onClick={() => handleQuery('')}
              className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}

          {(searching || results.length > 0) && query.trim().length >= 2 && (
            <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
              {searching ? (
                <div className="px-3 py-3 text-xs text-gray-400">Aranıyor...</div>
              ) : (
                results.map((r) => (
                  <button
                    key={r.node.user_id}
                    type="button"
                    onClick={() => void pickResult(r)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-brand-50/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-gray-800 dark:text-white/90">
                        {r.node.name}
                      </span>
                      <span className="block font-mono text-[11px] text-gray-400">{r.node.member_code}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-white/5 dark:text-gray-400">
                      {r.path.length - 1}. nesil
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {tree.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {tree.error}
        </div>
      )}

      {tree.loading ? (
        <div className="py-16 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : !tree.rootId ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <GitFork size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">Ağaç verisi bulunamadı.</p>
        </div>
      ) : (
        <BinaryTreeCanvas
          nodes={tree.nodes}
          loaded={tree.loaded}
          expanded={tree.expanded}
          busy={tree.busy}
          rootId={tree.rootId}
          companyLabel="BESTWORK"
          stats={tree.stats}
          fitKey={period}
          focusId={focusId}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggle={tree.toggle}
        />
      )}

      {selectedId != null && (
        <NodeProfileModal
          key={selectedId}
          nodeId={selectedId}
          rec={selectedRec}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
