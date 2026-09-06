'use client'
import { CreditCard } from '@/lib/google-icons'
export default function PayPalPage() {
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-gray-800">PayPal</h1><p className="text-sm text-gray-500">PayPal Global Ödeme</p></div>
    <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><CreditCard size={48} className="mx-auto text-gray-200 mb-4" /><p className="text-sm text-gray-400">Yakında.</p></div></div>
}
