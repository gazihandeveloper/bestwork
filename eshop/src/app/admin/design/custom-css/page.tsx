'use client'
import { Code } from '@/lib/google-icons'

export default function CustomCssPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Özel CSS</h1><p className="text-sm text-gray-500">Özel CSS/JS kodu ekleyin veya sıkıştırma yapın</p></div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Code size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="text-sm text-gray-400">Özel kod ekleme yakında eklenecek.</p>
      </div>
    </div>
  )
}
