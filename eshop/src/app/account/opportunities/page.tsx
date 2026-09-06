// ============================================
// BestWork - İş Fırsatları — BestWork (yeni tasarım)
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { House, UserPlus, ShoppingCart, Coins, Users, GitFork, Trophy, Receipt, CircleCheck, Sparkles } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { get } from '@/lib/api'

interface RankRow {
  id: number
  name: string
  required_left_pv: number
  required_right_pv: number
  monthly_binary_limit: number
}

const steps = [
  { title: '1. Kayıt Ol', desc: 'Ücretsiz üye olun; TR90 ile başlayan üye numaranız otomatik oluşturulur.', icon: <UserPlus size={22} />, cls: 'bg-brand-50 text-brand-600' },
  { title: '2. Alışveriş Yap', desc: 'PV/CV kazandıran ürünlerden sipariş verin, paket seviyeniz otomatik yükselsin.', icon: <ShoppingCart size={22} />, cls: 'bg-blue-50 text-blue-600' },
  { title: '3. Kazan', desc: 'Referans, binary, matching ve perakende kazançlarıyla ekibinizi büyütüp kazanın.', icon: <Coins size={22} />, cls: 'bg-amber-50 text-amber-600' },
]

const earnings = [
  { title: 'Referans Primi', desc: 'Sponsor olduğunuz her üyenin sipariş CV\'sinden paket oranınıza göre anında kazanırsınız.', icon: <Users size={20} />, cls: 'bg-green-50 text-green-600' },
  { title: 'Binary Eşleşme', desc: 'Sol ve sağ bacağınızdaki CV\'ler aylık kapanışta eşleşir, binary bonusu cüzdanınıza yatar.', icon: <GitFork size={20} />, cls: 'bg-blue-50 text-blue-600' },
  { title: 'Liderlik (Matching) Primi', desc: 'Ekibinizin binary kazançlarından 5 nesle kadar %20/%10/%10/%10/%5 pay alırsınız.', icon: <Trophy size={20} />, cls: 'bg-amber-50 text-amber-600' },
  { title: 'Perakende Kazancı', desc: 'Referans kodunuzla kayıt olan müşterilerin siparişlerinden komisyon kazanırsınız.', icon: <Receipt size={20} />, cls: 'bg-violet-50 text-violet-600' },
]

const fmt = (v: number) => (Number(v) || 0).toLocaleString('tr-TR')

export default function OpportunitiesPage() {
  const [ranks, setRanks] = useState<RankRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get<RankRow[]>('/eshop/ranks')
      .then((r) => {
        if (r.success && Array.isArray(r.data)) setRanks(r.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-gray-900">İş Fırsatları</h1>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 p-8 text-center text-white shadow-lg">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Sparkles size={26} />
        </span>
        <h2 className="text-3xl font-extrabold">İş Fırsatları</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-emerald-200">
          Bestwork MLM ile e-ticareti ve ekibinizi birleştirin: alışveriş yapın, üye davet edin,
          aylık binary kapanışından ve liderlik priminden kazanın.
        </p>
      </div>

      {/* Nasıl çalışır */}
      <div>
        <h3 className="mb-3 text-lg font-extrabold text-gray-900">Nasıl Çalışır?</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <span className="absolute top-4 right-4 text-4xl font-extrabold text-gray-100">{i + 1}</span>
              <span className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${s.cls}`}>{s.icon}</span>
              <h4 className="font-bold text-gray-900">{s.title}</h4>
              <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kazanç türleri */}
      <div>
        <h3 className="mb-3 text-lg font-extrabold text-gray-900">Kazanç Türleri</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {earnings.map((e) => (
            <div key={e.title} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${e.cls}`}>{e.icon}</span>
              <div>
                <h4 className="font-bold text-gray-900">{e.title}</h4>
                <p className="mt-0.5 text-sm text-gray-500">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
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
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {ranks.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <CircleCheck size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">{r.name.toLocaleUpperCase('tr-TR')}</p>
                    <p className="text-[11px] text-gray-400">
                      Sol {fmt(r.required_left_pv)} · Sağ {fmt(r.required_right_pv)} PV
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">Aylık Limit</p>
                  <p className="text-sm font-extrabold text-brand-700">{fmt(r.monthly_binary_limit)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
