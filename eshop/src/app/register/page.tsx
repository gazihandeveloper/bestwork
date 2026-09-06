// ============================================
// BestWork - Kayıt Sayfası
// ============================================
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, UserPlus } from '@/lib/google-icons'
import { MainLayout } from '@/app/main-layout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', passwordConfirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sponsor, setSponsor] = useState('')

  // Referans kodu (varsa): /register?ref=TR90...
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref') || ''
    setSponsor(ref.trim().toUpperCase())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.passwordConfirm) {
      toast.error('Şifreler eşleşmiyor')
      return
    }
    if (form.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı')
      return
    }
    setLoading(true)
    const result = await register({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      phone: form.phone,
      sponsor: sponsor || undefined,
    })
    setLoading(false)
    if (result.success) {
      toast.success('Kayıt başarılı!')
      router.push('/')
    } else {
      toast.error(result.error || 'Kayıt başarısız')
    }
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="text-center mb-8">
              <span className="text-3xl font-extrabold tracking-tight" style={{ color: '#29A56C' }}>
                BestWork<span className="text-[0.55em] text-gray-700 font-bold ml-0.5 align-super relative top-[-0.4em]" style={{ fontFamily: "serif" }}>®</span>
              </span>
              <h1 className="text-2xl font-bold text-gray-800">Hesap Oluştur</h1>
              <p className="text-sm text-gray-500 mt-1">BestWork&apos;a katılın</p>
              {sponsor && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                  👤 Referans: {sponsor}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Ad Soyad"
                placeholder="Adınız Soyadınız"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
              <Input
                label="E-posta Adresi"
                type="email"
                placeholder="ornek@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                label="Telefon (İsteğe bağlı)"
                type="tel"
                placeholder="05XX XXX XX XX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <div className="relative">
                <Input
                  label="Şifre"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="En az 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <Input
                label="Şifre Tekrar"
                type="password"
                placeholder="Şifrenizi tekrar girin"
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                required
              />

              <div className="flex items-start gap-2 text-sm text-gray-500">
                <input type="checkbox" required className="mt-0.5 rounded border-gray-300 text-brand-500 focus:ring-brand-300" />
                <span>
                  <Link href="/terms" className="text-brand-500 hover:underline">Kullanım Şartları</Link> ve{' '}
                  <Link href="/privacy" className="text-brand-500 hover:underline">Gizlilik Politikası</Link>nı kabul ediyorum.
                </span>
              </div>

              <Button type="submit" variant="brand" size="lg" fullWidth loading={loading}>
                <UserPlus size={18} />
                Kayıt Ol
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Zaten hesabınız var mı?{' '}
                <Link href="/login" className="text-brand-500 font-bold hover:underline">
                  Giriş Yap
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
