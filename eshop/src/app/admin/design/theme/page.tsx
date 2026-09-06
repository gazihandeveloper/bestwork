'use client'
import { Paintbrush } from '@/lib/google-icons'

export default function ThemeDesignPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Tasarım Düzenle</h1><p className="text-sm text-gray-500">Sayfa üstü, altı renk ve genel ayarlar</p></div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Paintbrush size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="text-sm text-gray-400">Tema düzenleme özelliği yakında eklenecek.</p>
      </div>
    </div>
  )
}
