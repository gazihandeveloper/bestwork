// ============================================
// BestWork - Canlı Sepet İzleme
// ============================================
'use client'

import { useState, useEffect } from 'react'
import { Eye, ShoppingCart, Trash2, User, RefreshCw } from '@/lib/google-icons'
import { get, del, formatPrice } from '@/lib/api'
import toast from 'react-hot-toast'

interface CartInfo {
  id: string
  user_id?: string
  session_token?: string
  items: any[]
  total_items: number
  total_amount: number
}

export default function LiveCartMonitorPage() {
  const [carts, setCarts] = useState<CartInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCart, setExpandedCart] = useState<string | null>(null)

  const loadCarts = async () => {
    setLoading(true)
    try {
      const res = await get<CartInfo[]>('/admin/carts')
      if (res.success) setCarts(res.data || [])
    } catch { /* */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadCarts() }, [])

  const handleDeleteCart = async (cartId: string) => {
    if (!confirm('Bu sepeti silmek istediğinize emin misiniz?')) return
    try {
      const res = await del(`/admin/carts/${cartId}`)
      if (res.success) {
        toast.success('Sepet silindi')
        loadCarts()
      }
    } catch { toast.error('Silinemedi') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Canlı Sepet İzleme</h1>
          <p className="text-sm text-gray-500 mt-1">Müşterilerin aktif sepetlerini görüntüleyin</p>
        </div>
        <button onClick={loadCarts} className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-500">
          <RefreshCw size={16} /> Yenile
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : carts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <ShoppingCart size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">Aktif sepet yok</h3>
          <p className="text-sm text-gray-400">Şu anda hiçbir müşterinin aktif sepeti bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {carts.map((cart) => (
            <div key={cart.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">
                    {cart.user_id ? cart.user_id.slice(0, 8) + '...' : 'Misafir'}
                  </span>
                </div>
                <button onClick={() => handleDeleteCart(cart.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-400">Ürün: </span>
                  <span className="font-semibold">{cart.total_items || 0}</span>
                </div>
                <div>
                  <span className="text-gray-400">Tutar: </span>
                  <span className="font-semibold text-brand-500">{formatPrice(cart.total_amount || 0)}</span>
                </div>
              </div>

              <button onClick={() => setExpandedCart(expandedCart === cart.id ? null : cart.id)}
                className="flex items-center gap-1 text-xs text-brand-500 hover:underline">
                <Eye size={12} /> {expandedCart === cart.id ? 'Gizle' : 'Detay'}
              </button>

              {expandedCart === cart.id && (
                <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                  {cart.items && cart.items.length > 0 ? (
                    cart.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 line-clamp-1 flex-1">{item.product_name || 'Ürün'}</span>
                        <span className="text-gray-400 ml-2">x{item.quantity}</span>
                        <span className="font-medium ml-2">{formatPrice(item.unit_price || 0)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">Sepet boş</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
