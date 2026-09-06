// ============================================
// BestWork - Header Bileşeni
// ============================================
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Search,
  ShoppingCart,
  User,
  ChevronDown,
  Menu,
  X,
  Phone,
  MapPin,
  LogOut,
  Clock,
} from '@/lib/google-icons'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useI18n } from '@/lib/i18n'
import { get } from '@/lib/api'

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const date = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700 tabular-nums">
      <Clock size={12} className="text-brand-500" />
      {date} <span className="text-gray-300">|</span> {time}
    </span>
  )
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<{id:string,name:string,slug:string}[]>([])
  const pathname = usePathname()
  const { isAuthenticated, user, logout } = useAuth()
  const { itemCount } = useCart()
  const { lang, setLang } = useI18n()

  useEffect(() => {
    get<any>('/eshop/categories').then(res => {
      if (res.success) setCategories(Array.isArray(res.data) ? res.data : [])
    })
  }, [])

  const isActive = (path: string) => pathname === path

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Üst Bilgi Barı */}
      <div className="hidden lg:block bg-gray-50 border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-10 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <Link href="/about" className="hover:text-brand-500 transition-colors">
                Hakkımızda
              </Link>
              <Link href="/account" className="hover:text-brand-500 transition-colors">
                Hesabım
              </Link>
              <span className="text-gray-300">|</span>
              <span>%100 Güvenli Teslimat</span>
            </div>
            <div className="flex items-center gap-4">
              <LiveClock />
              <span className="text-gray-300">|</span>
              <Phone size={12} className="text-brand-500" />
              <span className="font-semibold text-gray-700">+90 850 555 0 888</span>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
                title="Dil / Language"
                aria-label="Dil / Language"
                className="inline-flex cursor-pointer items-center gap-1 font-bold uppercase text-gray-600 transition-colors hover:text-brand-500"
              >
                {lang} <ChevronDown size={10} className="inline" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ana Header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Mobile Menu Toggle - hamburger */}
          <button
            type="button"
            className="lg:hidden p-2 text-gray-600 hover:text-brand-500 z-50 relative"
            onClick={(e) => {
              e.stopPropagation()
              console.log('HAMBURGER TIKLANDI! Açık:', !mobileMenuOpen)
              setMobileMenuOpen(prev => !prev)
            }}
            aria-label="Menüyü aç"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight" style={{ color: '#29A56C' }}>
              BEST<span className="ml-0.5">WORK</span><span className="text-[0.6em] text-[#29A56C] font-bold ml-0.5 align-super relative top-[-0.5em]" style={{ fontFamily: "Georgia, serif" }}>®</span>
            </span>
          </Link>

          {/* Arama (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-12 pr-4 rounded-full bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
              />
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          {/* Sağ Aksiyonlar: Kullanıcı → Sepet → Çıkış */}
          <div className="flex items-center gap-1 lg:gap-3">
            {/* Arama (Mobile) */}
            <button
              className="lg:hidden p-2 text-gray-600 hover:text-brand-500"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search size={20} />
            </button>

            {/* Kullanıcı — dropdown yok; doğrudan Hesabım, ad BÜYÜK HARF */}
            {isAuthenticated ? (
              <Link
                href="/account"
                title="Hesabım"
                className="flex items-center gap-1.5 p-2 text-gray-700 hover:text-brand-500 transition-colors"
              >
                <User size={22} />
                <span className="hidden lg:block text-xs font-bold tracking-wide uppercase">
                  {user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Hesap'}
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1 p-2 text-gray-600 hover:text-brand-500 transition-colors"
              >
                <User size={22} />
                <span className="hidden lg:block text-xs">Giriş Yap</span>
              </Link>
            )}

            {/* Sepet */}
            <Link
              href="/cart"
              className="flex items-center gap-1 p-2 text-gray-600 hover:text-brand-500 transition-colors relative"
            >
              <div className="relative">
                <ShoppingCart size={22} />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-brand-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </div>
            </Link>

            {/* Çıkış — sadece ikon */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={logout}
                title="Çıkış Yap"
                aria-label="Çıkış Yap"
                className="p-2 text-gray-600 hover:text-red-500 transition-colors cursor-pointer"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Mobil Arama */}
        {searchOpen && (
          <div className="lg:hidden pb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-12 pr-4 rounded-full bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
              />
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigasyon (Desktop) */}
      <nav className="hidden lg:block bg-gray-800 text-white">
        <div className="container mx-auto px-4 relative">
          <div className="flex items-center justify-center h-12">
            {/* Kategoriler - sola sabitli */}
            <div className="absolute left-4 top-0 h-full">
              <div className="relative group h-full">
              <button className="flex items-center gap-2 h-full px-4 bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors rounded-t-lg">
                <Menu size={16} />
                Tüm Kategoriler
                <ChevronDown size={14} />
              </button>
              {/* Kategori Dropdown */}
              <div className="absolute top-full left-0 w-[600px] bg-white rounded-b-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {categories.length > 0 ? categories.map((cat) => (
                    <Link key={cat.id} href={`/products?category=${cat.slug || cat.id}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-500 rounded-lg transition-colors">
                      {cat.name}
                    </Link>
                  )) : (
                    <span className="text-sm text-gray-400 px-3 py-2">Kategori bulunamadı</span>
                  )}
                </div>
              </div>
            </div>
            </div>

            {/* Ana Menü - ortalanmış */}
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                  isActive('/') ? 'text-brand-400' : 'text-white hover:text-brand-400'
                }`}
              >
                Ana Sayfa
              </Link>
              <Link
                href="/products"
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                  pathname.startsWith('/eshop/products') ? 'text-brand-400' : 'text-white hover:text-brand-400'
                }`}
              >
                Ürünler
              </Link>
              <Link
                href="/about"
                className="px-4 py-2 text-sm font-bold text-white hover:text-brand-400 rounded-lg transition-colors"
              >
                Hakkımızda
              </Link>
              <Link
                href="/contact"
                className="px-4 py-2 text-sm font-bold text-white hover:text-brand-400 rounded-lg transition-colors"
              >
                İletişim
              </Link>
            </div>

            {/* Telefon - sağa sabitli */}
            <div className="absolute right-4 top-0 h-full flex items-center gap-2 text-sm">
              <Phone size={14} className="text-brand-400" />
              <span className="font-bold">1900 - 888</span>
              <span className="text-gray-400 text-xs">7/24 Destek</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobil Menü */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100]" style={{ pointerEvents: 'auto' }}>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed left-0 top-0 bottom-0 w-80 bg-white shadow-2xl overflow-y-auto z-[101]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xl font-extrabold tracking-tight" style={{ color: '#29A56C' }}>
                BEST<span className="ml-0.5">WORK</span><span className="text-[0.6em] text-[#29A56C] font-bold ml-0.5 align-super relative top-[-0.5em]" style={{ fontFamily: "Georgia, serif" }}>®</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              <Link
                href="/"
                className="block px-4 py-3 text-sm font-bold text-gray-700 hover:bg-brand-50 hover:text-brand-500 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Ana Sayfa
              </Link>
              <Link
                href="/products"
                className="block px-4 py-3 text-sm font-bold text-gray-700 hover:bg-brand-50 hover:text-brand-500 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Ürünler
              </Link>
              <Link
                href="/cart"
                className="block px-4 py-3 text-sm font-bold text-gray-700 hover:bg-brand-50 hover:text-brand-500 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sepet
              </Link>
              <Link
                href="/account"
                className="block px-4 py-3 text-sm font-bold text-gray-700 hover:bg-brand-50 hover:text-brand-500 rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Hesabım
              </Link>
              <hr className="my-2" />
              <Link
                href="/about"
                className="block px-4 py-3 text-sm text-gray-600 hover:bg-brand-50 hover:text-brand-500 rounded-lg"
              >
                Hakkımızda
              </Link>
              <Link
                href="/contact"
                className="block px-4 py-3 text-sm text-gray-600 hover:bg-brand-50 hover:text-brand-500 rounded-lg"
              >
                İletişim
              </Link>
            </nav>
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <MapPin size={14} />
                Adres: İstanbul, Türkiye
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                <Phone size={14} />
                +90 850 555 0 888
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
