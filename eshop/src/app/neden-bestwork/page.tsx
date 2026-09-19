// ============================================
// BestWork - Neden BestWork?
// ============================================
'use client'

import { MainLayout } from '@/app/main-layout'
import { Truck, Shield, Leaf, Users } from '@/components/icons'

const features = [
  { icon: Truck, title: 'Hızlı Teslimat', desc: 'Siparişleriniz aynı gün kapınızda. İstanbul içi 2 saatte teslimat.' },
  { icon: Shield, title: 'Güvenli Alışveriş', desc: '256-bit SSL ile korunan altyapı, güvenli ödeme sistemleri.' },
  { icon: Leaf, title: 'Doğal Ürünler', desc: 'Tüm ürünlerimiz doğal ve taze, doğrudan üreticiden sofraya.' },
  { icon: Users, title: 'Mutlu Müşteriler', desc: 'Binlerce mutlu müşteri, %98 memnuniyet oranı.' },
]

export default function NedenBestworkPage() {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-500 to-green-600 py-20">
        <div className="container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Neden BestWork?</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            BestWork'ü tercih etmeniz için birçok neden var.
          </p>
        </div>
      </section>

      {/* Neden Biz */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                    <Icon size={26} className="text-brand-500" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
