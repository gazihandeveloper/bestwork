// ============================================
// BestWork - Sağlayıcılar (Providers)
// ============================================
'use client'

import { type ReactNode } from 'react'
import { I18nProvider } from '@/lib/i18n'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
    </I18nProvider>
  )
}
