"use client";

import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://mahmutgazihanarslan.com.tr/api";

const fmtTL = (v: number) =>
  (v ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";
const fmtN = (v: number) => (v ?? 0).toLocaleString("tr-TR");

export default function LiveStats() {
  const [data, setData] = useState<any | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/admin/dashboard`, { credentials: "include", headers: { "X-Admin-Scope": "1" } })
      .then((r) => r.json())
      .then((d) => {
        if (d?.dashboard) setData(d.dashboard);
        else if (d?.error) setErr(d.error);
      })
      .catch(() => setErr("Veri alınamadı"));
  }, []);

  const cards: { label: string; value: string; icon: string }[] = data
    ? [
        { label: "Toplam Ciro", value: fmtTL(data.total_revenue), icon: "💰" },
        { label: "Dağıtılan Komisyon", value: fmtTL(data.total_commissions_paid), icon: "💸" },
        { label: "Net Kâr", value: fmtTL(data.net_profit), icon: "📈" },
        { label: "Aktif Üye", value: fmtN(data.active_users), icon: "👥" },
        { label: "Toplam Çekim", value: fmtTL(data.total_withdrawals), icon: "⏳" },
      ]
    : [];

  if (err) {
    return (
      <div className="mb-6 rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-600 dark:text-error-400">
        BestWork API: {err}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="col-span-12 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-[#1E293B]"
          >
            <div className="mb-2 h-9 w-9 animate-pulse rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-100 dark:bg-white/[0.04]" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-white/[0.04]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="col-span-12 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map((c, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-[#1E293B]"
        >
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-lg dark:bg-white/[0.04]">
            {c.icon}
          </div>
          <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
          <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
