// ============================================
// BestWork - Kariyer Takibi — BestWork (yeni tasarım)
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { House, Trophy, Star, CircleCheck, Lock } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { get } from '@/lib/api'
import { rawGet } from '@/lib/raw'

interface RankInfo {
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

interface MePV {
  total_pv_left?: number
  total_pv_right?: number
}

const fmt = (v: number) => (Number(v) || 0).toLocaleString('tr-TR')

// Rütbe başına renk + yıldız
function rankStyle(name: string): { color: string; gold: boolean } {
  const n = name.toLocaleLowerCase('tr-TR')
  const colors: Record<string, string> = {
    jade: '#2e7d32',
    pearl: '#90a4ae',
    safir: '#1565c0',
    ruby: '#c62828',
    zümrüt: '#43a047',
    emerald: '#43a047',
    sapphire: '#1e88e5',
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

const downlineName = (ranks: RankInfo[], id?: number | null) => ranks.find((r) => r.id === id)?.name ?? ''

export default function CareerPage() {
  const [ranks, setRanks] = useState<RankInfo[]>([])
  const [career, setCareer] = useState<CareerItem[]>([])
  const [me, setMe] = useState<MePV | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([
      rawGet<{ career?: CareerItem[] }>('/user/career'),
      get<RankInfo[]>('/eshop/ranks'),
      get<MePV>('/eshop/me'),
    ])
      .then(([c, r, m]) => {
        if (!alive) return
        setCareer(Array.isArray(c.career) ? c.career : [])
        if (r.success && Array.isArray(r.data)) setRanks(r.data)
        if (m.success && m.data) setMe(m.data)
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Kariyer verisi yüklenemedi.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const achievedMap = new Map(career.map((c) => [c.rank_id, c]))
  const activeID = career.find((c) => c.is_active)?.rank_id ?? null
  const leftPV = Number(me?.total_pv_left) || 0
  const rightPV = Number(me?.total_pv_right) || 0

  const steps = ranks.map((rank, i) => {
    const isAchieved = achievedMap.has(rank.id)
    const isActive = rank.id === activeID
    const isNext = !isAchieved && (i === 0 || achievedMap.has(ranks[i - 1].id))
    return { rank, isAchieved, isActive, isNext, index: i }
  })
  const nextStep = steps.find((s) => s.isNext) ?? null

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Kariyer Takibi</h1>
          <p className="text-sm text-gray-400">
            Rütbeler hat PV toplamlarına göre kazanılır ve kalıcıdır — adım adım ilerleyin.
          </p>
        </div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : ranks.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
          Rütbe tanımları bulunamadı.
        </div>
      ) : (
        <>
          {/* Durum şeridi */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-700">
              <Trophy size={18} className="text-amber-500" />
              {nextStep ? (
                <>
                  Sıradaki hedef: <span className="text-brand-700">{nextStep.rank.name.toLocaleUpperCase('tr-TR')}</span>
                </>
              ) : (
                'Tüm rütbeler kazanıldı 🎉'
              )}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
              Sol {fmt(leftPV)} PV · Sağ {fmt(rightPV)} PV
            </span>
          </div>

          {/* Rütbe kartları */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {steps.map(({ rank, isAchieved, isActive, isNext }) => {
              const meta = rankStyle(rank.name)
              const st = achievedMap.get(rank.id)
              const leftPct = Math.min(100, Math.round((leftPV / rank.required_left_pv) * 100))
              const rightPct = Math.min(100, Math.round((rightPV / rank.required_right_pv) * 100))
              const pct = Math.round((leftPct + rightPct) / 2)
              const extras: string[] = []
              if ((rank.required_downline_count ?? 0) > 0 && rank.required_downline_rank_id) {
                extras.push(`Alt: ${rank.required_downline_count} × ${downlineName(ranks, rank.required_downline_rank_id)}`)
              }
              if ((rank.personal_activity_pv ?? 0) > 0) {
                extras.push(`Aktiflik: ${rank.personal_activity_pv} PV/ay`)
              }

              return (
                <div
                  key={rank.id}
                  className={`relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white p-4 shadow-sm transition-transform duration-200 ${
                    isAchieved ? 'border-amber-400' : isNext ? 'border-brand-500 bg-brand-50/40' : 'border-gray-100 opacity-90'
                  } ${isAchieved || isNext ? 'hover:-translate-y-0.5' : ''}`}
                >
                  {/* Üst */}
                  <div className="mb-2 flex items-start justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow"
                      style={{ backgroundColor: isAchieved || isNext ? '#f59e0b' : meta.color }}
                    >
                      {meta.gold && isAchieved ? (
                        <div className="flex gap-0.5">
                          {Array.from({ length: rank.name.toLocaleLowerCase('tr-TR') === 'ambassador' ? 3 : 2 }).map((_, k) => (
                            <Star key={k} size={10} className="text-white" fill="currentColor" />
                          ))}
                        </div>
                      ) : (
                        <Star size={22} />
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isActive && (
                        <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                          GÜNCEL RÜTBENİZ
                        </span>
                      )}
                      {isNext && (
                        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                          SONRAKİ HEDEF
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-gray-900">{rank.name.toLocaleUpperCase('tr-TR')}</h3>
                  <p className="text-sm text-gray-400">
                    Sol {fmt(rank.required_left_pv)} PV · Sağ {fmt(rank.required_right_pv)} PV
                  </p>
                  {extras.length > 0 && <p className="mt-0.5 text-xs font-semibold text-gray-400">{extras.join(' · ')}</p>}

                  <p className="mt-1 text-xs font-bold text-gray-500">
                    {st ? (
                      <span className="text-amber-600">
                        Kazanıldı:{' '}
                        {new Date(st.achieved_at).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    ) : isNext ? (
                      'Yaklaşıyorsunuz...'
                    ) : (
                      'Kilitli'
                    )}
                  </p>

                  {/* İlerleme */}
                  <div className="mt-auto pt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ${isAchieved ? 'bg-amber-500' : isNext ? 'bg-brand-600' : 'bg-gray-300'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                      <span>Sol %{leftPct}</span>
                      <span className="font-extrabold text-gray-700">%{pct}</span>
                      <span>Sağ %{rightPct}</span>
                    </div>
                  </div>

                  {/* Geçildi kaplaması */}
                  {isAchieved && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/55 backdrop-blur-[2px]">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
                        <CircleCheck size={38} />
                      </span>
                      <p className="text-xs font-extrabold text-amber-600">GEÇİLDİ</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Kilidi açılmamışlar bilgisi */}
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <Lock size={13} /> Kilitli rütbeler için önceki rütbenin şartlarını tamamlamanız gerekir.
          </p>
        </>
      )}
    </div>
  )
}
