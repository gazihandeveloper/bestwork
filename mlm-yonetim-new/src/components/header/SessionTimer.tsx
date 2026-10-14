"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Oturum zaman aşımı sayacı:
// - 30 dakika boyunca GERÇEK işlem yapılmazsa oturum otomatik kapatılır.
// - Süreyi yalnızca tıklama, klavye ve dokunma tazeler.
// - Fare oynatma, kaydırma gibi pasif hareketler süreyi UZATMAZ; kişi aynı
//   sayfada 30 dakika kalırsa otomatik çıkış yapılır.
// - Kalan süre başlıkta kırmızı rozet içinde geriye sayar.

const IDLE_LIMIT = 30 * 60; // saniye (30 dakika)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://mahmutgazihanarslan.com.tr/api";

export default function SessionTimer() {
  const router = useRouter();
  const [remaining, setRemaining] = useState(IDLE_LIMIT);
  const lastActivity = useRef(Date.now());
  const loggedOut = useRef(false);

  const logout = useCallback(async () => {
    if (loggedOut.current) return;
    loggedOut.current = true;
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "X-Admin-Scope": "1" },
        credentials: "include",
      });
    } catch {
      /* ağ hatası olsa da çıkışa devam */
    }
    router.replace("/signin");
    router.refresh();
  }, [router]);

  // Süre YALNIZCA gerçek işlemlerle tazelenir: tıklama, klavye, dokunma.
  // (Fare oynatma / kaydırma sayılmaz.)
  useEffect(() => {
    let lastReset = 0;
    const touch = () => {
      const now = Date.now();
      if (now - lastReset < 1000) return; // saniyede en fazla 1 kez
      lastReset = now;
      lastActivity.current = now;
      setRemaining(IDLE_LIMIT);
    };
    const events: (keyof WindowEventMap)[] = ["mousedown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, touch));
  }, []);

  // Geri sayım; süre bitince otomatik çıkış.
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivity.current) / 1000);
      const left = Math.max(0, IDLE_LIMIT - elapsed);
      setRemaining(left);
      if (left <= 0) void logout();
    }, 1000);
    return () => clearInterval(id);
  }, [logout]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const low = remaining <= 5 * 60; // son 5 dakika: yanıp söner

  return (
    <div
      title="30 dakika boyunca işlem yapılmazsa oturum otomatik kapanır (fare hareketi sayılmaz)"
      aria-label={`Oturum süresi ${mm}:${ss}`}
      className={`flex h-11 items-center gap-2 rounded-full border border-error-500/30 bg-error-50 px-3 text-error-600 dark:bg-error-500/10 dark:text-error-400 ${
        low ? "animate-pulse" : ""
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="text-sm font-semibold tabular-nums">
        {mm}:{ss}
      </span>
    </div>
  );
}
