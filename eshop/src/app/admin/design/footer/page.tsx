'use client'
import { PanelBottom } from '@/lib/google-icons'

export default function FooterPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Footer (Sayfa Altı)</h1><p className="text-sm text-gray-500">Alt kısımdaki modülleri düzenleyin</p></div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <PanelBottom size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="text-sm text-gray-400">Footer düzenleme yakında eklenecek.</p>
      </div>
    </div>
  )
}
