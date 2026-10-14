"use client";
import Checkbox from "@/components/form/input/Checkbox";
import { EyeIcon, EyeSlashIcon } from "@/components/icons";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://mahmutgazihanarslan.com.tr/api";
const REMEMBER_KEY = "bw_admin_email";

export default function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // "Beni hatırla" YALNIZCA e-postayı hatırlar; şifre asla kaydedilmez.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setIsChecked(true);
      }
    } catch {
      /* yoksay */
    }

    // Tarayıcı şifre alanını otomatik doldursa bile şifreyi temizle:
    // şifre hiçbir koşulda hatırlanmaz.
    const t = setTimeout(() => setPassword(""), 400);
    return () => clearTimeout(t);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("E-posta ve şifre gereklidir.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Scope": "1" },
        credentials: "include",
        body: JSON.stringify({ login: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.user) {
        setError(data?.error || "Geçersiz giriş bilgileri");
        return;
      }
      const role = data.user?.role;
      if (role !== "admin" && role !== "super_admin" && role !== "staff") {
        setError("Bu panele yalnızca yetkili personel girebilir.");
        return;
      }
      // Yalnızca e-posta saklanır; şifre asla.
      try {
        if (isChecked) localStorage.setItem(REMEMBER_KEY, email.trim());
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* yoksay */
      }
      // Başarılı: panele yönlendir
      router.push("/");
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "h-12 w-full rounded-xl border border-gray-200 bg-white text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-gray-500";

  return (
    <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
      {/* Mobil logo (sol panel gizliyken) */}
      <div className="mb-8 text-center lg:hidden">
        <span
          className="text-3xl font-extrabold tracking-tight text-[#101828] dark:text-white"
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
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-gray-400">
          Yönetim Merkezi
        </p>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Yönetim Paneline Giriş
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          Devam etmek için hesap bilgilerinizi girin.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-error-500/25 bg-error-50 px-3.5 py-3 text-sm font-medium text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <svg
            className="mt-0.5 shrink-0"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} autoComplete="off" className="space-y-5">
        <div>
          <label
            htmlFor="bw-email"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            E-posta veya üye adı
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="m22 7-10 6L2 7" />
              </svg>
            </span>
            <input
              id="bw-email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@bestwork.com"
              className={`${inputCls} pl-11 pr-4`}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="bw-password"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Şifre
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              id="bw-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${inputCls} pl-11 pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5"
            >
              {showPassword ? (
                <EyeIcon className="fill-current" />
              ) : (
                <EyeSlashIcon className="fill-current" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
            <Checkbox checked={isChecked} onChange={setIsChecked} />
            Beni hatırla <span className="text-xs text-gray-400">(yalnızca e-posta)</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-105 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            backgroundImage: "linear-gradient(90deg, #1E8B5A 0%, #29a56c 60%, #34b87c 100%)",
          }}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Giriş yapılıyor…
            </>
          ) : (
            <>
              Giriş Yap
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-xs leading-relaxed text-gray-400 dark:text-gray-500 lg:text-left">
        Bu panel yalnızca yetkili BestWork personeli içindir. Oturum açma
        işlemleri güvenlik amacıyla kayıt altına alınır.
      </p>
    </div>
  );
}
