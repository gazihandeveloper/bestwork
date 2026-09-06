// ============================================
// BestWork - Admin Layout
// ============================================
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Users,
  BarChart3,
  Tag,
  FileText,
  Palette,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut,
  PackagePlus,
} from '@/lib/google-icons'

interface SidebarLink {
  label: string
  href?: string
  icon?: any
  children?: SidebarLink[]
}

const sidebarLinks: SidebarLink[] = [
  {
    label: 'Anasayfa',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Ürün Yönetimi',
    href: '/admin/products',
    icon: ShoppingBag,
    children: [
      { label: 'Tüm Ürünler', href: '/admin/products/list' },
      { label: 'Ürün Ekle', href: '/admin/products/new' },
      { label: 'Kategoriler', href: '/admin/categories' },
      { label: 'Yorumlar', href: '/admin/reviews' },
    ],
  },
  {
    label: 'Sipariş Yönetimi',
    icon: ShoppingCart,
    children: [
      { label: 'Tüm Siparişler', href: '/admin/orders' },
      { label: 'Canlı Sepet İzleme', href: '/admin/orders/carts' },
      { label: 'İade Talepleri', href: '/admin/orders/returns' },
      { label: 'Yeni Sipariş Oluştur', href: '/admin/orders/new' },
    ],
  },
  {
    label: 'Müşteri Yönetimi',
    icon: Users,
    children: [
      { label: 'Müşteri Listesi', href: '/admin/users' },
      { label: 'Çevrimiçi Müşteriler', href: '/admin/users/online' },
      { label: 'Müşteri Onayları', href: '/admin/users/approvals' },
    ],
  },
  {
    label: 'Raporlar',
    icon: BarChart3,
    children: [
      { label: 'Genel Raporlama', href: '/admin/reports' },
      { label: 'Detaylı Raporlama', href: '/admin/reports/detailed' },
      { label: 'Tahsilat Raporları', href: '/admin/reports/collections' },
    ],
  },
  {
    label: 'Kampanyalar',
    icon: Tag,
    children: [
      { label: 'İndirim Kuponları', href: '/admin/campaigns/coupons' },
      { label: 'Promosyonlar', href: '/admin/campaigns/promotions' },
      { label: 'Hediye Ürünler', href: '/admin/campaigns/gifts' },
      { label: 'Toplu İndirim', href: '/admin/campaigns/bulk-discount' },
    ],
  },
  {
    label: 'Sayfa & Blog',
    icon: FileText,
    children: [
      { label: 'Kurumsal Sayfalar', href: '/admin/pages/corporate' },
      { label: 'Sistem Sayfaları', href: '/admin/pages/system' },
      { label: 'Blog Yazıları', href: '/admin/blog' },
      { label: 'Blog Kategorileri', href: '/admin/blog/categories' },
      { label: 'Blog Yorumları', href: '/admin/blog/comments' },
    ],
  },
  {
    label: 'Tasarım',
    icon: Palette,
    children: [
      { label: 'Tasarım Düzenle', href: '/admin/design/theme' },
      { label: 'Menü Yönetimi', href: '/admin/design/menu' },
      { label: 'Footer', href: '/admin/design/footer' },
      { label: 'Stil Yönetimi', href: '/admin/design/styles' },
      { label: 'Özel CSS', href: '/admin/design/custom-css' },
    ],
  },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading, logout } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, user, router])

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((m) => m !== label)
        : [...prev, label]
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 text-white transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight" style={{ color: '#29A56C' }}>
                BEST<span className="text-emerald-400 ml-0.5">WORK</span><span className="text-[0.6em] text-emerald-400 font-bold ml-0.5 align-super relative top-[-0.5em]" style={{ fontFamily: "Georgia, serif" }}>®</span>
              </span>
            <span className="text-xs text-gray-400 font-bold">Admin</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
          {sidebarLinks.map((link) => (
            <SidebarMenuItem key={link.label} link={link} expanded={expandedMenus} onToggle={toggleMenu} onClose={() => setSidebarOpen(false)} />
          ))}

          <hr className="border-gray-800 my-3" />

          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ShoppingBag size={18} />
            Mağazaya Git
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 w-full transition-colors"
          >
            <LogOut size={18} />
            Çıkış Yap
          </button>
        </nav>
      </aside>

      {/* Ana İçerik */}
      <div className="lg:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu size={22} />
            </button>

            <div className="hidden lg:block">
              <h1 className="text-sm font-bold text-gray-500">
                Hoş geldiniz, <span className="text-gray-800 font-semibold">{user?.fullName}</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-brand-600">
                    {user?.fullName?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-gray-800">{user?.fullName || user?.email}</p>
                  <p className="text-xs text-gray-400">Admin</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Sayfa İçeriği */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

// Recursive sidebar menu item
function SidebarMenuItem({ link, expanded, onToggle, onClose, depth = 0 }: {
  link: SidebarLink
  expanded: string[]
  onToggle: (label: string) => void
  onClose: () => void
  depth?: number
}) {
  const Icon = link.icon
  const isExpanded = expanded.includes(link.label)
  const hasChildren = link.children && link.children.length > 0

  if (hasChildren) {
    return (
      <div>
        <button onClick={() => onToggle(link.label)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
          {Icon && <Icon size={18} />}
          <span className="flex-1 text-left">{link.label}</span>
          <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-0.5">
            {link.children!.map((child) => (
              <SidebarMenuItem key={child.label} link={child} expanded={expanded} onToggle={onToggle} onClose={onClose} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Leaf node with valid href
  if (link.href && link.href !== '#') {
    return (
      <Link href={link.href} onClick={onClose}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
        {Icon && <Icon size={18} />}
        {depth > 0 && <span className="w-4" />}
        {link.label}
      </Link>
    )
  }

  // Coming soon (href: '#')
  return (
    <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 cursor-default">
      {Icon && <Icon size={18} />}
      {depth > 0 && <span className="w-4" />}
      {link.label}
      <span className="text-[9px] text-gray-600 ml-auto">yakında</span>
    </span>
  )
}
