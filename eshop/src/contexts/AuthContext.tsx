// ============================================
// BestWork - Auth Context (JWT Yönetimi)
// ============================================
'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { get, post, tokenStorage } from '@/lib/api'
import type { User, AuthTokens, ApiResponse } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  fullName: string
  phone?: string
  /** Referans kodu (TR90...) — opsiyonel sponsor */
  sponsor?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  /** Kullanıcı bilgilerini getir */
  const refreshUser = useCallback(async () => {
    const token = tokenStorage.getAccess()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await get<User>('/eshop/users/me')
      if (res.success && res.data) {
        const user = {
          ...res.data,
          fullName: [res.data.first_name, res.data.last_name].filter(Boolean).join(' ') || res.data.email,
        }
        setUser(user)
      } else {
        tokenStorage.clear()
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // İlk yüklemede token varsa kullanıcıyı getir
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  /** Giriş yap */
  const login = async (email: string, password: string) => {
    try {
      const res = await post<{ access_token: string; refresh_token: string; user: User }>('/eshop/auth/login', {
        email,
        password,
      })
      if (res.success) {
        // Backend snake_case dönüyor, camelCase'e çevir
        tokenStorage.setTokens(res.data.access_token, res.data.refresh_token)
        // Backend first_name + last_name dönüyor, fullName ekle
        const user = {
          ...res.data.user,
          fullName: [res.data.user.first_name, res.data.user.last_name].filter(Boolean).join(' ') || res.data.user.email,
        }
        setUser(user)
        return { success: true }
      }
      return { success: false, error: res.error || 'Giriş başarısız' }
    } catch {
      return { success: false, error: 'Bağlantı hatası. Backend çalışıyor mu?' }
    }
  }

  /** Kayıt ol */
  const register = async (data: RegisterData) => {
    try {
      // Backend snake_case bekliyor: first_name, last_name, confirm_password
      const payload = {
        email: data.email,
        password: data.password,
        confirm_password: data.password,
        first_name: data.fullName?.split(' ')[0] || '',
        last_name: data.fullName?.split(' ').slice(1).join(' ') || '',
        phone: data.phone || '',
        sponsor: data.sponsor?.trim() || undefined,
      }
      const res = await post<{ access_token: string; refresh_token: string; user: User }>('/eshop/auth/register', payload)
      if (res.success) {
        tokenStorage.setTokens(res.data.access_token, res.data.refresh_token)
        const user = {
          ...res.data.user,
          fullName: [res.data.user.first_name, res.data.user.last_name].filter(Boolean).join(' ') || res.data.user.email,
        }
        setUser(user)
        return { success: true }
      }
      return { success: false, error: res.error || 'Kayıt başarısız' }
    } catch {
      return { success: false, error: 'Bağlantı hatası. Backend çalışıyor mu?' }
    }
  }

  /** Çıkış yap */
  const logout = () => {
    tokenStorage.clear()
    setUser(null)
    router.push('/')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
