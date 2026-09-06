// ============================================
// BestWork - Hakkımızda
// ============================================
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MainLayout } from '@/app/main-layout'
import { Truck, Shield, Leaf, Users, Heart, Star } from '@/lib/google-icons'

const features = [
  { icon: Truck, title: 'Hızlı Teslimat', desc: 'Siparişleriniz aynı gün kapınızda. İstanbul içi 2 saatte teslimat.' },
  { icon: Shield, title: 'Güvenli Alışveriş', desc: '256-bit SSL ile korunan altyapı, güvenli ödeme sistemleri.' },
  { icon: Leaf, title: 'Doğal Ürünler', desc: 'Tüm ürünlerimiz doğal ve taze, doğrudan üreticiden sofraya.' },
  { icon: Users, title: 'Mutlu Müşteriler', desc: 'Binlerce mutlu müşteri, %98 memnuniyet oranı.' },
]

const stats = [
  { value: '10.000+', label: 'Mutlu Müşteri' },
  { value: '500+', label: 'Ürün Çeşidi' },
  { value: '30+', label: 'Tedarikçi' },
  { value: '24/7', label: 'Destek' },
]

export default function AboutPage() {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-500 to-green-600 py-20">
        <div className="container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Hakkımızda</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            BestWork olarak misyonumuz, en taze ve doğal ürünleri en hızlı şekilde sofralarınıza ulaştırmak.
          </p>
        </div>
      </section>

      {/* Hikayemiz */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-800 mb-6">Hikayemiz</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  BestWork, 2024 yılında "doğal ve taze ürünlere herkesin kolayca ulaşabilmesi" vizyonuyla kuruldu. 
                  Kurucularımız, geleneksel market alışverişini modern teknolojiyle buluşturarak, müşterilerimize 
                  benzersiz bir alışveriş deneyimi sunmayı hedefledi.
                </p>
                <p>
                  Bugün, 30'dan fazla yerel üretici ve tedarikçiyle çalışıyor, 500'ün üzerinde ürün çeşidini 
                  en taze haliyle kapınıza kadar getiriyoruz. Kalite kontrol süreçlerimizle her ürünün 
                  en yüksek standartlarda olduğundan emin oluyoruz.
                </p>
                <p>
                  Teknolojiyi doğallıkla birleştiren BestWork, alışverişi sadece kolay değil, 
                  aynı zamanda keyifli hale getirmek için çalışıyor.
                </p>
              </div>
            </div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-brand-100 to-green-50 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="text-8xl mb-4">🛒</div>
                <p className="text-brand-500 font-bold text-2xl">BestWork</p>
                <p className="text-gray-500">Doğadan Sofranıza</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold text-brand-500 mb-2">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Neden Biz */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-gray-800 text-center mb-12">Neden BestWork?</h2>
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

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-brand-500 to-green-500">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-extrabold mb-4">Alışverişe Başlayın</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">En taze ürünler, en hızlı teslimat. BestWork ailesine katılın.</p>
          <Link href="/products" className="inline-flex items-center gap-2 bg-white text-brand-500 font-bold px-8 py-3.5 rounded-full hover:bg-gray-100 transition-colors text-lg">
            Ürünleri Keşfet
          </Link>
        </div>
      </section>
    </MainLayout>
  )
}
