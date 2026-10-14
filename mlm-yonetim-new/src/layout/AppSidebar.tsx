"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { BoxIcon, CalendarDaysIcon, ChevronDownIcon, CircleUserIcon, ClockIcon, CubeIcon, DollarSignIcon, GearIcon, HouseIcon } from "@/components/icons";
import NetworkIcon from "lucide-react/dist/esm/icons/network.mjs";
import GiftIcon from "lucide-react/dist/esm/icons/gift.mjs";
import { getMyMenuPermissions } from "@/lib/api";
import { NAV_ITEMS, NAV_PATHS } from "@/lib/nav";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// Üst seviye menü ikonları (menü verisi src/lib/nav.ts içinde).
const NAV_ICONS: Record<string, React.ReactNode> = {
  Anasayfa: <HouseIcon />,
  "E-Ticaret İşlemleri": <CubeIcon />,
  "Üye Hizmetleri": <CircleUserIcon />,
  "Müşteri Hizmetleri": <CircleUserIcon />,
  Muhasebe: <DollarSignIcon />,
  Raporlar: <CalendarDaysIcon />,
  "Ağaç Yönetimi": <NetworkIcon />,
  "Ay Sonu İşlemleri": <ClockIcon />,
  Ayarlar: <GearIcon />,
  Depo: <BoxIcon />,
  "Kampanya ve Promosyonlar": <GiftIcon />,
};

const navItems: NavItem[] = NAV_ITEMS.map((n) => ({
  name: n.name,
  icon: NAV_ICONS[n.name] ?? null,
  path: n.path,
  subItems: n.subItems,
}));

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  // Menü izinleri (RBAC): admin/süper admin "*" alır; çalışanlar yalnızca
  // kendilerine atanmış menüleri görür.
  const [allowedMenus, setAllowedMenus] = useState<string[] | null>(null);
  const [role, setRole] = useState("");
  useEffect(() => {
    getMyMenuPermissions()
      .then((d) => {
        setAllowedMenus(d.menus || []);
        setRole(d.role || "");
      })
      .catch(() => setAllowedMenus([]));
  }, []);

  const visibleNavItems = React.useMemo(() => {
    // İzinler yüklenene kadar HİÇ menü gösterme (yenilemede hepsi görünmesin).
    if (!allowedMenus) return [];
    if (allowedMenus.includes("*")) return navItems;
    const base = role === "staff" ? navItems.filter((n) => n.path !== "/") : navItems;
    return base
      .map((nav) => {
        if (nav.subItems) {
          const subs = nav.subItems.filter((s) => allowedMenus.includes(s.path));
          return subs.length ? { ...nav, subItems: subs } : null;
        }
        return nav.path && allowedMenus.includes(nav.path) ? nav : null;
      })
      .filter(Boolean) as NavItem[];
  }, [allowedMenus, role]);

  // İzni olmayan bir menü sayfasına elle gidilirse anasayfaya yönlendir.
  useEffect(() => {
    if (!allowedMenus || allowedMenus.includes("*") || !pathname) return;
    const known: string[] = [];
    NAV_ITEMS.forEach((n) => {
      if (n.subItems) n.subItems.forEach((s) => known.push(s.path));
      else if (n.path) known.push(n.path);
    });
    if (known.includes(pathname) && !allowedMenus.includes(pathname)) {
      const firstAllowed = NAV_PATHS.find((p) => p !== "/" && allowedMenus.includes(p));
      if (firstAllowed) router.replace(firstAllowed);
    }
  }, [allowedMenus, pathname, router]);

  const renderMenuItems = (items: NavItem[], menuType: string) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: string;
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({ type: "main", index });
            submenuMatched = true;
          }
        });
      }
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: string) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-[#1E293B] dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered
            ? "lg:justify-center"
            : "lg:justify-center justify-center"
        }`}
      >
        <Link href="/" className="flex w-full justify-center">
          {isExpanded || isHovered || isMobileOpen ? (
            <span className="flex flex-col items-center text-center leading-none">
              {/* Marka logosu — e-ticaret sitesindeki logo ile aynı (Helvetica + ince kontur), ® Georgia serif */}
              <span
                className="text-[26px] font-extrabold tracking-tight text-[#101828] dark:text-white"
                style={{ fontFamily: "Helvetica, Arial, sans-serif", WebkitTextStroke: "0.5px currentColor" }}
              >
                BEST<span className="ml-0.5">WORK</span>
                <span
                  className="relative top-[-0.5em] ml-0.5 align-super text-[0.6em] font-bold text-[#101828] dark:text-white"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  ®
                </span>
              </span>
              <span className="mt-1.5 -translate-x-2 text-[12px] font-bold tracking-[0.18em] text-gray-700 dark:text-gray-300">
                YÖNETİM MERKEZİ
              </span>
            </span>
          ) : (
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-500 text-sm font-black text-white">
              B
            </span>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">{renderMenuItems(visibleNavItems, "main")}</nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
