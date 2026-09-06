'use client'
import { Percent } from '@/lib/google-icons'

export default function PromotionsPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Promosyonlar</h1><p className="text-sm text-gray-500 mt-1">3 Al 2 Öde, sepete %10 indirim gibi kampanyalar</p></div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Percent size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz promosyon yok</h3>
        <p className="text-sm text-gray-400">Yakında buradan promosyonlar oluşturabileceksiniz.</p>
      </div>
    </div>
  )
}
