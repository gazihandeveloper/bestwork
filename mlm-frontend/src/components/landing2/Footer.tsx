import Link from "next/link";
import { FOOTER_BG, FOOTER_TEXT } from "../landing/tokens";

const platformLinks = [
  { href: "/", label: "Anasayfa" },
  { href: "/shop", label: "Ürünler" },
  { href: "/#kurumsal", label: "Kurumsal" },
  { href: "/#iletisim", label: "İletişim" },
];

const accountLinks = [
  { href: "/register", label: "Kayıt Ol" },
  { href: "/login", label: "Giriş" },
  { href: "/shop", label: "Alışveriş" },
];

// Landing footer — m3.material.io'nun koyu footer'ı gibi (statik sunucu bileşeni).
export default function Footer() {
  return (
    <footer
      id="iletisim"
      className="border-t border-white/15 px-6 py-10"
      style={{ backgroundColor: FOOTER_BG, color: FOOTER_TEXT }}
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-4">
        <div className="md:col-span-4">
          <div className="mb-3 flex items-center">
            <span className="text-2xl font-extrabold text-white">BestWork</span>
          </div>
          <p className="max-w-[280px] text-sm" style={{ color: FOOTER_TEXT }}>
            Binary MLM ve e-ticaretin buluştuğu platform.
          </p>
        </div>

        <div className="md:col-span-2">
          <h4 className="mb-3 text-sm font-bold text-white">Platform</h4>
          {platformLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="mb-1.5 block text-sm text-white/85 underline underline-offset-4 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="md:col-span-3">
          <h4 className="mb-3 text-sm font-bold text-white">Hesap</h4>
          {accountLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="mb-1.5 block text-sm text-white/85 underline underline-offset-4 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="md:col-span-3">
          <h4 className="mb-3 text-sm font-bold text-white">İletişim</h4>
          <p className="mb-1.5 text-sm" style={{ color: FOOTER_TEXT }}>
            Destek: destek@bestwork.com
          </p>
          <p className="text-sm" style={{ color: FOOTER_TEXT }}>
            Çalışma saatleri: 09.00 - 18.00
          </p>
        </div>
      </div>

      <div className="my-6 h-px w-full bg-white/15" />

      <p className="text-sm text-white/70">© 2026 BestWork. Tüm hakları saklıdır.</p>
    </footer>
  );
}
