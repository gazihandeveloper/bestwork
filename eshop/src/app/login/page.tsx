// ============================================
// BestWork - Giriş Sayfası
// ============================================
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, LogIn } from '@/lib/google-icons'
import { MainLayout } from '@/app/main-layout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('best')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Kullanıcı adı ve şifre gerekli')
      return
    }
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      toast.success('Giriş başarılı!')
      router.push('/')
    } else {
      toast.error(result.error || 'Giriş başarısız')
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
              <h1 className="text-2xl font-bold text-gray-800">Hoş Geldiniz</h1>
              <p className="text-sm text-gray-500 mt-1">Hesabınıza giriş yapın</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Kullanıcı Adı"
                type="text"
                placeholder="best"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="relative">
                <Input
                  label="Şifre"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-brand-500 focus:ring-brand-300" />
                  <span className="text-gray-600">Beni Hatırla</span>
                </label>
                <Link href="/forgot-password" className="text-brand-500 hover:underline">
                  Şifremi Unuttum
                </Link>
              </div>

              <Button type="submit" variant="brand" size="lg" fullWidth loading={loading}>
                <LogIn size={18} />
                Giriş Yap
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Hesabınız yok mu?{' '}
                <Link href="/register" className="text-brand-500 font-bold hover:underline">
                  Kayıt Ol
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
