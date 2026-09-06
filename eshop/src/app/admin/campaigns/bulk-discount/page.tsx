'use client'
import { Layers } from '@/lib/google-icons'

export default function BulkDiscountPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Toplu İndirim</h1><p className="text-sm text-gray-500 mt-1">Ürünlere toplu adet veya yüzde indirimi uygulayın</p></div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Layers size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz indirim tanımlanmadı</h3>
        <p className="text-sm text-gray-400">Yakında buradan toplu indirimler oluşturabileceksiniz.</p>
      </div>
    </div>
  )
}
