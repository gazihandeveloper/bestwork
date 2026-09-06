// ============================================
// BestWork - İade Talepleri
// ============================================
'use client'

import { RotateCcw } from '@/lib/google-icons'

export default function ReturnsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">İade Talepleri</h1>
        <p className="text-sm text-gray-500 mt-1">Müşterilerin iade etmek istediği siparişler</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <RotateCcw size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz iade talebi yok</h3>
        <p className="text-sm text-gray-400">Müşterileriniz iade talebi oluşturdukça burada listelenecek.</p>
      </div>
    </div>
  )
}
