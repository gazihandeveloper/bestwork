// ============================================
// BestWork - Admin Markalar
// ============================================
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, Edit2, Trash2, Search } from '@/lib/google-icons'
import { Button } from '@/components/ui/Button'
import { get } from '@/lib/api'
import type { Brand } from '@/types'

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await get<Brand[]>('/admin/brands')
        if (res.success) setBrands(res.data)
      } catch {
        // API yok
      } finally {
        setLoading(false)
      }
    }
    loadBrands()
  }, [])

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Markalar</h1>
          <p className="text-sm text-gray-500 mt-1">Ürün markalarını yönetin</p>
        </div>
        <Button variant="brand" size="sm">
          <Plus size={16} /> Yeni Marka
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Marka ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            Marka bulunamadı
          </div>
        ) : (
          filtered.map((brand) => (
            <div
              key={brand.id}
              className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow group"
            >
              <div className="w-14 h-14 bg-gray-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                {brand.logo ? (
                  <Image src={brand.logo} alt={brand.name} width={40} height={40} className="object-contain" />
                ) : (
                  <span className="text-lg font-bold text-gray-300">{brand.name.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-800">{brand.name}</h4>
                <p className="text-xs text-gray-400">{brand.productCount || 0} ürün</p>
                {brand.description && (
                  <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{brand.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 text-gray-400 hover:text-brand-500 rounded-lg hover:bg-gray-100">
                  <Edit2 size={15} />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
