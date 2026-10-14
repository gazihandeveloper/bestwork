import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş | BestWork Yönetim Merkezi",
  description: "BestWork yönetim paneline güvenli giriş",
};

const FEATURES = [
  "Üye, ağaç ve kariyer yönetimi",
  "Sipariş, stok ve kargo takibi",
  "Komisyon ve finansal raporlar",
  "Çalışan yetkilendirme (RBAC)",
];

const Logo = () => (
  <span className="flex flex-col leading-none">
    <span
      className="text-3xl font-extrabold tracking-tight"
      style={{ fontFamily: "Helvetica, Arial, sans-serif", WebkitTextStroke: "0.5px currentColor" }}
    >
      BEST<span className="ml-0.5">WORK</span>
      <span
        className="relative top-[-0.5em] ml-0.5 align-super text-[0.6em] font-bold"
        style={{ fontFamily: "Georgia, serif" }}
      >
        ®
      </span>
    </span>
    <span className="mt-2 text-[11px] font-bold tracking-[0.3em] text-white/70">
      YÖNETİM MERKEZİ
    </span>
  </span>
);

export default function SignIn() {
  return (
    <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-[#1E293B] dark:ring-white/10 lg:grid lg:grid-cols-2">
      {/* Sol panel — kurumsal marka alanı */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          backgroundImage: "linear-gradient(150deg, #07271C 0%, #0E4E34 55%, #1E8B5A 130%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <Logo />
          <h2 className="mt-12 text-3xl font-bold leading-snug">
            İşletmenizi tek panelden
            <br />
            güvenle yönetin.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
            BestWork yönetim merkezi; üyelerinizi, siparişlerinizi ve finansal
            süreçlerinizi tek ekranda toplar.
          </p>
          <ul className="mt-9 space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-12 flex items-center gap-2 text-xs text-white/60">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          © 2026 BestWork · Tüm hakları saklıdır
        </div>
      </div>

      {/* Sağ panel — giriş formu */}
      <SignInForm />
    </div>
  );
}
