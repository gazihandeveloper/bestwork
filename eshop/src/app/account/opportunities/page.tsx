// ============================================
// BestWork - Kazanç Planı (İş Fırsatları) — detaylı
// ============================================
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  House,
  UserPlus,
  ShoppingCart,
  Coins,
  Users,
  GitFork,
  Trophy,
  Receipt,
  CircleCheck,
  Sparkles,
  Award,
  Gem,
  Network,
  Package,
  Percent,
  ShieldCheck,
  Scale,
  TrendingUp,
  Wallet,
  RotateCcw,
  Layers,
  Clock,
} from '@/components/icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { get } from '@/lib/api'

interface RankRow {
  id: number
  name: string
  required_left_pv: number
  required_right_pv: number
  monthly_binary_limit: number
  required_downline_rank_id: number | null
  required_downline_count: number
  personal_activity_pv: number
  career_bonus_amount: number
}

interface PackageRow {
  id: number
  name: string
  price: number
  referral_bonus_rate: number
  binary_bonus_rate: number
  discount_rate: number
  required_pv: number
  cv: number
}

const steps = [
  {
    title: '1. Ücretsiz Üye Ol',
    desc: 'Kayıt olun; TR90 ile başlayan üye numaranız ve kişisel sponsor linkiniz otomatik oluşur.',
    icon: <UserPlus size={22} />,
    cls: 'bg-brand-50 text-brand-600',
  },
  {
    title: '2. Alışveriş Yap / Yaptır',
    desc: 'PV-CV kazandıran ürünlerden sipariş verin. Birikimli PV’niz arttıkça paketiniz ve kariyeriniz yükselir.',
    icon: <ShoppingCart size={22} />,
    cls: 'bg-blue-50 text-blue-600',
  },
  {
    title: '3. Ekip Kur ve Kazan',
    desc: 'Referans, binary eşleşme, liderlik (matching), perakende ve kariyer primleriyle kazancınızı büyütün.',
    icon: <Coins size={22} />,
    cls: 'bg-amber-50 text-amber-600',
  },
]

const earnings = [
  {
    title: 'Referans (Sponsor) Primi',
    tag: '1. nesil · anında',
    icon: <Users size={20} />,
    cls: 'bg-green-50 text-green-600',
    ring: 'border-green-100',
    desc: 'Doğrudan davet ettiğiniz her üyenin ödenmiş sipariş CV’sinden, paketinizin referans oranı kadar anında kazanırsınız.',
    details: [
      'Kapsam: yalnızca doğrudan sponsorunuz olduğunuz üyeler (1. nesil).',
      'Hesap: siparişin CV tutarı × paketinizin referans oranı.',
      'Ödeme: üyenin siparişi ödendiği an cüzdana “referral” olarak işlenir.',
      'Sponsorun paketi yoksa prim ödenmez; aynı sipariş için ikinci kez ödenmez.',
      'Oran paketinize göre değişir — aşağıdaki “Paketler ve Prim Oranları” tablosuna bakın.',
    ],
  },
  {
    title: 'Binary Eşleşme Primi',
    tag: 'Sol / Sağ bacak',
    icon: <GitFork size={20} />,
    cls: 'bg-blue-50 text-blue-600',
    ring: 'border-blue-100',
    desc: 'Sol ve sağ bacaklarınızda biriken CV’ler eşleştiğinde, eşleşen CV üzerinden paket oranınız kadar kazanırsınız.',
    details: [
      'Eşleşme tutarı: min(Sol CV, Sağ CV).',
      'Hesap: eşleşen CV × paketinizin binary oranı.',
      'Eşleşen kadar CV her iki bacaktan düşülür; eşleşmeyen bakiye bacakta kalır (carry-over).',
      'Kapanış: eşleşme hem sipariş anında hem ay sonu toplu kapanışta çalışır.',
      'Paketiniz yoksa binary ödenmez ve CV tüketilmez.',
      'Oranınız pakete göre değişir — aşağıdaki tabloya bakın.',
    ],
  },
  {
    title: 'Liderlik (Matching) Primi',
    tag: '5 nesil',
    icon: <Trophy size={20} />,
    cls: 'bg-amber-50 text-amber-600',
    ring: 'border-amber-100',
    desc: 'Ekibinizin binary kazançlarından, sponsor hattınız boyunca 5 nesle kadar pay alırsınız.',
    details: [
      'Nesil oranları: %20 · %10 · %10 · %10 · %5 (1. → 5. nesil).',
      'Şart: yalnızca kariyer sahibi (Jade ve üzeri) üst hat pay alır.',
      'Kariyersiz nesil pay almaz; bu pay bir üst nesle devredilmez.',
      'Matching, alttaki üyenin kazancından kesilmez; şirket ayrıca öder.',
    ],
  },
  {
    title: 'Perakende (Müşteri) Kazancı',
    tag: 'Müşteri siparişleri',
    icon: <Receipt size={20} />,
    cls: 'bg-violet-50 text-violet-600',
    ring: 'border-violet-100',
    desc: 'Sizin sponsorluğunuzda üye olan müşterilerin siparişlerinden, paketinizin referans oranı kadar kazanırsınız.',
    details: [
      'Müşteri sipariş CV’si üzerinden doğrudan sponsora ödenir (referans oranıyla).',
      'Müşteri siparişlerinin PV’si sponsorun birikimli PV’sine eklenir (paket yükseltir).',
      'Müşteriler binary ağaca girmez; ayrı “retail” kaleminden kazanç sağlar.',
      'Perakende siparişlerinde paket alışveriş indirimi uygulanmaz.',
    ],
  },
  {
    title: 'Kariyer (Rütbe) Primi',
    tag: 'Tek seferlik',
    icon: <Award size={20} />,
    cls: 'bg-rose-50 text-rose-600',
    ring: 'border-rose-100',
    desc: 'Yeni bir kariyer basamağına ilk kez ulaştığınızda tek seferlik kariyer primi kazanırsınız.',
    details: [
      'Her rütbe için ömür boyu yalnızca ilk kez ulaşımda ödenir.',
      'Rütbe düşüp yeniden yükselseniz bile aynı rütbenin primi tekrar ödenmez.',
      'Prim, cüzdana “career” olarak işlenir; prim geçmişinde görünür.',
    ],
  },
]

const limitNotes = [
  'Aylık Binary Limiti: Rütbenize göre belirlenen üst sınır (tablo). Aşan kısım o ay ödenmez.',
  'Flashout (Gelir Tavanı): Günlük/haftalık gelir tavanı tanımlanabilir; tavan aşılırsa fazla kazanç kesilir ve limit kaydına işlenir.',
  'Kişisel Aktivite: Her ay 250 PV kişisel alışveriş veya hedef paket seviyesinde 2 alt üye kaydı.',
  'CV Tüketimi: Eşleşen CV her iki bacaktan düşülür; carry bakiye sonraki döneme taşınır.',
  'Paket Şartı: Paketiniz yoksa binary ve matching primleri oluşmaz.',
  'İade/İptal: Sipariş iptal edilirse o siparişten doğan primler geri alınır.',
]

const lifecycle = [
  {
    icon: <Layers size={18} />,
    title: 'Yerleşim Havuzu',
    desc: 'Üye olunca otomatik ağaca yerleşmez. Ödenmiş ilk sipariş sonrası yerleşim havuzuna girer; yerleşince birikmiş PV/CV üst hatta dağıtılır.',
  },
  {
    icon: <Network size={18} />,
    title: 'Sponsor Değişimi',
    desc: 'Sponsor değiştirilirse üye alt ağacı yoksa ağaçtan çıkar ve yerleşim havuzuna geri döner.',
  },
  {
    icon: <RotateCcw size={18} />,
    title: 'Respawn (Yeniden Üyelik)',
    desc: 'En az 1 yıllık üyelik ve son 1 yılda ürün alımı/üye kaydı yoksa yeni sponsor ve yeni üye numarasıyla sıfırdan başvuru hakkı doğar.',
  },
  {
    icon: <Wallet size={18} />,
    title: 'Cüzdan ve Çekim',
    desc: 'Tüm primler TL olarak cüzdana işlenir. Çekim talebi onaylandığında bakiyeden düşülür; minimum çekim 750 ₺’dir.',
  },
]

const rules = [
  {
    icon: <Scale size={18} />,
    title: 'Aktiflik Şartı',
    desc: 'Kariyeri korumak için her ay 250 PV kişisel alışveriş ya da hedef pakette 2 alt üye kaydı gerekir; sağlanmazsa rütbe düşer.',
  },
  {
    icon: <ShieldCheck size={18} />,
    title: 'Aylık Binary Limiti',
    desc: 'Rütbenize göre aylık binary kazancı üst sınırı uygulanır; sınırı aşan kazanç o ay ödenmez.',
  },
  {
    icon: <Clock size={18} />,
    title: 'Flashout',
    desc: 'Tanımlandıysa günlük/haftalık gelir tavanı uygulanır; tavanı aşan tutar kesilir.',
  },
  {
    icon: <Percent size={18} />,
    title: 'Paket İndirimi',
    desc: 'Paket sahibi üyeler siparişlerinde indirim kazanır; perakende (müşteri) siparişlerinde indirim yoktur.',
  },
  {
    icon: <TrendingUp size={18} />,
    title: 'Ay Sonu Yeniden Hesap',
    desc: 'Kariyerler her ay sonu yeniden hesaplanır; aktiflik ve bacak şartlarını sağlayanlar rütbesini korur/yükseltir.',
  },
  {
    icon: <Sparkles size={18} />,
    title: 'Şeffaf Prim Geçmişi',
    desc: 'Tüm primler (referral, binary, matching, retail, career) cüzdan ve prim detayları sayfasında listelenir.',
  },
]

const glossary = [
  { k: 'PV', v: 'Puan (kişisel hacim). Siparişlerden kazanılır; bacak ve paket hesaplarında kullanılır.' },
  { k: 'CV', v: 'Komisyon hacmi. Prim hesaplarında esas alınır (1 PV = 1 CV).' },
  { k: 'Bacak', v: 'Binary ağacınızdaki sol ve sağ kollar. PV/CV bacaklarda birikir.' },
  { k: 'Eşleşme', v: 'Sol ve sağ bacaktaki CV’lerin min() ile karşılıklı düşülmesi.' },
  { k: 'Carry', v: 'Eşleşmeyen bakiye. Bacakta kalır ve sonraki dönemde eşleşir.' },
  { k: 'Flashout', v: 'Gelir tavanı. Tanımlı limiti aşan kazanç ödenmez.' },
  { k: 'Nesil', v: 'Sponsor zincirinde yukarı doğru kuşak (1. nesil = doğrudan sponsorunuz).' },
]

const fmt = (v: number) => (Number(v) || 0).toLocaleString('tr-TR')
const pct = (v: number) => `%${Math.round((Number(v) || 0) * 100)}`

export default function OpportunitiesPage() {
  const [ranks, setRanks] = useState<RankRow[]>([])
  const [pkgs, setPkgs] = useState<PackageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([get<RankRow[]>('/eshop/ranks'), get<PackageRow[]>('/eshop/packages')])
      .then(([rr, pr]) => {
        if (rr.status === 'fulfilled' && rr.value.success && Array.isArray(rr.value.data)) setRanks(rr.value.data)
        if (pr.status === 'fulfilled' && pr.value.success && Array.isArray(pr.value.data)) setPkgs(pr.value.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const rankNames = useMemo(() => {
    const m: Record<number, string> = {}
    ranks.forEach((r) => (m[r.id] = r.name))
    return m
  }, [ranks])

  const downlineText = (r: RankRow) => {
    if (!r.required_downline_count || !r.required_downline_rank_id) return '—'
    const nm = rankNames[r.required_downline_rank_id] || `#${r.required_downline_rank_id}`
    return `${r.required_downline_count}× ${nm}`
  }

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-gray-900">Kazanç Planı</h1>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 p-8 text-center text-white shadow-lg">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Sparkles size={26} />
        </span>
        <h2 className="text-3xl font-extrabold">Kazanç Planı</h2>
        <p className="mx-auto mt-2 max-w-3xl text-sm leading-relaxed text-emerald-200">
          Bestwork; e-ticaret ile ağ pazarlamayı birleştirir. Alışveriş yapın, üye davet edin ve beş
          ayrı kazanç kalemiyle gelirinizi büyütün: referans, binary, liderlik, perakende ve kariyer.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
          {['Anında prim', '5 nesil liderlik', '12 kariyer basamağı', 'Carry-over', '₺ cüzdan', 'min. 750 ₺ çekim'].map((t) => (
            <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-emerald-100">{t}</span>
          ))}
        </div>
      </div>

      {/* Nasıl çalışır */}
      <div>
        <h3 className="mb-3 text-lg font-extrabold text-gray-900">Nasıl Çalışır?</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <span className="absolute top-3 right-4 text-4xl font-extrabold text-gray-100">{i + 1}</span>
              <span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${s.cls}`}>{s.icon}</span>
              <h4 className="font-extrabold text-gray-900">{s.title}</h4>
              <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kazanç türleri */}
      <div>
        <h3 className="mb-3 text-lg font-extrabold text-gray-900">Kazanç Türleri</h3>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {earnings.map((e) => (
            <div key={e.title} className={`rounded-2xl border ${e.ring} bg-white p-5 shadow-sm`}>
              <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${e.cls}`}>{e.icon}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-extrabold text-gray-900">{e.title}</h4>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] fw-700 text-gray-500 uppercase">{e.tag}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{e.desc}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 border-t border-gray-50 pt-3">
                {e.details.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-[13px] text-gray-600">
                    <CircleCheck size={15} className="mt-0.5 shrink-0 text-brand-500" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Paketler */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-900">
          <Package size={20} className="text-brand-600" /> Paketler ve Prim Oranları
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 fw-700">Paket</th>
                <th className="px-4 py-3 fw-700">Gerekli PV</th>
                <th className="px-4 py-3 fw-700">CV</th>
                <th className="px-4 py-3 fw-700">Referans</th>
                <th className="px-4 py-3 fw-700">Binary</th>
                <th className="px-4 py-3 fw-700">İndirim</th>
              </tr>
            </thead>
            <tbody>
              {pkgs.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-900 fw-700">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(p.required_pv)} PV</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(p.cv)}</td>
                  <td className="px-4 py-3 text-brand-700 fw-700">{pct(p.referral_bonus_rate)}</td>
                  <td className="px-4 py-3 text-blue-600 fw-700">{pct(p.binary_bonus_rate)}</td>
                  <td className="px-4 py-3 text-violet-600 fw-700">{pct(p.discount_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Paketiniz, birikimli PV’niz arttıkça otomatik yükselir. Referans oranı perakende (müşteri) kazancında da geçerlidir.
          Perakende oranı (matching etkisi) paket bazında ayrıca tanımlanabilir.
        </p>
      </div>

      {/* Kariyer seviyeleri */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-900">
          <Trophy size={20} className="text-amber-500" /> Kariyer Seviyeleri ve Eşikler
        </h3>
        {loading ? (
          <div className="py-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : ranks.length === 0 ? (
          <p className="text-sm text-gray-400">Rütbe tanımı bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3 fw-700">Kariyer</th>
                  <th className="px-4 py-3 fw-700">Sol / Sağ PV</th>
                  <th className="px-4 py-3 fw-700">Alt Hat Şartı</th>
                  <th className="px-4 py-3 fw-700">Kişisel Aktivite</th>
                  <th className="px-4 py-3 fw-700">Aylık Binary Limiti</th>
                  <th className="px-4 py-3 fw-700">Kariyer Primi</th>
                </tr>
              </thead>
              <tbody>
                {ranks.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-gray-900 fw-700">
                        <Gem size={15} className="text-amber-500" />
                        {r.name.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-purple-600 fw-600">
                      {fmt(r.required_left_pv)} / {fmt(r.required_right_pv)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{downlineText(r)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmt(r.personal_activity_pv)} PV</td>
                    <td className="px-4 py-3 text-brand-700 fw-700">{fmt(r.monthly_binary_limit)} ₺</td>
                    <td className="px-4 py-3 text-rose-600 fw-600">{r.career_bonus_amount > 0 ? 'Tek seferlik' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-400">
          Sol/Sağ PV: bacaklarınızdaki toplam PV. Alt Hat Şartı: her bacakta ayrı ayrı belirtilen rütbeye
          ulaşan üye sayısı. Kişisel Aktivite: o ay kendi alışverişinizden gereken PV.
        </p>
      </div>

      {/* Limitler / Flashout */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-900">
          <ShieldCheck size={20} className="text-brand-600" /> Limitler, Flashout ve Kurallar
        </h3>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {limitNotes.map((t) => (
              <li key={t} className="flex items-start gap-2 text-[13px] text-gray-600">
                <CircleCheck size={15} className="mt-0.5 shrink-0 text-brand-500" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Yaşam döngüsü */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-900">
          <Network size={20} className="text-brand-600" /> Yerleşim, Havuz ve Üyelik Yaşam Döngüsü
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {lifecycle.map((r) => (
            <div key={r.title} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600">{r.icon}</span>
              <div>
                <h4 className="font-extrabold text-gray-900">{r.title}</h4>
                <p className="mt-0.5 text-sm text-gray-500">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kurallar (kısa) */}
      <div>
        <h3 className="mb-3 text-lg font-extrabold text-gray-900">Öne Çıkan Kurallar</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rules.map((r) => (
            <div key={r.title} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600">{r.icon}</span>
              <div>
                <h4 className="font-extrabold text-gray-900">{r.title}</h4>
                <p className="mt-0.5 text-sm text-gray-500">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sözlük */}
      <div>
        <h3 className="mb-3 text-lg font-extrabold text-gray-900">Terimler Sözlüğü</h3>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {glossary.map((g) => (
            <div key={g.k} className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm font-extrabold text-gray-900">{g.k}</p>
              <p className="mt-0.5 text-xs text-gray-500">{g.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/account/tree" className="rounded-2xl bg-brand-600 p-5 text-white shadow-sm transition-transform hover:-translate-y-0.5">
          <Network size={22} />
          <p className="mt-3 font-extrabold">Ağacını Gör</p>
          <p className="text-xs text-white/80">Binary ekibini ve bacak PV’lerini incele.</p>
        </Link>
        <Link href="/account/career" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5">
          <Trophy size={22} className="text-amber-500" />
          <p className="mt-3 font-extrabold text-gray-900">Kariyer Takibi</p>
          <p className="text-xs text-gray-500">Hedef rütbene kalan PV ve şartları gör.</p>
        </Link>
        <Link href="/account/commissions" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5">
          <Coins size={22} className="text-brand-600" />
          <p className="mt-3 font-extrabold text-gray-900">Prim Detayları</p>
          <p className="text-xs text-gray-500">Kazanç geçmişini ve toplamlarını incele.</p>
        </Link>
      </div>
    </div>
  )
}
