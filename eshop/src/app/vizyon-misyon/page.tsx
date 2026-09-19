// ============================================
// BestWork - Vizyon ve Misyon
// ============================================
'use client'

import { MainLayout } from '@/app/main-layout'

export default function VizyonMisyonPage() {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-500 to-green-600 py-20">
        <div className="container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Vizyon ve Misyon</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            BestWork olarak geleceğe bakışımız ve bizi biz yapan değerlerimiz.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Vizyon */}
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-extrabold text-gray-800 mb-4">Vizyonumuz</h2>
              <p className="text-gray-600 leading-relaxed">
                En taze ve doğal ürünleri, modern teknolojinin gücüyle herkesin kolayca ulaşabildiği
                bir alışveriş deneyimine dönüştürmek; doğallık ile teknolojiyi buluşturan öncü marka olmak.
              </p>
            </div>

            {/* Misyon */}
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-extrabold text-gray-800 mb-4">Misyonumuz</h2>
              <p className="text-gray-600 leading-relaxed">
                Yerel üreticileri destekleyerek, kalite kontrollerinden geçmiş ürünleri en hızlı şekilde
                sofralarınıza ulaştırmak; güvenilir, şeffaf ve sürdürülebilir bir alışveriş sunmak.
              </p>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
