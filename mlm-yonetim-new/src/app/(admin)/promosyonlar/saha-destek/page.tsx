"use client";

// ============================================
// SAHA DESTEK — kampanya/promosyon listesi
// listPromotions() sonucundan anahtar kelimeyle eşleşenler
// üstte "İlgili Kampanyalar", kalanlar "Diğer Promosyonlar"
// başlığı altında listelenir.
// ============================================

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import { listPromotions, getErrorMessage, type Promotion } from "@/lib/api";

// Ad veya açıklamada geçen anahtar kelimeler — normalize edilerek aranır.
const KEYWORDS = ["saha", "saha destek"];

const tr = (s: string) =>
  s.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();

const isRelevant = (p: Promotion) => {
  const haystack = tr(`${p.name} ${p.description ?? ""}`);
  return KEYWORDS.some((k) => haystack.includes(tr(k)));
};

const dateTR = (s?: string | null) =>
  s
    ? new Date(s).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

const nf = (v?: number) =>
  (Number(v) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });

function TypeBadge({ type }: { type: string }) {
  return type === "kampanya" ? (
    <AdminBadge color="blue">🎯 Kampanya</AdminBadge>
  ) : (
    <AdminBadge color="amber">🎁 Promosyon</AdminBadge>
  );
}

function PromotionTable({ items }: { items: Promotion[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-white/[0.02]">
          <tr>
            <th className={thCls}>Ad</th>
            <th className={thCls}>Tür</th>
            <th className={thCls}>Dönem</th>
            <th className={thCls}>Başlangıç</th>
            <th className={thCls}>Bitiş</th>
            <th className={`${thCls} text-right`}>Kişisel PV Kotası</th>
            <th className={`${thCls} text-right`}>Zayıf Kol Hedefi</th>
            <th className={`${thCls} text-center`}>Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
              <td className={tdCls}>
                <p className="font-semibold text-gray-800 dark:text-white/90">{p.name}</p>
                {p.description && (
                  <p className="mt-0.5 line-clamp-1 max-w-[280px] text-xs text-gray-400">
                    {p.description}
                  </p>
                )}
              </td>
              <td className={tdCls}>
                <TypeBadge type={p.type} />
              </td>
              <td className={tdCls}>
                <AdminBadge color="purple">{p.period_months} ay</AdminBadge>
              </td>
              <td className={`${tdCls} whitespace-nowrap text-gray-600 dark:text-gray-300`}>
                {dateTR(p.starts_at)}
              </td>
              <td className={`${tdCls} whitespace-nowrap text-gray-600 dark:text-gray-300`}>
                {dateTR(p.ends_at)}
              </td>
              <td className={`${tdCls} text-right text-gray-600 dark:text-gray-300`}>
                {nf(p.personal_pv_quota)}
              </td>
              <td className={`${tdCls} text-right text-gray-600 dark:text-gray-300`}>
                {nf(p.short_leg_target)}
              </td>
              <td className={`${tdCls} text-center`}>
                {p.is_active ? (
                  <AdminBadge color="green">Aktif</AdminBadge>
                ) : (
                  <AdminBadge color="gray">Pasif</AdminBadge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SahaDestekPage() {
  const [items, setItems] = useState<Promotion[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    listPromotions()
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { relevant, others } = useMemo(() => {
    const list = items ?? [];
    return {
      relevant: list.filter(isRelevant),
      others: list.filter((p) => !isRelevant(p)),
    };
  }, [items]);

  return (
    <div>
      <AdminHeader
        title="Saha Destek"
        subtitle="Saha destek kampanyalarını görüntüleyin"
        actions={
          <Link href="/promosyonlar/yeni">
            <AdminBtn variant="primary">+ Yeni Promosyon</AdminBtn>
          </Link>
        }
      />

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <AdminAlert kind="warning">
        Bu sayfa, adı veya açıklaması <b>saha</b> anahtar kelimesiyle eşleşen kampanyaları
        üstte listeler. Eşleşmeyen promosyonlar altta <b>Diğer Promosyonlar</b> başlığında
        gösterilir.
      </AdminAlert>

      {items === null ? (
        <AdminCard>
          <AdminSpinner label="Kampanyalar yükleniyor…" />
        </AdminCard>
      ) : (
        <div className="space-y-6">
          <AdminCard
            title="İlgili Kampanyalar"
            subtitle={`${relevant.length} saha destek kampanyası`}
          >
            {relevant.length === 0 ? (
              <AdminEmpty>
                Anahtar kelimeyle eşleşen kampanya bulunamadı. Yeni bir saha destek kampanyası
                oluşturmak için <b>Yeni Promosyon</b> düğmesini kullanın.
              </AdminEmpty>
            ) : (
              <PromotionTable items={relevant} />
            )}
          </AdminCard>

          <AdminCard
            title="Diğer Promosyonlar"
            subtitle={`${others.length} kayıt`}
          >
            {others.length === 0 ? (
              <AdminEmpty>Başka promosyon kaydı yok.</AdminEmpty>
            ) : (
              <PromotionTable items={others} />
            )}
          </AdminCard>
        </div>
      )}
    </div>
  );
}