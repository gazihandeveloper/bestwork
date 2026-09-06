'use client'
import { Ticket, Plus } from '@/lib/google-icons'
import { Button } from '@/components/ui/Button'

export default function CouponsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-800">İndirim Kuponları</h1><p className="text-sm text-gray-500 mt-1">Kupon kodları oluşturarak müşterilerinize indirim sağlayın</p></div>
        <Button variant="brand" size="sm"><Plus size={16} /> Yeni Kupon</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Ticket size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz kupon yok</h3>
        <p className="text-sm text-gray-400">İlk indirim kuponunuzu oluşturun.</p>
      </div>
    </div>
  )
}
