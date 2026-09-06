'use client'
import { FolderTree } from '@/lib/google-icons'

export default function BlogCategoriesPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Blog Kategorileri</h1><p className="text-sm text-gray-500">Blog yazılarınız için kategoriler oluşturun</p></div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <FolderTree size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="text-sm text-gray-400">Henüz blog kategorisi eklenmedi.</p>
      </div>
    </div>
  )
}
