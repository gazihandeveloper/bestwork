'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Trash2, Square, CheckSquare } from '@/lib/google-icons'
import { formatPrice, get, post, del } from '@/lib/api'
import type { Product } from '@/types'
import toast from 'react-hot-toast'

export default function AdminProductListPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string | number>>(new Set())

  const loadProducts = async () => {
    try {
      const res = await get<Product[]>('/admin/products')
      if (res.success) setProducts(res.data || [])
    } catch { /* */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadProducts() }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p as any).sku?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(p => p.id)))
    }
  }

  const handleDelete = async (id: string | number) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return
    try {
      const res = await del(`/admin/products/${id}`)
      if (res.success) { toast.success('Silindi'); loadProducts(); setSelected(new Set()) }
    } catch { toast.error('Hata') }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`${selected.size} ürünü silmek istediğinize emin misiniz?`)) return
    try {
      const ids = Array.from(selected)
      const res = await post('/admin/products/bulk-delete', { ids })
      if (res.success) { toast.success(`${selected.size} ürün silindi`); loadProducts(); setSelected(new Set()) }
    } catch { toast.error('Hata') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tüm Ürünler</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} ürün listeleniyor</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
              <Trash2 size={16} /> {selected.size} ürünü sil
            </button>
          )}
          <Link href="/admin/products/new" className="flex items-center gap-2 bg-brand-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-600">
            <Plus size={16} /> Yeni Ürün
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
          <div className="relative max-w-xs flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Ürün ara..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left bg-gray-50">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-brand-500">
                    {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600">Ürün</th>
                <th className="px-4 py-3 font-semibold text-gray-600">SKU</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Fiyat</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Stok</th>
                <th className="px-4 py-3 font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">Yükleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400">Ürün bulunamadı</td></tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className={`border-b border-gray-50 hover:bg-gray-50 ${selected.has(product.id) ? 'bg-brand-50' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(product.id)} className="text-gray-400 hover:text-brand-500">
                        {selected.has(product.id) ? <CheckSquare size={16} className="text-brand-500" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                          {(product as any).thumbnail ? (
                            <img src={(product as any).thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (<span className="text-xs text-gray-400">-</span>)}
                        </div>
                        <Link href={`/admin/products/${product.id}/edit`} className="font-medium text-gray-800 hover:text-brand-500">
                          {product.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{(product as any).sku || '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{formatPrice(product.price)}</td>
                    <td className="px-4 py-3"><span className={product.stock > 0 ? 'text-green-600' : 'text-red-500'}>{product.stock || 0}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/products/${product.id}/edit`} className="text-xs text-brand-500 hover:underline">Düzenle</Link>
                        <button onClick={() => handleDelete(product.id)} className="text-xs text-red-500 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
