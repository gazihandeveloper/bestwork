// ============================================
// BestWork - Cüzdanım
// ============================================
'use client'

import { useState, useEffect } from 'react'
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from '@/lib/google-icons'
import { formatPrice, get } from '@/lib/api'
import type { Wallet as WalletType, WalletTransaction } from '@/types'

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle size={16} className="text-green-500" />,
  pending: <Clock size={16} className="text-yellow-500" />,
  failed: <XCircle size={16} className="text-red-500" />,
  cancelled: <XCircle size={16} className="text-gray-400" />,
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWallet() {
      try {
        const [walletRes, txRes] = await Promise.all([
          get<WalletType>('/eshop/wallet'),
          get<WalletTransaction[]>('/eshop/wallet/transactions'),
        ])
        if (walletRes.success) setWallet(walletRes.data)
        if (txRes.success) setTransactions(txRes.data || [])
      } catch {
        // API yok
      } finally {
        setLoading(false)
      }
    }
    loadWallet()
  }, [])

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-gray-200 rounded-xl" />
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  }

  return (
    <div className="space-y-6">
      {/* Bakiye Kartı */}
      <div className="bg-gradient-to-r from-brand-500 to-green-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet size={24} />
            <span className="text-sm font-bold opacity-90">Cüzdan Bakiyesi</span>
          </div>
        </div>
        <p className="text-3xl font-bold">
          {wallet ? formatPrice(wallet.balance) : formatPrice(0)}
        </p>
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div>
            <span className="opacity-75">Toplam Kazanç</span>
            <p className="font-semibold">{wallet ? formatPrice(wallet.totalEarned) : formatPrice(0)}</p>
          </div>
          <div>
            <span className="opacity-75">Toplam Çekim</span>
            <p className="font-semibold">{wallet ? formatPrice(wallet.totalWithdrawn) : formatPrice(0)}</p>
          </div>
        </div>
      </div>

      {/* İşlemler */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">İşlem Geçmişi</h3>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">Henüz işlem bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.amount > 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {tx.amount > 0 ? (
                      <ArrowDownLeft size={16} className="text-green-500" />
                    ) : (
                      <ArrowUpRight size={16} className="text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {new Date(tx.created_at || '').toLocaleDateString('tr-TR')}
                      </span>
                      {statusIcons[tx.status]}
                      <span className="text-xs text-gray-400 capitalize">{tx.status}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-sm font-bold ${
                  tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tx.amount > 0 ? '+' : ''}{formatPrice(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
