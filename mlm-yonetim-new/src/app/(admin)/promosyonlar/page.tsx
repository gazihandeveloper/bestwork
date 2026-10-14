"use client";

// ============================================
// KAMPANYA VE PROMOSYONLAR — liste sayfası
// Ekleme/düzenleme ayrı SAYFALARDA:
//   /promosyonlar/yeni · /promosyonlar/duzenle/[id]
// "Kazananlar" ise modal olarak açılır.
// ============================================

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  AdminModal,
} from "@/components/admin/AdminUI";
import { dateRangeLabel } from "@/components/admin/PromotionForm";
import {
  listPromotions,
  deletePromotion,
  setPromotionActive,
  getPromotionMembers,
  getErrorMessage,
  type Promotion,
  type PromotionMember,
} from "@/lib/api";

const nf = (v?: number) =>
  (Number(v) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });

function TypeBadge({ type }: { type: string }) {
  return type === "kampanya" ? (
    <AdminBadge color="blue">🎯 Kampanya</AdminBadge>
  ) : (
    <AdminBadge color="amber">🎁 Promosyon</AdminBadge>
  );
}

export default function PromosyonlarPage() {
  const router = useRouter();
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [membersFor, setMembersFor] = useState<Promotion | null>(null);
  const [members, setMembers] = useState<PromotionMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listPromotions());
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (p: Promotion) => {
    try {
      await setPromotionActive(p.id, !p.is_active);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const remove = async (p: Promotion) => {
    if (!confirm(`"${p.name}" silinsin mi?`)) return;
    try {
      await deletePromotion(p.id);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const openMembers = async (p: Promotion) => {
    setMembersFor(p);
    setMembersLoading(true);
    setMembers([]);
    try {
      setMembers(await getPromotionMembers(p.id));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setMembersLoading(false);
    }
  };

  const qualifiedCount = members.filter((m) => m.qualified).length;

  return (
    <div>
      <AdminHeader
        title="Kampanya ve Promosyonlar"
        subtitle="Kampanya veya promosyon oluşturun; süre, kotlar ve kariyer bazlı hedefler belirleyin."
      />

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <AdminCard
        title="Kampanya ve Promosyonlar"
        subtitle={`Toplam ${items.length} kayıt`}
        actions={
          <AdminBtn onClick={() => router.push("/promosyonlar/yeni")} variant="primary">
            + Yeni Ekle
          </AdminBtn>
        }
      >
        {loading ? (
          <AdminSpinner label="Yükleniyor…" />
        ) : items.length === 0 ? (
          <AdminEmpty>
            Henüz kampanya/promosyon yok. İlkini oluşturmak için <b>+ Yeni Ekle</b> düğmesini kullanın.
          </AdminEmpty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Tür</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Başlık</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-400">Tarih Aralığı</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Kişisel PV Kotası</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Kısa Kol Hedefi</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-400">Kariyer Kuralı</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-400">Durum</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <TypeBadge type={p.type} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 dark:text-white/90">{p.name}</p>
                      {p.description && (
                        <p className="mt-0.5 line-clamp-1 max-w-[280px] text-xs text-gray-400">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">
                      {dateRangeLabel(p.starts_at, p.ends_at)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{nf(p.personal_pv_quota)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{nf(p.short_leg_target)}</td>
                    <td className="px-4 py-3 text-center">
                      {p.rank_rules.length > 0 ? (
                        <AdminBadge color="purple">{p.rank_rules.length} kariyer</AdminBadge>
                      ) : (
                        <span className="text-xs text-gray-400">Genel</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                          p.is_active
                            ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
                            : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                        }`}
                      >
                        {p.is_active ? "Aktif" : "Pasif"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <AdminBtn size="xs" variant="info" onClick={() => openMembers(p)}>
                          Kazananlar
                        </AdminBtn>
                        <AdminBtn
                          size="xs"
                          variant="outline"
                          onClick={() => router.push(`/promosyonlar/duzenle/${p.id}`)}
                        >
                          Düzenle
                        </AdminBtn>
                        <AdminBtn size="xs" variant="danger" onClick={() => remove(p)}>
                          Sil
                        </AdminBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* Kazananlar modalı */}
      <AdminModal
        open={!!membersFor}
        title={membersFor ? `Kazananlar — ${membersFor.name}` : ""}
        onClose={() => setMembersFor(null)}
        size="lg"
      >
        {membersLoading ? (
          <AdminSpinner label="Üyeler hesaplanıyor…" />
        ) : (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <AdminBadge color="green">🏆 {qualifiedCount} kazanan</AdminBadge>
              <AdminBadge color="gray">{members.length} üye toplam</AdminBadge>
            </div>
            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-[#243044]">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Üye</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Kariyer</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Kısa Kol</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Hedef</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-gray-400">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {members.map((m) => (
                    <tr
                      key={m.id}
                      className={m.qualified ? "bg-success-50/50 dark:bg-success-500/5" : ""}
                    >
                      <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-white/90">
                        {m.name || `#${m.id}`}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">
                        {m.rank_name || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-300">{nf(m.short_leg)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-300">{nf(m.target)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {m.qualified ? (
                          <AdminBadge color="green">🏆 Kazanan</AdminBadge>
                        ) : (
                          <AdminBadge color="gray">Bekliyor</AdminBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
