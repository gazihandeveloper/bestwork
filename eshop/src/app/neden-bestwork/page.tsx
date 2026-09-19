// ============================================
// BestWork - Neden BestWork?
// ============================================
'use client'

import { MainLayout } from '@/app/main-layout'

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
          <div className="mx-auto max-w-3xl space-y-4 text-gray-600 leading-relaxed">
            <p>
              2002 yılında bir ABD firmasıyla MLM sektörüyle çalışmaya başlandı. O firmada full time 20
              yıllık profesyonel olarak MLM saha çalışmasıyla yüzbinlerce kişinin hayatına dokunduk. Sahada
              girişimcilerimizin neyi yapıp neyi yapamadıklarını, müşterilerin de neyi isteyip neyi
              istemediklerini ve MLM sektöründe sürdürülebilir olmanın kriterlerinin neler olduğunu yaşayarak
              ölçütledik.
            </p>
            <p>
              Bazen etik dışı çalışan şirketlerin ve bazen de etik çalışmayan Liderlerin kurbanı olan
              girişimciler tanıdık. Bu şirketi kurmamızdaki amacımız; sektörün bu kadar değerli olmasının
              yanı sıra işini iyi yapmayan şirket sahipleri ve suni ve günlük çalışan amatör Liderlerden
              dolayı, sektöre yıllarını vermiş dürüst ve etik çalışan ve sektörden alacaklı olduğunu düşünen
              girişimcilerle en iyi işi kurmak ve geleceğe güvenle bakmak adına bu şirketi kurma kararı aldık.
            </p>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
