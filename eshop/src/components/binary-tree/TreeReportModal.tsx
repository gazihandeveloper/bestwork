// ============================================
// BestWork - Ağaç Durumu Raporu (modal)
//
// Çam ağacı silüeti, aktif üye oranı kadar YEŞİL, pasif oranı kadar KIRMIZI
// doldurulur; yanında yüzde ve kişi sayıları. "Aktif" veya "Pasif" kutusuna
// tıklanınca o grubun üye listesi (kimler) anlık olarak yüklenir.
// ============================================
'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, X } from '@/components/icons'
import { rawGet } from '@/lib/raw'
import { initials } from './types'

const H = 150

interface DownlineRowApi {
  user_id: number
  name: string
  member_code: string
  position: string | null
  rank: string | null
  package: string | null
  total_pv_accumulated: number
  is_active: boolean
  seviye: number
  ilk_bacak: string | null
}

type Sekme = 'aktif' | 'pasif'

function StatBlock({
  tone,
  title,
  yuzde,
  kisi,
  selected,
  onClick,
}: {
  tone: 'green' | 'red'
  title: string
  yuzde: number
  kisi: number
  selected: boolean
  onClick: () => void
}) {
  const dot = tone === 'green' ? 'bg-emerald-500' : 'bg-red-500'
  const val = tone === 'green' ? 'text-emerald-600' : 'text-red-500'
  const ring = tone === 'green' ? 'ring-emerald-400 bg-emerald-50/60' : 'ring-red-400 bg-red-50/60'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer rounded-xl px-3 py-2 text-left transition-all hover:bg-gray-50 ${
        selected ? `ring-2 ${ring}` : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${dot}`} />
          <span className="text-sm fw-700 text-gray-700">{title}</span>
        </div>
        <ChevronDown size={15} className={`text-gray-400 transition-transform ${selected ? 'rotate-180' : ''}`} />
      </div>
      <div className="mt-0.5 flex items-baseline gap-2 pl-5">
        <span className={`font-mono text-2xl fw-800 ${val}`}>{yuzde}%</span>
        <span className="text-xs text-gray-400">{kisi} kişi</span>
      </div>
    </button>
  )
}

export function TreeReportModal({
  onClose,
  aktif,
  pasif,
  toplam,
  initialTab = null,
}: {
  onClose: () => void
  aktif: number | null
  pasif: number | null
  toplam: number | null
  initialTab?: Sekme | null
}) {
  const [sekme, setSekme] = useState<Sekme | null>(null)
  const [rows, setRows] = useState<DownlineRowApi[]>([])
  const [listTotal, setListTotal] = useState(0)
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState('')

  const total = toplam && toplam > 0 ? toplam : 0
  const a = aktif ?? 0
  const p = pasif ?? 0
  const yesilYuzde = total > 0 ? Math.round((a / total) * 100) : 0
  const kirmiziYuzde = total > 0 ? 100 - yesilYuzde : 0
  const frac = total > 0 ? a / total : 0

  const listele = async (t: Sekme) => {
    if (sekme === t) {
      setSekme(null)
      return
    }
    setSekme(t)
    setListLoading(true)
    setListError('')
    setRows([])
    try {
      const r = await rawGet<{ users: DownlineRowApi[]; total: number }>(
        `/tree/downline?durum=${t}&limit=200`
      )
      setRows(Array.isArray(r.users) ? r.users : [])
      setListTotal(Number(r.total) || 0)
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Liste yüklenemedi.')
    } finally {
      setListLoading(false)
    }
  }

  /* Rozetten açıldıysa ilgili listeyi otomatik yükle (modal her açılışta yeniden mount edilir).
     setState'i effect gövdesinde senkron çağırmamak için yükleme 0ms'lik bir makro-göreve ertelenir. */
  useEffect(() => {
    if (!initialTab) return
    const id = window.setTimeout(() => void listele(initialTab), 0)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="bw-tree-ui fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ağaç durumu"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-base font-extrabold text-gray-900">Ağaç Durumu</h3>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-4">
            {/* Çam ağacı: yeşil = aktif oranı, kırmızı = pasif oranı */}
            <svg viewBox={`0 0 100 ${H}`} className="h-32 w-auto shrink-0" aria-hidden="true">
              <defs>
                <clipPath id="bw-pine-clip">
                  <polygon points="50,6 31,50 69,50" />
                  <polygon points="50,38 23,86 77,86" />
                  <polygon points="50,70 15,128 85,128" />
                </clipPath>
              </defs>
              <g clipPath="url(#bw-pine-clip)">
                <rect x="0" y="0" width="100" height={H} fill="#ef4444" />
                <rect x="0" y={H * (1 - frac)} width="100" height={H * frac} fill="#22c55e" />
              </g>
              <rect x="44" y="128" width="12" height="18" rx="2" fill="#92400e" />
            </svg>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <StatBlock
                tone="green"
                title="Aktif (Yeşil)"
                yuzde={yesilYuzde}
                kisi={a}
                selected={sekme === 'aktif'}
                onClick={() => void listele('aktif')}
              />
              <StatBlock
                tone="red"
                title="Pasif (Kırmızı)"
                yuzde={kirmiziYuzde}
                kisi={p}
                selected={sekme === 'pasif'}
                onClick={() => void listele('pasif')}
              />
              <div className="px-3 pt-1 text-xs text-gray-400">
                Toplam <span className="fw-700 text-gray-700">{total}</span> kişi
              </div>
            </div>
          </div>

          <div className="mt-3 px-1">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="bg-emerald-500" style={{ width: `${yesilYuzde}%` }} />
              <div className="bg-red-500" style={{ width: `${kirmiziYuzde}%` }} />
            </div>
          </div>

          {sekme && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs fw-700 text-gray-500">
                  {sekme === 'aktif' ? 'Aktif üyeler' : 'Pasif üyeler'}
                </span>
                {listTotal > 0 && (
                  <span className="text-[11px] text-gray-400">
                    {rows.length < listTotal ? `ilk ${rows.length} / ${listTotal}` : `${listTotal} kişi`}
                  </span>
                )}
              </div>

              {listLoading ? (
                <div className="py-6 text-center">
                  <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                </div>
              ) : listError ? (
                <p className="py-3 text-center text-xs text-red-600">{listError}</p>
              ) : rows.length === 0 ? (
                <p className="py-3 text-center text-xs text-gray-400">Kayıt yok.</p>
              ) : (
                <ul className="divide-y divide-gray-50 rounded-xl border border-gray-100">
                  {rows.map((u) => (
                    <li key={u.user_id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] fw-800 text-white ${
                            u.is_active ? 'bg-emerald-500' : 'bg-red-400'
                          }`}
                        >
                          {initials(u.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[12px] fw-700 text-gray-800">{u.name}</div>
                          <div className="font-mono text-[10px] text-gray-400">{u.member_code}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {u.ilk_bacak && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] fw-700 ${
                              u.ilk_bacak === 'L' ? 'bg-sky-50 text-sky-600' : 'bg-violet-50 text-violet-600'
                            }`}
                          >
                            {u.ilk_bacak === 'L' ? 'SOL' : 'SAĞ'}
                          </span>
                        )}
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] fw-700 text-gray-500">
                          {u.seviye}. nesil
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
