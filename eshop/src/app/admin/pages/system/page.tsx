'use client'
import { Sliders } from '@/lib/google-icons'

export default function SystemPagesPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Sistem Sayfaları</h1><p className="text-sm text-gray-500">Anasayfa, iletişim vb sayfalardaki slider, banner içerikleri</p></div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Sliders size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="text-sm text-gray-400">Sistem sayfası düzenlemeleri yakında.</p>
      </div>
    </div>
  )
}
