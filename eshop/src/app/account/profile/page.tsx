// ============================================
// BestWork - Üyelik Bilgilerim (BestWork)
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { House, Copy, Check, Crown, Package as PackageIcon, Wallet, LogOut, Trophy, Mail, Phone } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { useAuth } from '@/contexts/AuthContext'
import { get } from '@/lib/api'
import toast from 'react-hot-toast'

interface MeData {
  id?: number
  name?: string
  email?: string
  member_code?: string
  phone?: string
  role?: string
  is_active?: boolean
  is_in_pending_pool?: boolean
  current_rank_name?: string
  package_name?: string
  created_at?: string
}

interface DashData {
  user?: { package?: string | null; rank?: string | null }
  wallet?: { balance?: number; total_earned?: number }
}

export default function ProfilePage() {
  const { user: ctxUser, logout } = useAuth()
  const [me, setMe] = useState<MeData | null>(null)
  const [dash, setDash] = useState<DashData | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    get<MeData>('/eshop/me')
      .then((r) => {
        if (r.success && r.data) setMe(r.data)
      })
      .catch(() => {})
    get<DashData>('/eshop/dashboard')
      .then((r) => {
        if (r.success && r.data) setDash(r.data)
      })
      .catch(() => {})
  }, [])

  const name = me?.name || ctxUser?.fullName || ctxUser?.email || 'Üye'
  const roleText =
    me?.role === 'admin' || me?.role === 'super_admin'
      ? 'Admin'
      : me?.role === 'customer'
        ? 'Müşteri'
        : 'Üye'

  const info: { label: string; value: string }[] = [
    { label: 'Ad Soyad', value: name },
    { label: 'E-posta', value: me?.email || ctxUser?.email || '-' },
    { label: 'Telefon', value: me?.phone || '-' },
    { label: 'Paket', value: me?.package_name || dash?.user?.package || '-' },
    { label: 'Rütbe', value: me?.current_rank_name || dash?.user?.rank || '-' },
    {
      label: 'Durum',
      value: me?.is_in_pending_pool ? 'Yerleşim bekliyor' : me?.is_active === false ? 'Pasif' : 'Aktif',
    },
    { label: 'Kayıt Tarihi', value: me?.created_at ? new Date(me.created_at).toLocaleDateString('tr-TR') : '-' },
  ]

  const copyCode = () => {
    const code = me?.member_code || ''
    if (!code) return
    navigator.clipboard?.writeText(code).catch(() => {})
    setCopied(true)
    toast.success('Üye kodu kopyalandı')
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-gray-900">Üyelik Bilgilerim</h1>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      <div className="w-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        {/* Rozetler */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-100"
          >
            Üye No: {me?.member_code || ctxUser?.id || '-'}
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{roleText}</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              me?.is_in_pending_pool
                ? 'bg-amber-50 text-amber-600'
                : me?.is_active === false
                  ? 'bg-red-50 text-red-600'
                  : 'bg-green-50 text-green-600'
            }`}
          >
            {me?.is_in_pending_pool ? 'Yerleşim bekliyor' : me?.is_active === false ? 'Pasif' : 'Aktif'}
          </span>
        </div>

        {/* Bilgi kartları */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {info.map((it) => (
            <div key={it.label} className="rounded-xl border border-gray-50 bg-gray-50/60 px-3.5 py-2.5">
              <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">{it.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-800">{it.value}</p>
            </div>
          ))}
        </div>

        <div className="my-4 h-px w-full bg-gray-100" />

        {/* Cüzdan özeti */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Wallet size={20} />
            </span>
            <div>
              <p className="text-xs font-bold text-gray-400">Bakiye</p>
              <p className="text-lg font-extrabold text-gray-900">
                {(Number(dash?.wallet?.balance) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <Trophy size={20} />
            </span>
            <div>
              <p className="text-xs font-bold text-gray-400">Toplam Kazanç</p>
              <p className="text-lg font-extrabold text-gray-900">
                {(Number(dash?.wallet?.total_earned) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </p>
            </div>
          </div>
        </div>

        {/* Kısayollar */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/account/success-report"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            <Trophy size={16} /> Başarı Raporu
          </Link>
          <Link
            href="/account/bank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <PackageIcon size={16} /> Banka Bilgilerim
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
          >
            <LogOut size={16} /> Çıkış Yap
          </button>
        </div>

        {/* İletişim */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-xs text-gray-400">
          {me?.email && (
            <span className="inline-flex items-center gap-1">
              <Mail size={13} /> {me.email}
            </span>
          )}
          {me?.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone size={13} /> {me.phone}
            </span>
          )}
          {me?.member_code && (
            <span className="inline-flex items-center gap-1">
              <Crown size={13} /> {me.member_code}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
