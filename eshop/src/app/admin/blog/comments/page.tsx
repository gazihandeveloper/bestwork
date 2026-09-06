'use client'
import { MessageSquare } from '@/lib/google-icons'

export default function BlogCommentsPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Blog Yorumları</h1><p className="text-sm text-gray-500">Blog yazılarınıza yapılan yorumları onaylayın</p></div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="text-sm text-gray-400">Henüz blog yorumu bulunmuyor.</p>
      </div>
    </div>
  )
}
