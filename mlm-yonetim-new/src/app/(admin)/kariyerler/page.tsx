"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminHeader,
  AdminCard,
  AdminAlert,
  AdminSpinner,
} from "@/components/admin/AdminUI";
import { listCareers, getErrorMessage, type CareerRank } from "@/lib/api";

const BOX_STYLES = [
  "border-brand-200 bg-brand-50/70 dark:border-brand-500/25 dark:bg-brand-500/10",
  "border-amber-200 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-500/10",
  "border-violet-200 bg-violet-50/70 dark:border-violet-500/25 dark:bg-violet-500/10",
  "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/10",
  "border-sky-200 bg-sky-50/70 dark:border-sky-500/25 dark:bg-sky-500/10",
  "border-rose-200 bg-rose-50/70 dark:border-rose-500/25 dark:bg-rose-500/10",
];

export default function KariyerlerPage() {
  const router = useRouter();
  const [careers, setCareers] = useState<CareerRank[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listCareers()
      .then(setCareers)
      .catch((e) => setError(getErrorMessage(e)));
  }, []);

  const totalMembers = careers ? careers.reduce((s, c) => s + c.count, 0) : 0;

  return (
    <div>
      <AdminHeader
        title="Kariyerler ve Rozetler"
        subtitle="Şirket başlangıcından itibaren güncel kariyer dağılımı."
      />

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <AdminCard
        title="Kariyer Dağılımı"
        subtitle={`Tüm zamanlar (şirket başlangıcından itibaren) · Girişimci dahil ${careers?.length ?? 0} kategori · ${totalMembers} üye — kutuya tıklayın, isimleri görün`}
        actions={
          <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold tracking-wide text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            TÜM ZAMANLAR
          </span>
        }
      >
        {careers === null ? (
          <AdminSpinner label="Kariyer dağılımı yükleniyor…" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
            {careers.map((cr, i) => (
              <button
                key={cr.id}
                type="button"
                onClick={() => router.push(`/kariyerler/${cr.id}`)}
                className={`group rounded-2xl border p-4 text-left transition hover:shadow-theme-sm ${BOX_STYLES[i % BOX_STYLES.length]}`}
              >
                <div className="truncate text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {cr.name}
                </div>
                <div className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">
                  {cr.count}
                </div>
                <div className="text-[10px] font-medium text-gray-400 group-hover:text-brand-500">
                  üye · listeyi aç →
                </div>
              </button>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
