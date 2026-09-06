'use client'
import { PenLine, Plus } from '@/lib/google-icons'
import { Button } from '@/components/ui/Button'

export default function BlogPostsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-800">Blog Yazıları</h1><p className="text-sm text-gray-500">Blog yazılarını görüntüleyin veya yeni yazı ekleyin</p></div>
        <Button variant="brand" size="sm"><Plus size={16} /> Yeni Yazı</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <PenLine size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz blog yazısı yok</h3>
        <p className="text-sm text-gray-400">İlk blog yazınızı ekleyin.</p>
      </div>
    </div>
  )
}
