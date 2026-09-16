// ============================================
// BestWork - Kariyer Seviyeleri (yatay şerit)
//
// Rütbeleri gem ikonlarıyla gösterir; kazanılan/aktif/sıradaki/kilitli
// durumlarını renklendirir. Dashboard ve Kariyer sayfasında kullanılır.
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Crown,
  Gem,
  Diamond,
  Leaf,
  Heart,
  Sparkles,
  Shield,
  Medal,
  Trophy,
} from '@/components/icons'
import { get } from '@/lib/api'
import { rawGet } from '@/lib/raw'

export interface RankInfo {
  id: number
  name: string
  required_left_pv: number
  required_right_pv: number
  required_downline_rank_id?: number | null
  required_downline_count?: number
  personal_activity_pv?: number
}

interface CareerItem {
  rank_id: number
  achieved_at: string
  is_active: boolean
}

// Rütbe başına renk + altın (başkan/elçi)
export function rankStyle(name: string): { color: string; gold: boolean } {
  const n = name.toLocaleLowerCase('tr-TR')
  const colors: Record<string, string> = {
    jade: '#2e7d32',
    pearl: '#90a4ae',
    safir: '#1565c0',
    sapphire: '#1565c0',
    ruby: '#c62828',
    zümrüt: '#43a047',
    emerald: '#43a047',
    diamond: '#4fc3f7',
    'blue diamond': '#1e88e5',
    'green diamond': '#43a047',
    'red diamond': '#e53935',
    'black diamond': '#263238',
    president: '#f9a825',
    ambassador: '#ffb300',
  }
  return { color: colors[n] ?? '#90caf9', gold: n === 'president' || n === 'ambassador' }
}

// Rütbeye göre ikon (İngilizce adlar; eski Türkçe adlar da destekli)
export function rankIcon(name: string) {
  const n = name.toLocaleLowerCase('tr-TR')
  if (n.includes('ambassador')) return Trophy
  if (n.includes('president')) return Crown
  if (n.includes('black diamond')) return Shield
  if (n.includes('diamond')) return Diamond
  if (n.includes('ruby') || n.includes('yakut')) return Heart
  if (n.includes('pearl') || n.includes('inci')) return Sparkles
  if (n.includes('jade') || n.includes('yeşim')) return Leaf
  if (n.includes('sapphire') || n.includes('safir') || n.includes('emerald') || n.includes('zümrüt')) return Gem
  return Medal
}

export function CareerLevels({
  className = '',
  onSelect,
  selectedId = null,
}: {
  className?: string
  /** Verilirse kutular link yerine seçim yapar (hedef rütbe seçimi). */
  onSelect?: (rankId: number) => void
  selectedId?: number | null
}) {
  const [ranks, setRanks] = useState<RankInfo[]>([])
  const [career, setCareer] = useState<CareerItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([get<RankInfo[]>('/eshop/ranks'), rawGet<{ career?: CareerItem[] }>('/user/career')])
      .then(([r, c]) => {
        if (!alive) return
        if (r.success && Array.isArray(r.data)) setRanks(r.data)
        setCareer(Array.isArray(c.career) ? c.career : [])
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}>
        <div className="mb-3 h-3 w-40 animate-pulse rounded bg-gray-100" />
        <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible md:grid-cols-8 lg:grid-cols-12">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-[86px] w-[92px] shrink-0 animate-pulse rounded-xl bg-gray-50 sm:w-auto sm:shrink" />
          ))}
        </div>
      </div>
    )
  }

  if (ranks.length === 0) return null

  const achievedMap = new Map(career.map((c) => [c.rank_id, c]))
  const activeID = career.find((c) => c.is_active)?.rank_id ?? null
  const steps = ranks.map((rank, i) => ({
    rank,
    isAchieved: achievedMap.has(rank.id),
    isActive: rank.id === activeID,
    isNext: !achievedMap.has(rank.id) && (i === 0 || achievedMap.has(ranks[i - 1].id)),
  }))

  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-center gap-2 text-xs fw-800 tracking-wide text-gray-700 sm:justify-start">
        <Crown size={16} className="text-amber-500" /> KARİYER SEVİYELERİ
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] sm:grid sm:grid-cols-6 sm:overflow-visible md:grid-cols-8 lg:grid-cols-12">
        {steps.map(({ rank, isAchieved, isActive, isNext }) => {
          const meta = rankStyle(rank.name)
          const Icon = rankIcon(rank.name)
          const selected = selectedId === rank.id
          const cls = `flex min-h-[86px] w-[92px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-1.5 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md sm:w-auto sm:shrink ${
            isActive
              ? 'border-brand-600 bg-brand-600 shadow-md'
              : isAchieved
                ? 'border-amber-300 bg-amber-50'
                : isNext
                  ? 'border-brand-300 bg-brand-50/50'
                  : 'border-gray-100 bg-white'
          } ${selected ? 'ring-2 ring-brand-500 ring-offset-1' : ''}`
          const content = (
            <>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ring-white/60"
                style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : meta.color }}
              >
                <Icon size={18} className="text-white" />
              </span>
              <span
                className={`w-full text-center text-[9px] fw-800 uppercase leading-tight break-words ${
                  isActive
                    ? 'text-white'
                    : isAchieved
                      ? 'text-amber-800'
                      : isNext
                        ? 'text-brand-800'
                        : 'text-gray-500'
                }`}
              >
                {rank.name}
              </span>
              {isActive && <span className="text-[8px] fw-700 text-white/90">GÜNCEL</span>}
            </>
          )
          if (onSelect) {
            return (
              <button
                key={rank.id}
                type="button"
                onClick={() => onSelect(rank.id)}
                title={`${rank.name} — hedef seç`}
                className={cls}
              >
                {content}
              </button>
            )
          }
          return (
            <Link key={rank.id} href="/account/career" title={`${rank.name} — Kariyer Takibi`} className={cls}>
              {content}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
