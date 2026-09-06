// ============================================
// BestWork - Şifre Değiştir (BestWork)
// ============================================
'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { House, Lock, LogOut } from '@/lib/google-icons'
import AccountTopMenu from '@/components/AccountTopMenu'
import { useAuth } from '@/contexts/AuthContext'
import { rawPost } from '@/lib/raw'
import toast from 'react-hot-toast'

export default function ChangePasswordPage() {
  const { logout } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!oldPassword) {
      toast.error('Mevcut şifre zorunludur.')
      return
    }
    if (newPassword.length < 12) {
      toast.error('Yeni şifre en az 12 karakter olmalıdır.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor.')
      return
    }
    setSaving(true)
    try {
      await rawPost<{ message?: string }>('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      })
      toast.success('Şifreniz değiştirildi.')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Şifre değiştirilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-colors'

  return (
    <div className="space-y-4">
      <AccountTopMenu />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-gray-900">Şifre Değiştir</h1>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
        >
          <House size={16} /> Anasayfa
        </Link>
      </div>

      <div className="flex justify-center">
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Lock size={20} />
            </span>
            <div>
              <h2 className="font-bold text-gray-900">Hesap Güvenliği</h2>
              <p className="text-xs text-gray-400">Güvenliğiniz için mevcut şifrenizi doğrulayın.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Mevcut Şifre</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Mevcut şifreniz"
                className={inputCls}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Yeni Şifre</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 12 karakter"
                className={inputCls}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Yeni Şifre (Tekrar)</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifrenizi tekrar girin"
                className={inputCls}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-1 cursor-pointer rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut size={16} /> Çıkış Yap
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
