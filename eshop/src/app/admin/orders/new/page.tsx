// ============================================
// BestWork - Yeni Sipariş Oluştur (Admin)
// ============================================
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { post } from '@/lib/api'
import toast from 'react-hot-toast'

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ userId: '', productId: '', quantity: '1' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.userId || !form.productId) { toast.error('Müşteri ve ürün zorunlu'); return }
    setLoading(true)
    try {
      // Sepete ekle ve sipariş oluştur
      const res = await post('/admin/orders', {
        user_id: form.userId,
        product_id: form.productId,
        quantity: parseInt(form.quantity) || 1,
      })
      if (res.success) {
        toast.success('Sipariş oluşturuldu')
        router.push('/admin/orders')
      } else {
        toast.error(res.error || 'Oluşturulamadı')
      }
    } catch { toast.error('Hata oluştu') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Yeni Sipariş Oluştur</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <p className="text-sm text-gray-400 mb-2">Fiziksel satışlarınızı manuel olarak sisteme ekleyin.</p>
        <Input label="Müşteri ID (UUID)" placeholder="Kullanıcı UUID'si" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required />
        <Input label="Ürün ID (UUID)" placeholder="Ürün UUID'si" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required />
        <Input label="Adet" type="number" placeholder="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="brand" loading={loading}>Sipariş Oluştur</Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/orders')}>İptal</Button>
        </div>
      </form>
    </div>
  )
}
