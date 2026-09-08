"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://mahmutgazihanarslan.com.tr/api";

// BestWork oturumunu doğrular: giriş yoksa /signin'e yönlendirir.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/user/me`, {
      credentials: "include",
      headers: { "X-Admin-Scope": "1" },
    })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setStatus("ok");
        } else {
          setStatus("denied");
          router.replace("/signin");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("denied");
          router.replace("/signin");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-[#1E293B]">
        <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }
  if (status === "denied") return null;
  return <>{children}</>;
}
