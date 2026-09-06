'use client'
import { UserCheck } from '@/lib/google-icons'

export default function UserApprovalsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Müşteri Onayları</h1>
      <p className="text-sm text-gray-500">Kayıt olurken onaylama açıksa buradan onay bekleyen müşterileri listeleyebilirsiniz.</p>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <UserCheck size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Onay bekleyen yok</h3>
        <p className="text-sm text-gray-400">Onay gerektiren kayıt modu şu anda kapalı.</p>
      </div>
    </div>
  )
}
