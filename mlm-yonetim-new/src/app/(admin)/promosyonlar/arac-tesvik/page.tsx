"use client";

// ============================================
// ARAÇ TEŞVİKİ — kategori görünümü
// listPromotions() sonucundan adı/açıklamasında
// "araç" geçenler üstte, kalanlar "Diğer
// Promosyonlar" bölümünde listelenir. Kayıt
// ekleme/düzenleme Promosyonlar sayfasındadır.
// ============================================

import { useCallback, useEffect, useState } from "react";
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

// Kategori anahtar kelimesi (Türkçe küçük harf kurallarıyla karşılaştırılır).
const KEYWORD = "araç";

const nf = (v?: number | null) =>
  (Number(v) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });

const dateTR = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("tr-TR") : "—";

// "Araç", "ARAÇ" gibi yazımları küçük/büyük harf duyarsız yakalar.
const trLower = (s?: string | null) => (s ?? "").toLocaleLowerCase("tr-TR");

function isAracRelated(p: Promotion): boolean {
  return (
    trLower(p.name).includes(KEYWORD) || trLower(p.description).includes(KEYWORD)
  );
}

function TypeBadge({ type }: { type: Promotion["type"] }) {
  return type === "kampanya" ? (
    <AdminBadge color="blue">Kampanya</AdminBadge>
  ) : (
    <AdminBadge color="amber">Promosyon</AdminBadge>
  );
}

export default function AracTesvikPage() {
  const [items, setItems] = useState<Promotion[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await listPromotions());
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (items === null) {
    return <AdminSpinner label="Araç teşviki yükleniyor…" />;
  }

  const related = items.filter(isAracRelated);
  const others = items.filter((p) => !isAracRelated(p));

  return (
    <div>
      <AdminHeader
        title="Araç Teşviki"
        subtitle="Araç teşvik kampanyalarını görüntüleyin ve yönetin"
        actions={
          <Link href="/promosyonlar/yeni">
            <AdminBtn variant="primary">+ Yeni Promosyon</AdminBtn>
          </Link>
        }
      />

      <AdminAlert kind="info">
        Bu görünüm teşvik kategorisine göre filtreler; tüm kayıtlar Promosyonlar
        sayfasında yönetilir.
      </AdminAlert>

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <AdminCard
        title="Araç Teşviki Kampanyaları"
        subtitle={`"${KEYWORD}" ile eşleşen ${related.length} kayıt`}
      >
        {related.length === 0 ? (
          <AdminEmpty>
            Araç teşviki ile ilgili kampanya/promosyon bulunamadı. Yeni eklemek
            için <b>+ Yeni Promosyon</b> düğmesini kullanın.
          </AdminEmpty>
        ) : (
          <PromotionTable items={related} />
        )}
      </AdminCard>

      <AdminCard
        title="Diğer Promosyonlar"
        subtitle={`Araç kategorisiyle eşleşmeyen ${others.length} kayıt`}
      >
        {others.length === 0 ? (
          <AdminEmpty>Diğer promosyon bulunmuyor.</AdminEmpty>
        ) : (
          <PromotionTable items={others} />
        )}
      </AdminCard>
    </div>
  );
}

// ── Ortak promosyon tablosu ────────────────────────────────────────────────
function PromotionTable({ items }: { items: Promotion[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-white/[0.02]">
          <tr>
            <th className={`${thCls} text-left`}>Ad</th>
            <th className={`${thCls} text-left`}>Tür</th>
            <th className={`${thCls} text-right`}>Dönem (ay)</th>
            <th className={`${thCls} text-left`}>Başlangıç</th>
            <th className={`${thCls} text-left`}>Bitiş</th>
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
              <td className={`${tdCls} text-right font-medium text-gray-600 dark:text-gray-300`}>
                {p.period_months} ay
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
