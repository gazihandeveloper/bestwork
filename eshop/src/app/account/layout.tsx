// ============================================
// BestWork - Hesap Layout
// ============================================
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/app/main-layout'
import { useAuth } from '@/contexts/AuthContext'

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto" />
        </div>
      </MainLayout>
    )
  }

  if (!isAuthenticated) return null

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-brand-500">Ana Sayfa</Link>
          <span>/</span>
          <span className="text-gray-600">Hesabım</span>
        </div>

        <div className="w-full">{children}</div>
      </div>
    </MainLayout>
  )
}
