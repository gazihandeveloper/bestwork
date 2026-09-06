'use client'
import { SwatchBook } from '@/lib/google-icons'

export default function StyleManagementPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Stil Yönetimi</h1><p className="text-sm text-gray-500">Modüllerde kullanılan stilleri düzenleyin</p></div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <SwatchBook size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="text-sm text-gray-400">Stil yönetimi yakında eklenecek.</p>
      </div>
    </div>
  )
}
