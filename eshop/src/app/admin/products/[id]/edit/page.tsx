// ============================================
// BestWork - Ürün Düzenle
// ============================================
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { get, put } from '@/lib/api'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    stock: '',
    sku: '',
    categoryId: '',
    brandId: '',
    isActive: true,
  })

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await get<Product>(`/admin/products/${params.id}`)
        if (res.success) {
          const p = res.data
          setForm({
            name: p.name,
            description: p.description || '',
            price: (p.price / 100).toFixed(2),
            comparePrice: p.comparePrice ? (p.comparePrice / 100).toFixed(2) : '',
            stock: p.stock.toString(),
            sku: p.sku,
            categoryId: p.categoryId?.toString() || '',
            brandId: p.brandId?.toString() || '',
            isActive: p.isActive,
          })
        }
      } catch {
        toast.error('Ürün yüklenemedi')
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await put(`/admin/products/${params.id}`, {
        ...form,
        price: Math.round(parseFloat(form.price) * 100),
        comparePrice: form.comparePrice ? Math.round(parseFloat(form.comparePrice) * 100) : 0,
        stock: parseInt(form.stock) || 0,
      })
      if (res.success) {
        toast.success('Ürün güncellendi')
        router.push('/admin/products')
      } else {
        toast.error(res.error || 'Güncellenemedi')
      }
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4 max-w-3xl">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-96 bg-gray-200 rounded-xl" />
    </div>
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Ürün Düzenle</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Ürün Adı"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Açıklama</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <Input label="Fiyat (TL)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <Input label="Karşılaştırma Fiyatı" type="number" step="0.01" value={form.comparePrice} onChange={(e) => setForm({ ...form, comparePrice: e.target.value })} />
          <Input label="Stok" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded border-gray-300 text-brand-500 focus:ring-brand-300"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">Aktif</label>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <Button type="submit" variant="brand" loading={saving}>Güncelle</Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>İptal</Button>
        </div>
      </form>
    </div>
  )
}
