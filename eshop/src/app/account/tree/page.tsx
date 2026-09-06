// ============================================
// BestWork - Binary Ağacım (D3) — bestwork2
// ============================================
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { House, GitFork, CalendarDays } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { BinaryTreeView, type TreeNode } from '@/components/BinaryTreeView'
import { rawGet } from '@/lib/raw'

const DEPTH = 2

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function TreePage() {
  const [root, setRoot] = useState<TreeNode | null>(null)
  const [minMonth, setMinMonth] = useState('')
  const [period, setPeriod] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback((month: string) => {
    setLoading(true)
    rawGet<{ tree?: TreeNode | null; min_month?: string }>(`/tree?depth=${DEPTH}&month=${month}`)
      .then((r) => {
        setRoot(r.tree ?? null)
        if (r.min_month) setMinMonth(r.min_month)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ağaç yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setPeriod(currentMonth())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (period) load(period)
  }, [period, load])

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900">
            <GitFork size={24} className="text-brand-600" /> Binary Ağacım
          </h1>
          <p className="text-sm text-gray-400">Düğüme tıklayın; sol/sağ CV, ekip ve PV detaylarını görün.</p>
        </div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      {/* Dönem seçici */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-600">
          <CalendarDays size={18} className="text-brand-600" /> Görüntülenen dönem
        </span>
        <div className="flex items-center gap-2">
          {minMonth && <span className="text-xs text-gray-400">En eski kayıt: {minMonth}</span>}
          <input
            type="month"
            value={period}
            min={minMonth || '2024-01'}
            max={currentMonth()}
            onChange={(e) => e.target.value && setPeriod(e.target.value)}
            className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-14 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : !root ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
          Ağaç verisi bulunamadı.
        </div>
      ) : (
        <BinaryTreeView root={root} />
      )}
    </div>
  )
}
