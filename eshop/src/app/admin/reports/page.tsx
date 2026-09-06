'use client'
import Link from 'next/link'
import { BarChart3, TrendingUp, Users, ShoppingCart, ChevronRight } from '@/lib/google-icons'

const reportCards = [
  { href: '/admin/reports', icon: TrendingUp, title: 'En Çok Satanlar', desc: 'Hangi ürünler daha çok satılıyor', color: 'bg-green-50 text-green-500' },
  { href: '/admin/reports', icon: Users, title: 'En İyi Müşteriler', desc: 'En çok alışveriş yapan müşteriler', color: 'bg-blue-50 text-blue-500' },
  { href: '/admin/reports/detailed', icon: ShoppingCart, title: 'Detaylı Raporlama', desc: 'Şehir, ürün bazlı detaylı raporlar', color: 'bg-purple-50 text-purple-500' },
  { href: '/admin/reports/collections', icon: BarChart3, title: 'Tahsilat Raporları', desc: 'Alışverişsiz tahsilatlarınızı raporlayın', color: 'bg-orange-50 text-orange-500' },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Raporlar</h1>
        <p className="text-sm text-gray-500 mt-1">Satış, müşteri ve performans raporları</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportCards.map(card => {
          const I = card.icon
          return (
            <Link key={card.title} href={card.href} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-all group">
              <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}><I size={22} /></div>
              <div className="flex-1"><h3 className="text-sm font-bold text-gray-800">{card.title}</h3><p className="text-xs text-gray-400 mt-0.5">{card.desc}</p></div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-500" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
