'use client'
import { Menu } from '@/lib/google-icons'

export default function MenuManagementPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Menü Yönetimi</h1><p className="text-sm text-gray-500">Üst menüdeki bağlantıları düzenleyin</p></div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Menu size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="text-sm text-gray-400">Menü yönetimi yakında eklenecek.</p>
      </div>
    </div>
  )
}
