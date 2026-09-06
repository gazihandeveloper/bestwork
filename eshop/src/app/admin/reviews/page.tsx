// ============================================
// BestWork - Admin Yorum Yönetimi
// ============================================
'use client'

import { Star, Check, X } from '@/lib/google-icons'

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Ürün Yorumları</h1>
        <p className="text-sm text-gray-500 mt-1">Müşteri yorumlarını görüntüleyin ve onaylayın</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Star size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz yorum yok</h3>
        <p className="text-sm text-gray-400">Müşterileriniz ürünlere yorum yaptıkça burada listelenecek.</p>
      </div>
    </div>
  )
}
