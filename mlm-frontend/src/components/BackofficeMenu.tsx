"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Landmark,
  Users,
  Lock,
  Receipt,
  Medal,
  Network,
  ShoppingCart,
  Package,
  Home,
  Mail,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface MenuItemDef {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface MenuGroup {
  title: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  items: MenuItemDef[];
}

const groups: MenuGroup[] = [
  {
    title: "Kişisel",
    icon: <User />,
    items: [
      { path: "/profile", label: "Üyelik Bilgilerim", icon: <User /> },
      { path: "/beneficiary", label: "Varis Bilgileri", icon: <Users /> },
      { path: "/bank", label: "Banka Bilgilerim", icon: <Landmark /> },
      { path: "/sponsored", label: "Sponsor Olduklarım", icon: <Users /> },
      { path: "/change-password", label: "Şifre Değiştir", icon: <Lock /> },
    ],
  },
  {
    title: "Prim",
    icon: <Receipt />,
    items: [
      { path: "/commissions", label: "Prim Detayları", icon: <Receipt /> },
      { path: "/leadership-bonus", label: "Liderlik Primi", icon: <Medal /> },
      { path: "/binary-transactions", label: "Binary Hareketleri", icon: <Network /> },
      { path: "/career", label: "Kariyer Takibi", icon: <Medal /> },
      { path: "/tree", label: "Binary Ağacı", icon: <Network /> },
      { path: "/sponsor-tree", label: "Referans ve Ekip Ağacı", icon: <Users /> },
      { path: "/pending", label: "Yerleşim Bekleyenler", icon: <Users /> },
    ],
  },
  {
    title: "İşlemlerim",
    icon: <ShoppingCart />,
    items: [
      { path: "/shop", label: "Alışveriş", icon: <ShoppingCart /> },
      { path: "/orders", label: "Siparişlerim", icon: <Package /> },
      { path: "/payment-notifications", label: "EFT/HAVALE Bildirimleri", icon: <Landmark /> },
      { path: "/retail-earnings", label: "Müşteri Kazancı", icon: <Receipt /> },
      { path: "/opportunities", label: "İş Fırsatları", icon: <Medal /> },
    ],
  },
  {
    title: "İletişim",
    icon: <Mail />,
    items: [{ path: "/contact", label: "Destek / İletişim", icon: <Mail /> }],
  },
];

// Backoffice yatay menüsü — grup dropdown'ları, aktif öğe yeşil vurgulu.
export default function BackofficeMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const visibleGroups = groups.filter((g) => !g.adminOnly || isAdmin);
  const openMenuGroup = openGroup
    ? visibleGroups.find((g) => g.title === openGroup) ?? null
    : null;

  const groupActive = (g: MenuGroup) =>
    g.items.some((item) => {
      const base = item.path.split("?")[0];
      return pathname === base || pathname.startsWith(base + "/");
    });

  const itemSelected = (path: string) => {
    const base = path.split("?")[0];
    return pathname === base || pathname.startsWith(base + "/");
  };

  const closeMenu = () => {
    setOpenGroup(null);
    setMenuPos(null);
  };

  // Grup butonunun altına, viewport'a sabitlenmiş panel açar.
  const toggleGroup = (title: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openGroup === title) {
      closeMenu();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 264));
    setMenuPos({ top: rect.bottom + 8, left });
    setOpenGroup(title);
  };

  const handleNav = (path: string) => {
    closeMenu();
    router.push(path);
  };

  // Dışarı tıklama / Escape / kaydırma / yeniden boyutlandırma: dropdown'ı kapat.
  useEffect(() => {
    if (!openGroup) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    const onScrollOrResize = () => closeMenu();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [openGroup]);

  const buttonBase =
    "flex shrink-0 cursor-pointer items-center gap-2 rounded px-3.5 py-2 text-sm whitespace-nowrap transition-colors [&_svg]:size-4 [&_svg]:shrink-0";

  return (
    <div ref={rootRef}>
      {/* Yatay menü çubuğu — içerik sığınca ortalanır, taşınca yatay kaydırılır */}
      <div className="bg-card mb-2 overflow-x-auto rounded border border-border p-1.5 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-fit items-center gap-1">
          {/* Anasayfa — düz buton, dropdown'suz */}
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className={cn(
              buttonBase,
              pathname === "/dashboard"
                ? "bg-primary font-semibold text-white hover:bg-primary-dark"
                : "text-foreground hover:bg-accent"
            )}
          >
            <Home />
            Anasayfa
          </button>

          {visibleGroups.map((g) => {
            const active = groupActive(g);
            const open = openGroup === g.title;
            return (
              <div key={g.title}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={open}
                  onClick={(e) => toggleGroup(g.title, e)}
                  className={cn(
                    buttonBase,
                    active
                      ? "bg-primary font-semibold text-white hover:bg-primary-dark"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  {g.icon}
                  {g.title}
                  <ChevronDown
                    className={cn("transition-transform duration-200", open && "rotate-180")}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Açık grup dropdown paneli */}
      {openMenuGroup && menuPos && (
        <div
          role="menu"
          aria-label={`${openMenuGroup.title} menüsü`}
          style={{ top: menuPos.top, left: menuPos.left }}
          className="bg-card fixed z-50 min-w-60 max-w-[calc(100vw-2rem)] animate-in fade-in zoom-in-95 rounded border border-border p-1 shadow-lg duration-150"
        >
          {openMenuGroup.items.map((item) => {
            const selected = itemSelected(item.path);
            return (
              <button
                key={item.path}
                type="button"
                role="menuitem"
                onClick={() => handleNav(item.path)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
                  selected
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground hover:bg-accent"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
