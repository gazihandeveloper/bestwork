// ============================================
// BestWork - Kariyer Takibi (referans tasarıma uyarlanmış)
// Seviyeler şeridi + Mevcut Kariyer + Hedef İlerleme Analizi + Hedef Kariyer
// ============================================
'use client'

import { createElement, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  House,
  Trophy,
  CircleCheck,
  ArrowRight,
  Lock,
  Star,
  Sparkles,
} from '@/components/icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { CareerLevels, rankIcon, rankStyle, rankUpper } from '@/components/CareerLevels'
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
const downlineName = (ranks: RankInfo[], id?: number | null) => ranks.find((r) => r.id === id)?.name ?? ''
const pct = (now: number, target: number) => (target > 0 ? Math.min(100, Math.round((now / target) * 100)) : 100)

function GemBadge({ name, size = 64, active = false }: { name: string; size?: number; active?: boolean }) {
  const color = rankStyle(name).color
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full ring-4 ring-white"
      style={{ width: size, height: size, backgroundColor: active ? 'rgba(255,255,255,0.15)' : color }}
    >
      {createElement(rankIcon(name), {
        size: Math.round(size * 0.45),
        className: 'text-white',
      })}
    </span>
  )
}

function Bar({ value, dark = false }: { value: number; dark?: boolean }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${dark ? 'bg-white/25' : 'bg-gray-100'}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${dark ? 'bg-white' : 'bg-brand-500'}`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export default function CareerPage() {
  const [ranks, setRanks] = useState<RankInfo[]>([])
  const [career, setCareer] = useState<CareerItem[]>([])
  const [me, setMe] = useState<MePV | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRankId, setSelectedRankId] = useState<number | null>(null)

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

  // Dashboard'dan ?rank=<id> ile gelindiyse o rütbe hedef olarak seçilsin.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('rank')
    if (p == null) return
    const t = window.setTimeout(() => setSelectedRankId(Number(p)), 0)
    return () => window.clearTimeout(t)
  }, [])

  const achievedMap = new Map(career.map((c) => [c.rank_id, c]))
  const activeRank = ranks.find((r) => r.id === (career.find((c) => c.is_active)?.rank_id ?? -1)) ?? null
  const nextRank = ranks.find((r) => !achievedMap.has(r.id)) ?? null
  // Hedef: kullanıcı seçtiyse o rütbe (0 = Girişimci temel seviyesi), yoksa sıradaki rütbe.
  const BASE: RankInfo = {
    id: 0,
    name: 'Girişimci',
    required_left_pv: 0,
    required_right_pv: 0,
    required_downline_rank_id: null,
    required_downline_count: 0,
    personal_activity_pv: 0,
  }
  const target =
    selectedRankId === 0
      ? BASE
      : (selectedRankId != null ? ranks.find((r) => r.id === selectedRankId) ?? null : null) ?? nextRank
  const leftPV = Number(me?.total_pv_left) || 0
  const rightPV = Number(me?.total_pv_right) || 0

  const currentName = activeRank?.name ?? 'Girişimci'
  const allDone = !target

  const reqLeft = Number(target?.required_left_pv) || 0
  const reqRight = Number(target?.required_right_pv) || 0
  const downlineCount = Number(target?.required_downline_count) || 0
  const activityPV = Number(target?.personal_activity_pv) || 0

  const remLeft = Math.max(0, reqLeft - leftPV)
  const remRight = Math.max(0, reqRight - rightPV)
  const pLeft = pct(leftPV, reqLeft)
  const pRight = pct(rightPV, reqRight)

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
          {/* Kariyer Seviyeleri şeridi — tıklayınca hedef seçilir */}
          <CareerLevels onSelect={setSelectedRankId} selectedId={selectedRankId ?? target?.id ?? null} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* ── MEVCUT KARİYER ── */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-[11px] fw-800 tracking-wider text-gray-500 uppercase">
                <CircleCheck size={15} className="text-brand-600" /> Mevcut Kariyer
              </div>
              <div className="flex flex-col items-center gap-3 py-2">
                <GemBadge name={currentName} size={72} />
                <h3 className="text-xl font-extrabold text-gray-900">{rankUpper(currentName)}</h3>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Toplam Sol PV</span>
                  <span className="fw-700 text-gray-900">{fmt(leftPV)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Toplam Sağ PV</span>
                  <span className="fw-700 text-gray-900">{fmt(rightPV)}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Paket Şartı</span>
                    <span className="fw-700 text-gray-900">{fmt(activityPV)} PV</span>
                  </div>
                  <div className="mt-1.5">
                    <Bar value={activityPV > 0 ? 100 : 0} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── HEDEF İLERLEME ANALİZİ (marka yeşili) ── */}
            <div className="rounded-2xl bg-[#29a56c] p-5 text-white shadow-md">
              <div className="mb-4 flex items-center gap-2 text-[11px] fw-800 tracking-wider text-white/90 uppercase">
                <Sparkles size={15} /> Hedef İlerleme Analizi
              </div>

              {/* Mevcut → Hedef */}
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <GemBadge name={currentName} size={48} active />
                  <span className="text-[10px] fw-700 text-white/90">{currentName}</span>
                </div>
                <ArrowRight size={20} className="text-white" />
                <div className="flex flex-col items-center gap-1.5">
                  <GemBadge name={target?.name ?? currentName} size={48} active />
                  <span className="text-[10px] fw-700 text-white/90">{target?.name ?? '—'}</span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-white/85">Kalan Sol PV</span>
                    <span className={`rounded px-1.5 py-0.5 fw-700 ${remLeft === 0 ? 'bg-white/20 text-white' : 'text-white'}`}>
                      {remLeft === 0 ? 'Ulaştınız' : `+${fmt(remLeft)}`}
                    </span>
                  </div>
                  <Bar value={pLeft} dark />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-white/85">Kalan Sağ PV</span>
                    <span className={`rounded px-1.5 py-0.5 fw-700 ${remRight === 0 ? 'bg-white/20 text-white' : 'text-white'}`}>
                      {remRight === 0 ? 'Ulaştınız' : `+${fmt(remRight)}`}
                    </span>
                  </div>
                  <Bar value={pRight} dark />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-white/85">Kalan Kol Adeti</span>
                    <span className="fw-700 text-white">{downlineCount} adet</span>
                  </div>
                  <Bar value={downlineCount > 0 ? 0 : 100} dark />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-white/85">Paket Şartı</span>
                    <span className="fw-700 text-white">{fmt(activityPV)} PV</span>
                  </div>
                  <Bar value={activityPV > 0 ? 100 : 0} dark />
                </div>
              </div>
            </div>

            {/* ── HEDEF KARİYER ── */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-[11px] fw-800 tracking-wider text-amber-500 uppercase">
                <Star size={15} /> Hedef Kariyer
              </div>
              {allDone ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Trophy size={40} className="text-amber-500" />
                  <p className="text-sm fw-700 text-gray-700">Tüm rütbeleri kazandınız 🎉</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-3 py-2">
                    <GemBadge name={target!.name} size={72} />
                    <h3 className="text-xl font-extrabold text-gray-900">{rankUpper(target!.name)}</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Sol PV Hedefi</span>
                      <span className="fw-700 text-gray-900">{fmt(reqLeft)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Sağ PV Hedefi</span>
                      <span className="fw-700 text-gray-900">{fmt(reqRight)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Kol Adeti
                        {target!.required_downline_rank_id
                          ? ` (${downlineName(ranks, target!.required_downline_rank_id)})`
                          : ''}
                      </span>
                      <span className="fw-700 text-gray-900">{downlineCount} Adet</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Paket Şartı</span>
                        <span className="fw-700 text-gray-900">{fmt(activityPV)} PV</span>
                      </div>
                      <div className="mt-1.5">
                        <Bar value={activityPV > 0 ? 100 : 0} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <Lock size={13} /> Kilitli rütbeler için önceki rütbenin şartlarını tamamlamanız gerekir.
          </p>
        </>
      )}
    </div>
  )
}
