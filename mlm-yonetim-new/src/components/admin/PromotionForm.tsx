"use client";

// ============================================
// KAMPANYA / PROMOSYON — form (revize tasarım)
// Bölümlü kart düzeni:
//   1. Genel Bilgiler (tür + başlık + açıklama)
//   2. Zaman Aralığı | Hedefler ve Kotlar (yan yana)
//   3. Kariyer Bazlı Kurallar
// Zaman aralığı: Başlangıç + Bitiş tarihi (ay gösterimi yok)
// ============================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminAlert,
  AdminSpinner,
  inputCls,
  labelCls,
} from "@/components/admin/AdminUI";
import {
  listAdminRanks,
  listPromotions,
  createPromotion,
  updatePromotion,
  getErrorMessage,
  type Promotion,
  type PromotionInput,
  type PromotionRankRule,
  type Rank,
} from "@/lib/api";

// ── Tarih yardımcıları ────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, "0");

/** datetime-local biçimi: YYYY-MM-DDTHH:MM (yerel saat). */
const dtLocal = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/** Şu an (Yerel) — YYYY-MM-DDTHH:MM. */
export function nowLocal(): string {
  return dtLocal(new Date());
}

/** Şu andan N ay sonrası — YYYY-MM-DDTHH:MM. */
export function plusMonthsLocal(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return dtLocal(d);
}

/** "2026-01-01T14:30" → "01.01.2026 14:30" (boşsa "—"). */
export function dateLabel(dt?: string): string {
  if (!dt || dt.length < 10) return "—";
  const clean = dt.slice(0, 16);
  const [datePart, timePart] = clean.split("T");
  const [y, m, d] = datePart.split("-");
  const base = `${d}.${m}.${y}`;
  return timePart ? `${base} ${timePart}` : base;
}

/** "01.01.2026 – 31.03.2026" aralık etiketi. */
export function dateRangeLabel(start?: string, end?: string): string {
  if (!start && !end) return "—";
  return `${dateLabel(start)} – ${dateLabel(end)}`;
}

/** İki tarih arası yaklaşık ay sayısı (dahil). Geçersizse 0. */
function monthsBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
}

// ── Form ──────────────────────────────────────────────────────────────

export function PromotionForm({
  initial,
  ranks,
  onSave,
  onCancel,
}: {
  initial: Promotion | null;
  ranks: Rank[];
  onSave: (input: PromotionInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [type, setType] = useState<string>(initial?.type ?? "promosyon");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [startsAt, setStartsAt] = useState<string>(initial?.starts_at || nowLocal());
  const [endsAt, setEndsAt] = useState<string>(initial?.ends_at || plusMonthsLocal(3));
  const [pvQuota, setPvQuota] = useState<string>(initial ? String(initial.personal_pv_quota) : "0");
  const [shortLeg, setShortLeg] = useState<string>(initial ? String(initial.short_leg_target) : "0");
  const [rules, setRules] = useState<PromotionRankRule[]>(initial?.rank_rules ?? []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const tarihGecersiz = !!startsAt && !!endsAt && monthsBetween(startsAt, endsAt) === 0;

  const addRule = () => {
    const used = new Set(rules.map((r) => r.rank_id));
    const next = ranks.find((r) => !used.has(r.id));
    if (!next) return;
    setRules([...rules, { rank_id: next.id, short_leg_target: 0, personal_pv_quota: 0 }]);
  };

  const setRule = (i: number, patch: Partial<PromotionRankRule>) => {
    setRules(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const submit = async () => {
    setErr("");
    if (!name.trim()) {
      setErr("Başlık zorunludur.");
      return;
    }
    if (!startsAt || !endsAt) {
      setErr("Başlangıç ve bitiş tarihi zorunludur.");
      return;
    }
    if (tarihGecersiz) {
      setErr("Bitiş tarihi başlangıçtan önce olamaz.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        type,
        name: name.trim(),
        description,
        period_months: monthsBetween(startsAt, endsAt) || 3,
        starts_at: startsAt,
        ends_at: endsAt,
        personal_pv_quota: Number(pvQuota) || 0,
        short_leg_target: Number(shortLeg) || 0,
        rank_rules: rules,
        is_active: initial?.is_active ?? true,
      });
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {err && <AdminAlert kind="error">{err}</AdminAlert>}

      {/* 1) Genel Bilgiler */}
      <AdminCard title="Genel Bilgiler" subtitle="Tür, başlık ve açıklama">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Tür</label>
            <div className="mt-1.5 grid max-w-md grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("promosyon")}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                  type === "promosyon"
                    ? "border-warning-500 bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-orange-300"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
                }`}
              >
                🎁 Promosyon
              </button>
              <button
                type="button"
                onClick={() => setType("kampanya")}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                  type === "kampanya"
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600"
                }`}
              >
                🎯 Kampanya
              </button>
            </div>
          </div>

          <div>
            <label className={labelCls}>Başlık *</label>
            <input
              className={`${inputCls} mt-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Yaz Dönemi Yeni Üye Kampanyası"
            />
          </div>

          <div>
            <label className={labelCls}>Açıklama</label>
            <textarea
              className={`${inputCls} mt-1 min-h-[72px]`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kampanyanın şartları ve detayları…"
            />
          </div>
        </div>
      </AdminCard>

      {/* 2) Zaman Aralığı + Hedefler ve Kotlar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminCard title="Zaman Aralığı" subtitle="Başlangıç ve bitiş tarihi + saati">
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Başlangıç Tarihi ve Saati</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={`${inputCls} mt-1`}
              />
            </div>
            <div>
              <label className={labelCls}>Bitiş Tarihi ve Saati</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={`${inputCls} mt-1`}
              />
            </div>
            {tarihGecersiz && (
              <p className="text-xs font-semibold text-error-500">
                Bitiş tarihi başlangıçtan önce olamaz.
              </p>
            )}
          </div>
        </AdminCard>

        <AdminCard title="Hedefler ve Kotlar" subtitle="PV kotası ve kısa kol hedefi">
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Kişisel PV Kotası</label>
              <input
                type="number"
                min="0"
                step="any"
                className={`${inputCls} mt-1`}
                value={pvQuota}
                onChange={(e) => setPvQuota(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">Kişisel alışverişten sayılacak azami PV.</p>
            </div>
            <div>
              <label className={labelCls}>Kısa Kol Hedefi</label>
              <input
                type="number"
                min="0"
                step="any"
                className={`${inputCls} mt-1`}
                value={shortLeg}
                onChange={(e) => setShortLeg(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">
                Zayıf kolun ulaşması gereken PV hedefi (birikmiş değil).
              </p>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* 3) Kariyer Bazlı Kurallar */}
      <AdminCard
        title="Kariyer Bazlı Kurallar"
        subtitle="Belirli kariyerlere özel hedef/kota tanımlayarak zorlaştırın"
        actions={
          <AdminBtn size="xs" variant="outline" onClick={addRule}>
            + Kural Ekle
          </AdminBtn>
        }
      >
        {rules.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400 dark:border-gray-700">
            Kural yok — tüm kariyerler için genel hedef geçerli.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((r, i) => (
              <div
                key={`${r.rank_id}-${i}`}
                className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-white/[0.02]"
              >
                <div className="min-w-[140px]">
                  <span className="text-[11px] font-semibold text-gray-400">Kariyer</span>
                  <select
                    value={r.rank_id}
                    onChange={(e) => setRule(i, { rank_id: Number(e.target.value) })}
                    className={`${inputCls} mt-0.5 py-1.5`}
                  >
                    {ranks.map((rk) => (
                      <option key={rk.id} value={rk.id}>
                        {rk.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[120px]">
                  <span className="text-[11px] font-semibold text-gray-400">Kısa Kol Hedefi</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={r.short_leg_target}
                    onChange={(e) => setRule(i, { short_leg_target: Number(e.target.value) || 0 })}
                    className={`${inputCls} mt-0.5 py-1.5`}
                  />
                </div>
                <div className="min-w-[120px]">
                  <span className="text-[11px] font-semibold text-gray-400">Kişisel PV Kotası</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={r.personal_pv_quota}
                    onChange={(e) => setRule(i, { personal_pv_quota: Number(e.target.value) || 0 })}
                    className={`${inputCls} mt-0.5 py-1.5`}
                  />
                </div>
                <AdminBtn
                  size="xs"
                  variant="danger"
                  onClick={() => setRules(rules.filter((_, idx) => idx !== i))}
                >
                  Sil
                </AdminBtn>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {/* Aksiyonlar */}
      <div className="flex justify-end gap-2 pt-1">
        <AdminBtn variant="outline" onClick={onCancel}>
          Vazgeç
        </AdminBtn>
        <AdminBtn onClick={submit} disabled={saving}>
          {saving ? "Kaydediliyor…" : initial ? "Güncelle" : "Oluştur"}
        </AdminBtn>
      </div>
    </div>
  );
}

// ── Düzenleme/Oluşturma sayfası ───────────────────────────────────────

export function PromotionEditPage({ id }: { id?: number }) {
  const router = useRouter();
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [initial, setInitial] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState("");

  useEffect(() => {
    listAdminRanks()
      .then(setRanks)
      .catch(() => {});
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        const all = await listPromotions();
        const found = all.find((p) => p.id === id) ?? null;
        if (!alive) return;
        if (!found) setError("Kampanya/promosyon bulunamadı.");
        setInitial(found);
      } catch (e) {
        if (alive) setError(getErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const handleSave = async (input: PromotionInput) => {
    if (id) {
      await updatePromotion(id, input);
    } else {
      await createPromotion(input);
    }
    router.push("/promosyonlar");
  };

  return (
    <div className="mx-auto max-w-4xl">
      <AdminHeader
        title={id ? "Kampanya/Promosyonu Düzenle" : "Yeni Kampanya/Promosyon"}
        subtitle={
          id
            ? "Kaydı güncelleyin — değişiklikler kaydedince listeye dönülür."
            : "Tür, tarih aralığı, kotlar ve kariyer bazlı hedefleri belirleyin."
        }
      />

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      {loading ? (
        <AdminCard>
          <AdminSpinner label="Kayıt yükleniyor…" />
        </AdminCard>
      ) : id && !initial ? (
        <AdminCard>
          <p className="py-10 text-center text-sm text-gray-400">Kayıt bulunamadı.</p>
        </AdminCard>
      ) : (
        <PromotionForm
          initial={initial}
          ranks={ranks}
          onSave={handleSave}
          onCancel={() => router.push("/promosyonlar")}
        />
      )}
    </div>
  );
}
