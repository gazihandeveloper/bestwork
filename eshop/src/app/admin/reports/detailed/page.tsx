'use client'
import { MapPin } from '@/lib/google-icons'

export default function DetailedReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Detaylı Raporlama</h1>
      <p className="text-sm text-gray-500">En çok sipariş verilen şehirler, en hızlı satılan ürünler gibi detaylı raporlar</p>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <MapPin size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz veri yok</h3>
        <p className="text-sm text-gray-400">Yeterli sipariş verisi oluştuğunda raporlar burada görüntülenecek.</p>
      </div>
    </div>
  )
}
