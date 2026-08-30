"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/MaterialIcon";
import { usePanelAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavChild = { text: string; href: string };
type NavGroup = { text: string; icon: ReactNode; children: NavChild[] };

const NAV_GROUPS: NavGroup[] = [
  {
    text: "E-Ticaret",
    icon: <MaterialIcon name="Package" className="bw-nav-icon" size={16} />,
    children: [
      { text: "Slider Yönetimi", href: "/slider" },
      { text: "Güvenlik Şeridi", href: "/guvenlik-seridi" },
      { text: "Kategoriler", href: "/kategoriler" },
      { text: "Ürünler", href: "/urunler" },
      { text: "Seviyeler", href: "/paketler" },
      { text: "Siparişler", href: "/siparisler" },
    ],
  },
  {
    text: "MLM & Ağaç",
    icon: <MaterialIcon name="Network" className="bw-nav-icon" size={16} />,
    children: [
      { text: "Üyeler", href: "/uyeler" },
      { text: "Ağaç Görüntüleyici", href: "/agac" },
      { text: "Bekleyenler", href: "/bekleyenler" },
      { text: "Kariyer Yönetimi", href: "/rutbeler" },
    ],
  },
  {
    text: "Finans & Cüzdan",
    icon: <MaterialIcon name="Wallet" className="bw-nav-icon" size={16} />,
    children: [
      { text: "Cüzdanlar", href: "/cuzdanlar" },
      { text: "Bonus Motoru", href: "/bonus" },
      { text: "Flashout & Limitler", href: "/flashout" },
      { text: "Çekim Talepleri", href: "/cekimler" },
    ],
  },
  {
    text: "Güvenlik & Raporlama",
    icon: <MaterialIcon name="ShieldAlert" className="bw-nav-icon" size={16} />,
    children: [
      { text: "Fraud & Multi-Hesap", href: "/guvenlik" },
      { text: "Raporlar & Denetim", href: "/raporlar" },
    ],
  },
  {
    text: "CMS & Sistem",
    icon: <MaterialIcon name="campaign" className="bw-nav-icon" size={16} />,
    children: [
      { text: "Duyurular", href: "/duyurular" },
      { text: "Kurumsal & Footer", href: "/kurumsal" },
      { text: "Sistem Ayarları", href: "/ayarlar" },
    ],
  },
];

export default function PanelLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { logout } = usePanelAuth();
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isGroupActive = (g: NavGroup) => g.children.some((c) => pathname.startsWith(c.href));

  // Menü dışına tıklanınca açılırları kapat
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".bw-nav-group")) setOpenGroup(null);
      if (!t.closest(".bw-nav")) setMobileOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="app-wrapper">
      {/* Yatay menü çubuğu */}
      <nav className="bw-nav" aria-label="Ana menü">
        <div className="bw-nav-inner">
          <Link href="/" className="bw-nav-brand">
            BestWork Admin Paneli
          </Link>

          <div className={cn("bw-nav-menu", mobileOpen && "open")}>
            <Link
              href="/"
              className={cn("bw-nav-item", pathname === "/" && "active")}
              onClick={() => setMobileOpen(false)}
            >
              <MaterialIcon name="LayoutDashboard" className="bw-nav-icon" size={16} />
              <span>Genel Bakış</span>
            </Link>

            {NAV_GROUPS.map((g, i) => {
              const open = openGroup === i;
              return (
                <div key={g.text} className="bw-nav-group">
                  <button
                    type="button"
                    className={cn("bw-nav-item", isGroupActive(g) && "active", open && "bw-nav-open-btn")}
                    onClick={() => setOpenGroup(open ? null : i)}
                  >
                    {g.icon}
                    <span>{g.text}</span>
                    <MaterialIcon name="ChevronDown" className="bw-nav-arrow" size={14} />
                  </button>
                  {open && (
                    <div className="bw-nav-drop">
                      {g.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          className={cn("bw-nav-drop-item", pathname.startsWith(c.href) && "active")}
                          onClick={() => {
                            setOpenGroup(null);
                            setMobileOpen(false);
                          }}
                        >
                          <MaterialIcon name="Circle" className="bw-nav-drop-dot" size={6} />
                          {c.text}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <a
              className="bw-nav-item"
              href="https://mahmutgazihanarslan.com.tr/bestwork"
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileOpen(false)}
            >
              <MaterialIcon name="ExternalLink" className="bw-nav-icon" size={16} />
              <span>Siteye Dön</span>
            </a>
          </div>

          <button
            type="button"
            className="bw-nav-hamburger d-lg-none"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menüyü aç/kapat"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <MaterialIcon name="X" size={20} /> : <MaterialIcon name="Menu" size={20} />}
          </button>

          <button
            type="button"
            className="bw-nav-item bw-nav-logout"
            onClick={() => void logout()}
            title="Çıkış Yap"
            aria-label="Çıkış Yap"
          >
            <MaterialIcon name="Power" className="bw-nav-icon" size={16} />
          </button>
        </div>
      </nav>

      {/* İçerik */}
      <main className="app-main">
        <div className="app-content">
          <div className="container-fluid">{children}</div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="float-end d-none d-sm-inline">BestWork MLM</div>
        <strong>Yönetim Paneli</strong> — tüm işlemler denetim loguna kaydedilir.
      </footer>
    </div>
  );
}
