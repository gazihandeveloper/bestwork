"use client";

// ============================================
// YURT İÇİ SEYAHATLER — promosyon liste sayfası
// listPromotions() sonucundan name/description
// anahtar kelimelerle eşleşenler üstte ("İlgili
// Kampanyalar"), kalanlar altta gösterilir.
// ============================================

import { useEffect, useMemo, useState } from "react";
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

// Eşleşme anahtar kelimeleri (küçük harf + Türkçe normalizasyonla karşılaştırılır)
const KEYWORDS = ["yurt içi", "yurt-ici", "yurtici", "şehir", "tur", "gezi"];

// Türkçe uyumlu küçük harfe çevir + "İ" gibi harflerin birleşik nokta işaretini temizle.
const normalize = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\u0307/g, "");

const isRelevant = (p: Promotion) => {
  const hay = normalize(`${p.name ?? ""} ${p.description ?? ""}`);
  return KEYWORDS.some((k) => hay.includes(normalize(k)));
};

const dateTR = (s?: string | null) =>
  s
    ? new Date(s).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

const nf = (v?: number | null) =>
  (Number(v) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });

export default function YurticiSeyahatlerPage() {
  const [items, setItems] = useState<Promotion[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listPromotions()
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

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
        title="Yurt İçi Seyahatler"
        subtitle="Yurt içi seyahat/gezi kampanyalarını görüntüleyin."
      />

      <AdminAlert kind="warning">
        ℹ️ Bu sayfa, adı veya açıklaması <b>yurt içi</b>, <b>şehir</b>, <b>tur</b>, <b>gezi</b>{" "}
        gibi anahtar kelimelerden birini içeren promosyonları öne çıkarır; diğerleri altta listelenir.
      </AdminAlert>

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      {items === null ? (
        !error && <AdminSpinner label="Promosyonlar yükleniyor…" />
      ) : (
        <>
          <div className="mb-4">
            <Link href="/promosyonlar/yeni">
              <AdminBtn variant="primary">+ Yeni Promosyon</AdminBtn>
            </Link>
          </div>

          <div className="mb-6">
            <AdminCard
              title="İlgili Kampanyalar"
              subtitle={`${relevant.length} yurt içi seyahat/gezi eşleşmesi`}
            >
              {relevant.length === 0 ? (
                <AdminEmpty>
                  Anahtar kelimelerle eşleşen yurt içi seyahat kampanyası bulunamadı. Yeni promosyon
                  oluşturmak için <b>+ Yeni Promosyon</b> düğmesini kullanın.
                </AdminEmpty>
              ) : (
                <PromotionTable items={relevant} />
              )}
            </AdminCard>
          </div>

          <AdminCard title="Diğer Promosyonlar" subtitle={`${others.length} kayıt`}>
            {others.length === 0 ? (
              <AdminEmpty>Başka promosyon kaydı yok.</AdminEmpty>
            ) : (
              <PromotionTable items={others} />
            )}
          </AdminCard>
        </>
      )}
    </div>
  );
}

// ── Promosyon tablosu (Ortak) ──────────────────────────────────────────────
function PromotionTable({ items }: { items: Promotion[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-white/[0.02]">
          <tr>
            <th className={thCls}>Ad</th>
            <th className={thCls}>Tür</th>
            <th className={`${thCls} text-center`}>Dönem</th>
            <th className={`${thCls} text-center`}>Başlangıç</th>
            <th className={`${thCls} text-center`}>Bitiş</th>
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
                {p.type === "kampanya" ? (
                  <AdminBadge color="blue">🎯 Kampanya</AdminBadge>
                ) : (
                  <AdminBadge color="amber">🎁 Promosyon</AdminBadge>
                )}
              </td>
              <td className={`${tdCls} text-center text-gray-600 dark:text-gray-300`}>
                {p.period_months} ay
              </td>
              <td className={`${tdCls} whitespace-nowrap text-center text-xs text-gray-500`}>
                {dateTR(p.starts_at)}
              </td>
              <td className={`${tdCls} whitespace-nowrap text-center text-xs text-gray-500`}>
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
