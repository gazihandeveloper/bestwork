import Link from "next/link";
import { MaterialIcon } from "@/components/MaterialIcon";
import { FOOTER_BG, FOOTER_TEXT } from "../landing/tokens";
import { getSiteSettings } from "@/services/settings";

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

const FALLBACK_ABOUT = "Binary MLM ve e-ticaretin buluştuğu platform.";
const FALLBACK_COPYRIGHT = "(c) 2026 BestWork. Tüm hakları saklıdır.";

// lucide-react 1.x marka (brand) ikonlarını kaldırdı (Instagram/Facebook/Youtube yok);
// bu yüzden resmi logo yolları inline SVG olarak verildi.
const SOCIALS: Record<string, { label: string; base: string; path: string }> = {
  social_instagram: {
    label: "Instagram",
    base: "https://www.instagram.com/",
    path: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z",
  },
  social_facebook: {
    label: "Facebook",
    base: "https://www.facebook.com/",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  social_youtube: {
    label: "YouTube",
    base: "https://www.youtube.com/",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
};

// Değer tam URL ise aynen kullan; değilse platform adresinin önüne ekle (kullanıcı adı gibi).
function socialHref(value: string, base: string): string {
  return /^https?:\/\//i.test(value) ? value : `${base}${value.replace(/^@/, "")}`;
}

// Landing footer — m3.material.io'nun koyu footer'ı gibi; içerik panelden (GET /api/settings) gelir.
export default async function Footer() {
  const settings = await getSiteSettings();
  const about = settings.footer_about || settings.corporate_description || FALLBACK_ABOUT;
  const copyright = settings.footer_copyright || FALLBACK_COPYRIGHT;
  const socials = Object.entries(SOCIALS).filter(([key]) => Boolean(settings[key]));

  return (
    <footer
      id="iletisim"
      className="border-t border-white/10 px-6 py-12"
      style={{ backgroundColor: FOOTER_BG, color: FOOTER_TEXT }}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-12 md:gap-6">
        {/* Marka sütunu */}
        <div className="md:col-span-4">
          <span className="text-2xl font-extrabold tracking-tight text-white">BestWork</span>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">{about}</p>
          {socials.length > 0 && (
            <div className="mt-6 flex items-center gap-3">
              {socials.map(([key, social]) => (
                <a
                  key={key}
                  href={socialHref(settings[key], social.base)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/40 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Platform linkleri */}
        <div className="md:col-span-2">
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Platform</h4>
          <ul className="space-y-2.5">
            {platformLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-white/80 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Hesap linkleri */}
        <div className="md:col-span-3">
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">Hesap</h4>
          <ul className="space-y-2.5">
            {accountLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-white/80 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* İletişim sütunu */}
        <div className="md:col-span-3">
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">İletişim</h4>
          <ul className="space-y-3 text-sm">
            {settings.corporate_address && (
              <li className="flex items-start gap-2.5">
                <MaterialIcon name="MapPin" className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />
                <span className="text-white/80">{settings.corporate_address}</span>
              </li>
            )}
            {settings.corporate_phone && (
              <li className="flex items-center gap-2.5">
                <MaterialIcon name="Phone" className="h-4 w-4 shrink-0 text-white/60" />
                <a
                  href={`tel:${settings.corporate_phone.replace(/[^+\d]/g, "")}`}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  {settings.corporate_phone}
                </a>
              </li>
            )}
            {settings.corporate_email && (
              <li className="flex items-center gap-2.5">
                <MaterialIcon name="Mail" className="h-4 w-4 shrink-0 text-white/60" />
                <a
                  href={`mailto:${settings.corporate_email}`}
                  className="text-white/80 transition-colors hover:text-white"
                >
                  {settings.corporate_email}
                </a>
              </li>
            )}
            {settings.corporate_hours && (
              <li className="flex items-start gap-2.5">
                <MaterialIcon name="Clock" className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />
                <span className="text-white/80">{settings.corporate_hours}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Alt telif barı */}
      <div className="mx-auto mt-10 max-w-6xl">
        <div className="h-px w-full bg-white/10" />
        <p className="pt-6 text-center text-xs text-white/60">{copyright}</p>
      </div>
    </footer>
  );
}
