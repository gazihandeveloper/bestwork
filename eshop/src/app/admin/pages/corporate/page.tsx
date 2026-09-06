'use client'
import { FileText, Plus } from '@/lib/google-icons'
import { Button } from '@/components/ui/Button'

export default function CorporatePagesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-800">Kurumsal Sayfalar</h1><p className="text-sm text-gray-500">Hakkımızda, Gizlilik Politikası vb sayfaları düzenleyin</p></div>
        <Button variant="brand" size="sm"><Plus size={16} /> Yeni Sayfa</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <FileText size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="text-sm text-gray-400">Henüz kurumsal sayfa eklenmedi.</p>
      </div>
    </div>
  )
}
