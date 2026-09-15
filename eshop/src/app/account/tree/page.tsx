// ============================================
// BestWork - Binary Ağacım (lazy yükleme + arama)
//
// Sunucu tarafı: /tree/level yalnızca istenen düğümü ve iki çocuğunu döndürür.
// Arayüz bu yüzden ağacı düğüm düğüm büyütür; tüm alt ağaç hiçbir zaman tek
// istekte çekilmez (milyonlarca üyede ölçeklenebilir).
//
// Dönem değişince ağaç içeriği `key={period}` ile REMOUNT edilir; böylece
// ağaç/arama/seçim durumu suni sıfırlama yapılmadan tazelenir.
// ============================================
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import AccountTopMenu from '@/components/AccountTopMenu'
import {
  BinaryTreeCanvas,
  NodeDetailPanel,
  useBinaryTree,
  type SearchResult,
} from '@/components/binary-tree'
import { CalendarDays, GitFork, House, Search, X } from '@/components/icons'

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function TreePage() {
  const [period, setPeriod] = useState(currentMonth())
  return (
    <div className="bw-tree-ui space-y-4">
      <AccountTopMenu />
      <TreeExplorer key={period} period={period} onPeriodChange={setPeriod} />
    </div>
  )
}

function TreeExplorer({
  period,
  onPeriodChange,
}: {
  period: string
  onPeriodChange: (month: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [focusId, setFocusId] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tree = useBinaryTree(period)
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
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <GitFork size={24} className="text-brand-600" /> Binary Ağacım
          </h1>
          <p className="text-sm text-gray-400">
            Aktif üyeler yeşil, pasif üyeler kırmızı çerçevelidir. Kartlarda sol/sağ CV görünür.
          </p>
        </div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      {/* Dönem + arama */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-600">
          <CalendarDays size={18} className="text-brand-600" /> Görüntülenen dönem
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {tree.minMonth && <span className="text-xs text-gray-400">En eski kayıt: {tree.minMonth}</span>}
          <input
            type="month"
            value={period}
            min={tree.minMonth || '2024-01'}
            max={currentMonth()}
            onChange={(e) => {
              if (e.target.value && e.target.value !== period) onPeriodChange(e.target.value)
            }}
            className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>
      </div>

      {/* Arama */}
      <div className="relative max-w-md">
        <Search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder="Kendi alt hattınızda isim veya üye kodu ara..."
          className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-10 pl-10 text-sm placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
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
          <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white p-1 shadow-lg">
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
                    <span className="block truncate text-sm font-bold text-gray-800">{r.node.name}</span>
                    <span className="block font-mono text-[11px] text-gray-400">{r.node.member_code}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                    {r.path.length - 1}. nesil
                  </span>
                </button>
              ))
            )}
          </div>
        )}
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
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
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
          stats={tree.stats}
          fitKey={period}
          focusId={focusId}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggle={tree.toggle}
        />
      )}

      <NodeDetailPanel nodeId={selectedId} rec={selectedRec} onClose={() => setSelectedId(null)} />
    </>
  )
}
