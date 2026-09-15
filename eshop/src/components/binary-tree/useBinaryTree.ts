// ============================================
// BestWork - Binary ağaç veri katmanı (lazy load)
//
// Sözleşme:
//   - /tree/level (kök) çekilir; düğüm + iki çocuğu gelir.
//   - Bir düğümün alt dalları istenirse /tree/level?id=<id> çağrılır.
//   - getirilen düğümün çocukları da kendi has_left/has_right bilgisini taşır;
//     böylece arayüz "gizli çocuk" yer tutucularını çizebilir.
// Ham uçlar (envelope yok) → rawGet kullanılır.
// ============================================
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { rawGet } from '@/lib/raw'
import type { NodeRec, SearchResult, TreeNode } from './types'

function toRec(n: TreeNode, prev?: NodeRec): NodeRec {
  return {
    user_id: n.user_id,
    name: n.name,
    member_code: n.member_code,
    position: n.position ?? null,
    package: n.package ?? null,
    rank: n.rank ?? null,
    image_path: n.image_path ?? null,
    total_pv_accumulated: n.total_pv_accumulated,
    total_cv_accumulated: n.total_cv_accumulated,
    total_pv_left: n.total_pv_left,
    total_pv_right: n.total_pv_right,
    total_cv_left: n.total_cv_left,
    total_cv_right: n.total_cv_right,
    is_active: n.is_active,
    role: n.role,
    has_left: n.has_left,
    has_right: n.has_right,
    // Yüklenen gerçek çocuk yoksa (shallow yanıt) daha önce bilinen kimliği koru.
    leftId: n.left_child ? n.left_child.user_id : prev?.leftId ?? null,
    rightId: n.right_child ? n.right_child.user_id : prev?.rightId ?? null,
  }
}

export interface BinaryTreeState {
  nodes: Record<number, NodeRec>
  loaded: Record<number, boolean>
  expanded: Record<number, boolean>
  busy: Record<number, boolean>
  rootId: number | null
  minMonth: string
  loading: boolean
  error: string
  /** Alt hattın sayaçları (kök hariç): toplam ve aktif. Pasif = toplam - aktif. */
  stats: { toplam: number; aktif: number } | null
}

export interface UseBinaryTree extends BinaryTreeState {
  /** Bir düğümü açar; verisi yoksa getirir, varsa açar/kapar. */
  toggle: (id: number) => void
  /** Verisi olmayan bir düğümü getirir (yer tutucudan çağrılır). */
  loadNode: (id: number) => void
  /** Arama sonucunun kökten hedefe yolunu açar. Hedef kimliğini döndürür. */
  revealPath: (path: number[]) => Promise<number | null>
  search: (q: string) => Promise<SearchResult[]>
}

export function useBinaryTree(period: string): UseBinaryTree {
  const [nodes, setNodes] = useState<Record<number, NodeRec>>({})
  const [loaded, setLoaded] = useState<Record<number, boolean>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [busy, setBusy] = useState<Record<number, boolean>>({})
  const [rootId, setRootId] = useState<number | null>(null)
  const [minMonth, setMinMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<{ toplam: number; aktif: number } | null>(null)

  // Yükleme durumunu ref'te de tut: sıralı revealPath/expandAll döngüleri state
  // gecikmesinden etkilenmesin. nodesRef, merge ile senkron güncel tutulur.
  const loadedRef = useRef<Record<number, boolean>>({})
  const nodesRef = useRef<Record<number, NodeRec>>({})

  const querySuffix = period ? `&month=${period}` : ''

  /** Gelen düğüm ağını (kendisi + çocukları) düz depoya işler. */
  const merge = useCallback((incoming: TreeNode) => {
    const next = { ...nodesRef.current }
    const walk = (n: TreeNode) => {
      next[n.user_id] = toRec(n, next[n.user_id])
      if (n.left_child) walk(n.left_child)
      if (n.right_child) walk(n.right_child)
    }
    walk(incoming)
    nodesRef.current = next
    setNodes(next)
  }, [])

  const markLoaded = useCallback((id: number) => {
    loadedRef.current = { ...loadedRef.current, [id]: true }
    setLoaded((prev) => (prev[id] ? prev : { ...prev, [id]: true }))
  }, [])

  /** Belirli bir düğümün iki çocuğunu getirir ve açar. Yüklenen düğümü döndürür. */
  const loadNode = useCallback(
    async (id: number): Promise<NodeRec | null> => {
      if (loadedRef.current[id]) {
        setExpanded((prev) => ({ ...prev, [id]: true }))
        return nodesRef.current[id] ?? null
      }
      setBusy((prev) => ({ ...prev, [id]: true }))
      let yuklenen: NodeRec | null = null
      try {
        const r = await rawGet<{ node: TreeNode }>(`/tree/level?id=${id}${querySuffix}`)
        if (r.node) {
          merge(r.node)
          markLoaded(r.node.user_id)
          setExpanded((prev) => ({ ...prev, [r.node.user_id]: true }))
          if (r.node.user_id !== id) markLoaded(id)
          yuklenen = nodesRef.current[r.node.user_id] ?? null
        }
        setError('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Dal yüklenemedi.')
      } finally {
        setBusy((prev) => {
          const n = { ...prev }
          delete n[id]
          return n
        })
      }
      return yuklenen
    },
    [merge, markLoaded, querySuffix]
  )

  const toggle = useCallback(
    (id: number) => {
      if (!loadedRef.current[id]) {
        void loadNode(id)
        return
      }
      setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
    },
    [loadNode]
  )

  /**
   * Kökü yükler. Bu hook, dönem değişiminde REMOUNT edilecek şekilde
   * kullanılır (sayfada `key={period}`); bu yüzden effect içinde state
   * SIFIRLAMASI yapılmaz — başlangıç durumu zaten boştur ve kural gereği
   * effect gövdesinde senkron setState'ten kaçınılır.
   */
  useEffect(() => {
    let cancelled = false
    rawGet<{ node: TreeNode; min_month: string }>(
      `/tree/level${querySuffix ? `?${querySuffix.slice(1)}` : ''}`
    )
      .then((r) => {
        if (cancelled || !r.node) return
        merge(r.node)
        markLoaded(r.node.user_id)
        setRootId(r.node.user_id)
        setExpanded((prev) => ({ ...prev, [r.node.user_id]: true }))
        if (r.min_month) setMinMonth(r.min_month)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ağaç yüklenemedi.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [querySuffix, merge, markLoaded])

  /**
   * Alt hat sayaçları: toplam üye ve aktif üye. `/tree/downline` filtresiz ve
   * `durum=aktif` sorgularının döndürdüğü `total` değerleri kullanılır (COUNT).
   * Pasif, toplam - aktif olarak hesaplanır.
   */
  useEffect(() => {
    if (rootId == null) return
    let cancelled = false
    Promise.all([
      rawGet<{ total: number }>('/tree/downline?limit=1'),
      rawGet<{ total: number }>('/tree/downline?durum=aktif&limit=1'),
    ])
      .then(([hepsi, aktif]) => {
        if (cancelled) return
        setStats({ toplam: Number(hepsi.total) || 0, aktif: Number(aktif.total) || 0 })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [rootId])

  const search = useCallback(async (q: string) => {
    const query = q.trim()
    if (query.length < 2) return []
    const r = await rawGet<{ results: SearchResult[] }>(
      `/tree/search?q=${encodeURIComponent(query)}`
    )
    return Array.isArray(r.results) ? r.results : []
  }, [])

  /** Yol üzerindeki her düğümü (gerekirse getirip) açar; hedef kimliğini döndürür. */
  const revealPath = useCallback(
    async (path: number[]) => {
      if (!path.length) return null
      for (const id of path) {
        if (!loadedRef.current[id]) {
          await loadNode(id)
        } else {
          setExpanded((prev) => ({ ...prev, [id]: true }))
        }
      }
      return path[path.length - 1] ?? null
    },
    [loadNode]
  )

  return {
    nodes,
    loaded,
    expanded,
    busy,
    rootId,
    minMonth,
    loading,
    error,
    stats,
    toggle,
    loadNode: (id: number) => void loadNode(id),
    revealPath,
    search,
  }
}
