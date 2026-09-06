'use client'
import { Wifi, Users } from '@/lib/google-icons'

export default function OnlineUsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Çevrimiçi Müşteriler</h1>
      <p className="text-sm text-gray-500">24 saat içinde giriş yapmış misafir ve kayıtlı müşteriler</p>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Wifi size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">Çevrimiçi müşteri yok</h3>
        <p className="text-sm text-gray-400">Şu anda aktif oturumu olan müşteri bulunmuyor.</p>
      </div>
    </div>
  )
}
