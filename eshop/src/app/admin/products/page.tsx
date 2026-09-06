// ============================================
// BestWork - Ürün Yönetimi Ana Sayfa
// ============================================
'use client'

import Link from 'next/link'
import {
  ShoppingBag, Plus, FolderTree, Building2, MessageSquare,
  Palette, Filter, ListChecks, Layers, ChevronRight, Star,
} from '@/lib/google-icons'

const productCards = [
  { href: '/admin/products/list', icon: ShoppingBag, title: 'Ürünler', desc: 'Tüm ürünleri listeleyin veya yeni ürün ekleyin', color: 'bg-brand-50 text-brand-500', count: '8' },
  { href: '/admin/categories', icon: FolderTree, title: 'Kategoriler', desc: 'Kategorileri göster veya yeni kategoriler ekleyin', color: 'bg-blue-50 text-blue-500', count: '4' },
  { href: '/admin/brands', icon: Building2, title: 'Markalar', desc: 'Markaları yönetin veya yeni markalar oluşturun', color: 'bg-purple-50 text-purple-500', count: '2' },
  { href: '/admin/products/variants', icon: Palette, title: 'Seçenek (Varyantlar)', desc: 'Renk, Beden vb varyantları buradan oluşturabilirsiniz', color: 'bg-amber-50 text-amber-500', count: '—' },
  { href: '/admin/products/filters', icon: Filter, title: 'Özel Filtreler', desc: 'Müşterilerin ürünleri bulmasını kolaylaştıran filtreler', color: 'bg-rose-50 text-rose-500', count: '—' },
  { href: '/admin/products/attributes', icon: ListChecks, title: 'Ürün Özellikleri', desc: 'Ürünlere özellik tablosu eklemenizi sağlar', color: 'bg-cyan-50 text-cyan-500', count: '—' },
  { href: '/admin/products/attribute-groups', icon: Layers, title: 'Özellik Grupları', desc: 'Özellik grupları oluşturarak özelliklerinizi sınıflandırın', color: 'bg-teal-50 text-teal-500', count: '—' },
  { href: '/admin/reviews', icon: Star, title: 'Ürün Yorumları', desc: 'Müşteri yorumlarını görebilir ve onaylayabilirsiniz', color: 'bg-yellow-50 text-yellow-500', count: '0' },
]

export default function ProductManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ürün Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Ürünler, kategoriler ve diğer ayarları yönetin</p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-brand-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} /> Yeni Ürün Ekle
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {productCards.map((card) => {
          const Icon = card.icon
          const isComingSoon = card.count === '—'
          return (
            <Link
              key={card.href}
              href={isComingSoon ? '#' : card.href}
              className={`bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all group ${isComingSoon ? 'opacity-60 cursor-default' : ''}`}
              onClick={(e) => isComingSoon && e.preventDefault()}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                  <Icon size={20} />
                </div>
                {isComingSoon ? (
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Yakında</span>
                ) : (
                  <span className="text-xs font-bold text-gray-400">{card.count}</span>
                )}
              </div>
              <h3 className="text-sm font-bold text-gray-800 group-hover:text-brand-500 transition-colors">
                {card.title}
              </h3>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{card.desc}</p>
              {!isComingSoon && (
                <div className="flex items-center gap-1 mt-3 text-xs text-brand-500 font-medium">
                  Yönet <ChevronRight size={12} />
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
