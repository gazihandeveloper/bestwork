// ============================================
// BestWork - Ağaç Durumu Raporu (modal)
//
// Çam ağacı silüeti, aktif üye oranı kadar YEŞİL, pasif oranı kadar KIRMIZI
// doldurulur; yanında yüzde ve kişi sayıları gösterilir.
// ============================================
'use client'

import { X } from '@/components/icons'

const H = 150

export function TreeReportModal({
  open,
  onClose,
  aktif,
  pasif,
  toplam,
}: {
  open: boolean
  onClose: () => void
  aktif: number | null
  pasif: number | null
  toplam: number | null
}) {
  if (!open) return null

  const total = toplam && toplam > 0 ? toplam : 0
  const a = aktif ?? 0
  const p = pasif ?? 0
  const yesilYuzde = total > 0 ? Math.round((a / total) * 100) : 0
  const kirmiziYuzde = total > 0 ? 100 - yesilYuzde : 0
  const frac = total > 0 ? a / total : 0

  return (
    <div
      className="bw-tree-ui fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ağaç durumu"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
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

        <div className="flex items-center gap-6 px-6 py-6">
          {/* Çam ağacı: yeşil = aktif oranı, kırmızı = pasif oranı */}
          <svg viewBox={`0 0 100 ${H}`} className="h-44 w-auto shrink-0" aria-hidden="true">
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
            {/* Gövde */}
            <rect x="44" y="128" width="12" height="18" rx="2" fill="#92400e" />
          </svg>

          {/* Oranlar */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-sm fw-700 text-gray-700">Aktif (Yeşil)</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-mono text-2xl fw-800 text-emerald-600">{yesilYuzde}%</span>
                <span className="text-xs text-gray-400">{a} kişi</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm fw-700 text-gray-700">Pasif (Kırmızı)</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-mono text-2xl fw-800 text-red-500">{kirmiziYuzde}%</span>
                <span className="text-xs text-gray-400">{p} kişi</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-2 text-xs text-gray-400">
              Toplam <span className="fw-700 text-gray-700">{total}</span> kişi
            </div>
          </div>
        </div>

        {/* Oran çubuğu */}
        <div className="px-6 pb-6">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="bg-emerald-500" style={{ width: `${yesilYuzde}%` }} />
            <div className="bg-red-500" style={{ width: `${kirmiziYuzde}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
