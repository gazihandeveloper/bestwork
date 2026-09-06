// ============================================
// BestWork - Yeni Ürün Ekle
// ============================================
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, ImageIcon } from '@/lib/google-icons'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { post } from '@/lib/api'
import toast from 'react-hot-toast'

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: '', description: '', price: '', stock: '', sku: '', categoryId: '',
  })

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      if (file.size > 3 * 1024 * 1024) { toast.error(`${file.name} 3MB'dan büyük`); return }
      const reader = new FileReader()
      reader.onload = () => setImages(prev => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.price) { toast.error('Ürün adı ve fiyat zorunlu'); return }
    setLoading(true)
    try {
      const res = await post('/admin/products', {
        name: form.name,
        description: form.description,
        price: Math.round(parseFloat(form.price) * 100),
        stock_quantity: parseInt(form.stock) || 0,
        sku: form.sku,
        category_id: form.categoryId || undefined,
        images: images.map((img, i) => ({ data: img, is_primary: i === 0 })),
      })
      if (res.success) {
        toast.success('Ürün eklendi')
        router.push('/admin/products/list')
      } else {
        toast.error(res.error || 'Eklenemedi')
      }
    } catch { toast.error('Hata oluştu') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Yeni Ürün Ekle</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Görsel Yükleme — tam genişlik */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Ürün Görselleri</h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-100 group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute top-1 left-1 bg-brand-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">Ana</span>}
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={10} />
                </button>
              </div>
            ))}
            {/* 8 adede kadar boş ekleme kutusu */}
            {Array.from({ length: Math.max(8 - images.length, 1) }).map((_, i) => (
              <button key={`empty-${i}`} type="button" onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors">
                <ImageIcon size={24} />
                <span className="text-[10px]">Ekle</span>
              </button>
            ))}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageAdd} className="hidden" />
          </div>
          <p className="text-xs text-gray-400 mt-2">İlk görsel ana görsel olur. Max 3MB, çoklu seçim yapabilirsiniz.</p>
        </div>

        {/* Ürün Bilgileri */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Ürün Bilgileri</h3>
          <Input label="Ürün Adı" placeholder="Ürün adı" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Açıklama</label>
            <textarea rows={3} placeholder="Ürün açıklaması..." value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 resize-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input label="Fiyat (TL)" type="number" step="0.01" placeholder="29.99" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input label="Stok" type="number" placeholder="100" value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <Input label="SKU" placeholder="SKU-001" value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Input label="Kategori ID" placeholder="UUID" value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="brand" loading={loading}>Kaydet</Button>
            <Button type="button" variant="outline" onClick={() => router.push('/admin/products/list')}>İptal</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
