'use client'
import { Landmark } from '@/lib/google-icons'

export default function BankPosPage() {
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-gray-800">Banka Sanalpos</h1><p className="text-sm text-gray-500">Garanti, İşbankası, Yapıkredi +18 Banka</p></div>
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><Landmark size={48} className="mx-auto text-gray-200 mb-4" /><p className="text-sm text-gray-400">Banka entegrasyonu yakında.</p></div></div>
}
