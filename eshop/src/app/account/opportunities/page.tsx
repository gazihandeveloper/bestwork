// ============================================
// BestWork - Kazanç Planı (İş Fırsatları)
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
    tag: 'Doğrudan sponsorluk',
    icon: <Users size={20} />,
    cls: 'bg-green-50 text-green-600',
    ring: 'border-green-100',
    desc: 'Doğrudan davet ettiğiniz her üyenin ödenmiş sipariş CV’sinden, paketinizin referans oranı kadar anında kazanırsınız.',
    details: [
      'Kapsam: yalnızca 1. nesil (doğrudan sponsor olduğunuz üyeler).',
      'Oran paketinize göre değişir (aşağıdaki “Paketler ve Prim Oranlarınız” tablosuna bakın).',
      'Prim, üyenin siparişi ödendiği an cüzdanınıza yansır.',
    ],
  },
  {
    title: 'Binary Eşleşme Primi',
    tag: 'Sol / Sağ bacak',
    icon: <GitFork size={20} />,
    cls: 'bg-blue-50 text-blue-600',
    ring: 'border-blue-100',
    desc: 'Sol ve sağ bacaklarınızda biriken CV’ler eşleştiğinde, eşleşen CV tutarı üzerinden paket oranınız kadar kazanırsınız.',
    details: [
      'Eşleşme: min(sol CV, sağ CV) kadar CV eşleşir, eşleşmeyen bakiye bacakta kalır (carry).',
      'Oran paketinize göre değişir (aşağıdaki tablo).',
      'Eşleşme, sipariş anında ve ay sonu toplu kapanışta çalışır.',
      'Rütbenize göre aylık binary kazanç limiti uygulanır (aşağıdaki tablo).',
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
      'Yalnızca kariyer sahibi (Jade ve üzeri) üst hat pay alır; kariyersiz nesil pay almaz.',
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
      'Müşteri sipariş CV’si üzerinden, doğrudan sponsora ödenir.',
      'Müşteri siparişlerinin PV’si sponsorun birikimli PV’sine eklenir.',
      'Müşteriler binary ağaca girmez; kazanç perakende kanalından gelir.',
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
      'Her rütbe için ömür boyu yalnızca ilk ulaşımda ödenir.',
      'Prim, cüzdanınıza ve prim geçmişinize “career” olarak işlenir.',
    ],
  },
]

const rules = [
  {
    icon: <Scale size={18} />,
    title: 'Aktiflik Şartı',
    desc: 'Her ay kariyerinizi korumak için 250 PV kişisel alışveriş ya da hedef paket seviyesinde 2 alt üye kaydı gerekir.',
  },
  {
    icon: <ShieldCheck size={18} />,
    title: 'Aylık Binary Limiti',
    desc: 'Rütbenize göre belirlenen aylık binary kazancı üst sınırı vardır; sınırı aşan kazanç o ay ödenmez.',
  },
  {
    icon: <Percent size={18} />,
    title: 'Paket İndirimi',
    desc: 'Paket sahibi üyeler siparişlerinde paket indiriminden yararlanır; perakende (müşteri) siparişlerinde indirim uygulanmaz.',
  },
  {
    icon: <TrendingUp size={18} />,
    title: 'Cüzdan ve Çekim',
    desc: 'Tüm primler TL olarak cüzdanınıza işlenir; minimum çekim tutarı 750 TL’dir.',
  },
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
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-emerald-200">
          Bestwork; e-ticaret ile ağ pazarlamayı birleştirir. Alışveriş yapın, üye davet edin ve
          beş ayrı kazanç kalemiyle gelirinizi büyütün: referans, binary, liderlik, perakende ve kariyer.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
          {['Anında prim', '5 nesil liderlik', '12 kariyer basamağı', '₺ cüzdan'].map((t) => (
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
          <Package size={20} className="text-brand-600" /> Paketler ve Prim Oranlarınız
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 fw-700">Paket</th>
                <th className="px-4 py-3 fw-700">Gerekli PV</th>
                <th className="px-4 py-3 fw-700">Referans Primi</th>
                <th className="px-4 py-3 fw-700">Binary Primi</th>
                <th className="px-4 py-3 fw-700">Alışveriş İndirimi</th>
              </tr>
            </thead>
            <tbody>
              {pkgs.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-900 fw-700">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(p.required_pv)} PV</td>
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
        </p>
      </div>

      {/* Kariyer seviyeleri */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-900">
          <Trophy size={20} className="text-amber-500" /> Kariyer Seviyeleri ve Sınırlar
        </h3>
        {loading ? (
          <div className="py-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : ranks.length === 0 ? (
          <p className="text-sm text-gray-400">Rütbe tanımı bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3 fw-700">Kariyer</th>
                  <th className="px-4 py-3 fw-700">Sol / Sağ PV</th>
                  <th className="px-4 py-3 fw-700">Alt Hat Şartı</th>
                  <th className="px-4 py-3 fw-700">Kişisel Aktivite</th>
                  <th className="px-4 py-3 fw-700">Aylık Binary Limiti</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-400">
          Sol/Sağ PV sütunları bacaklarınızdaki toplam PV’dir. Alt hat şartı, her bacakta ayrı ayrı
          belirtilen rütbeye ulaşan üye sayısıdır.
        </p>
      </div>

      {/* Kurallar */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-900">
          <Network size={20} className="text-brand-600" /> Bilmeniz Gerekenler
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rules.map((r) => (
            <div key={r.title} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600">
                {r.icon}
              </span>
              <div>
                <h4 className="font-extrabold text-gray-900">{r.title}</h4>
                <p className="mt-0.5 text-sm text-gray-500">{r.desc}</p>
              </div>
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
