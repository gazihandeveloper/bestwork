// ============================================
// BestWork - Üst Menü (backoffice menüsü)
// Kişisel grubu BestWork içi sayfalara, diğerleri /bestwork paneline gider.
// ============================================
'use client'

import { useEffect, useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react'
import { usePathname } from 'next/navigation'
import {
  House,
  User,
  Users,
  Receipt,
  Mail,
  ChevronDown,
  Landmark,
  Trophy,
  Lock,
  ShoppingCart,
  Package,
  Network,
  Megaphone,
} from '@/lib/google-icons'

const PANEL_BASE = 'https://mahmutgazihanarslan.com.tr/bestwork'
const APP_BASE = ''

interface MenuItemDef {
  path: string
  label: string
  icon: ReactNode
  /** BestWork içinde karşılığı varsa buraya gider (örn. /account/profile) */
  eshopPath?: string
}

interface MenuGroup {
  title: string
  icon: ReactNode
  items: MenuItemDef[]
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: 'Kişisel',
    icon: <User size={16} />,
    items: [
      { path: '/eshop/profile', eshopPath: '/account/profile', label: 'Üyelik Bilgilerim', icon: <User size={16} /> },
      { path: '/beneficiary', eshopPath: '/account/beneficiary', label: 'Varis Bilgileri', icon: <Users size={16} /> },
      { path: '/bank', eshopPath: '/account/bank', label: 'Banka Bilgilerim', icon: <Landmark size={16} /> },
      { path: '/eshop/sponsored', eshopPath: '/account/sponsored', label: 'Sponsor Olduklarım', icon: <Users size={16} /> },
      { path: '/success-report', eshopPath: '/account/success-report', label: 'Başarı Raporu', icon: <Trophy size={16} /> },
      { path: '/change-password', eshopPath: '/account/change-password', label: 'Şifre Değiştir', icon: <Lock size={16} /> },
    ],
  },
  {
    title: 'Prim Yönetimi',
    icon: <Receipt size={16} />,
    items: [
      { path: '/commissions', eshopPath: '/account/commissions', label: 'Prim Detayları', icon: <Receipt size={16} /> },
      { path: '/leadership-bonus', eshopPath: '/account/leadership-bonus', label: 'Liderlik Primi', icon: <Trophy size={16} /> },
      { path: '/binary-transactions', eshopPath: '/account/binary-transactions', label: 'Binary Hareketleri', icon: <Network size={16} /> },
      { path: '/user/career', eshopPath: '/account/career', label: 'Kariyer Takibi', icon: <Trophy size={16} /> },
      { path: '/tree', eshopPath: '/account/tree', label: 'Binary Ağacı', icon: <Network size={16} /> },
      { path: '/sponsor-tree', eshopPath: '/account/sponsor-tree', label: 'Referans ve Ekip Ağacı', icon: <Users size={16} /> },
      { path: '/pending', eshopPath: '/account/pending', label: 'Yerleşim Bekleyenler', icon: <Users size={16} /> },
    ],
  },
  {
    title: 'İşlemlerim',
    icon: <ShoppingCart size={16} />,
    items: [
      { path: '/shop', eshopPath: '/products', label: 'Alışveriş', icon: <ShoppingCart size={16} /> },
      { path: '/eshop/orders', eshopPath: '/account/orders', label: 'Siparişlerim', icon: <Package size={16} /> },
      { path: '/payment-notifications', eshopPath: '/account/payment-notifications', label: 'EFT/HAVALE Bildirimleri', icon: <Landmark size={16} /> },
      { path: '/retail-earnings', eshopPath: '/account/retail-earnings', label: 'Müşteri Kazancı', icon: <Receipt size={16} /> },
      { path: '/opportunities', eshopPath: '/account/opportunities', label: 'İş Fırsatları', icon: <Megaphone size={16} /> },
    ],
  },
  {
    title: 'İletişim',
    icon: <Mail size={16} />,
    items: [{ path: '/contact', eshopPath: '/account/contact', label: 'Destek / İletişim', icon: <Mail size={16} /> }],
  },
]

/** Yatay üst menü — grup dropdown'ları, aktif öğe mavi vurgulu. */
export default function AccountTopMenu() {
  const pathname = usePathname() ?? ''
  const rawPath = pathname.startsWith(APP_BASE) ? pathname.slice(APP_BASE.length) || '/' : pathname
  const base = rawPath.split('?')[0]
  const isHome = base === '/account' || base === '/account/'

  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const openMenuGroup = openGroup ? MENU_GROUPS.find((g) => g.title === openGroup) ?? null : null

  const groupActive = (g: MenuGroup) =>
    g.items.some((it) => {
      const p = it.eshopPath || it.path
      return base === p || base.startsWith(p + '/')
    })

  const itemSelected = (it: MenuItemDef) => {
    const p = it.eshopPath || it.path
    return base === p || base.startsWith(p + '/')
  }

  const closeMenu = () => {
    setOpenGroup(null)
    setMenuPos(null)
  }

  const toggleGroup = (title: string, e: ReactMouseEvent<HTMLButtonElement>) => {
    if (openGroup === title) {
      closeMenu()
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 280))
    setMenuPos({ top: rect.bottom + 8, left })
    setOpenGroup(title)
  }

  // Dışarı tıklama / Escape / kaydırma / boyut değişimi: dropdown'ı kapat
  useEffect(() => {
    if (!openGroup) return
    const onPointerDown = (ev: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) closeMenu()
    }
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') closeMenu()
    }
    const onScrollOrResize = () => closeMenu()
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [openGroup])

  const pillBase =
    'flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm whitespace-nowrap transition-colors [&_svg]:size-4 [&_svg]:shrink-0'

  return (
    <div ref={rootRef}>
      {/* Yatay menü çubuğu — içerik sığınca ortalanır, taşınca yatay kayar */}
      <div className="mb-3 overflow-x-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-fit items-center gap-1">
          {/* Anasayfa */}
          <button
            type="button"
            onClick={() => {
              window.location.href = `${APP_BASE}/account`
            }}
            className={`${pillBase} ${
              isHome ? 'bg-brand-600 font-semibold text-white hover:bg-brand-700' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <House size={16} /> Anasayfa
          </button>

          {MENU_GROUPS.map((g) => {
            const active = groupActive(g)
            const open = openGroup === g.title
            return (
              <div key={g.title}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={open}
                  onClick={(e) => toggleGroup(g.title, e)}
                  className={`${pillBase} ${
                    active
                      ? 'bg-brand-600 font-semibold text-white hover:bg-brand-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {g.icon}
                  {g.title}
                  <ChevronDown size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Açık grup dropdown paneli */}
      {openMenuGroup && menuPos && (
        <div
          role="menu"
          aria-label={`${openMenuGroup.title} menüsü`}
          style={{ top: menuPos.top, left: menuPos.left }}
          className="fixed z-50 min-w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-100 bg-white p-1 shadow-lg"
        >
          {openMenuGroup.items.map((item) => {
            const selected = itemSelected(item)
            return (
              <button
                key={item.path}
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu()
                  window.location.href = item.eshopPath ? `${APP_BASE}${item.eshopPath}` : `${PANEL_BASE}${item.path}`
                }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors [&_svg]:size-4 [&_svg]:shrink-0 ${
                  selected ? 'bg-brand-50 font-semibold text-brand-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
