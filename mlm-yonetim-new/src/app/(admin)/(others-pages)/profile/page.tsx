"use client";
import React, { useEffect, useState } from "react";
import { getMe, type AdminMe } from "@/lib/api";




const roleLabel: Record<string, string> = {
  super_admin: "Süper Yönetici",
  admin: "Yönetici",
  user: "Üye",
};

export default function ProfilePage() {
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getMe()
      .then((u) => {
        if (alive && u) setMe(u as AdminMe);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const fullName = me?.name?.trim() || "";
  const initials = fullName
    ? fullName.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "A";
  const role = roleLabel[me?.role || ""] || me?.role || "—";

  const rows: { label: string; value: string }[] = [
    { label: "Ad Soyad", value: fullName || "—" },
    { label: "E-posta", value: me?.email || "—" },
    { label: "Üye Kodu", value: me?.member_code || "—" },
    { label: "Rol", value: role },
    { label: "Telefon", value: me?.phone || "—" },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
        Profil
      </h3>

      {/* Üst kart: avatar + isim */}
      <div className="mb-6 flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 sm:flex-row dark:border-gray-800 dark:bg-white/[0.03]">
        <span
          className="inline-flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ backgroundColor: "rgb(41, 165, 108)" }}
        >
          {initials}
        </span>
        <div className="text-center sm:text-left">
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {loading ? "Yükleniyor..." : fullName || "Yönetici"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{me?.email || ""}</p>
          <span className="mt-2 inline-block rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-500 dark:text-brand-400">
            {loading ? "…" : role}
          </span>
        </div>
      </div>

      {/* Bilgi kartı */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Hesap Bilgileri
        </h4>
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Bilgiler yükleniyor…</p>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rows.map((r) => (
              <div
                key={r.label}
                className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{r.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
