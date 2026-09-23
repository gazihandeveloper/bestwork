"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminModal,
  inputCls,
  labelCls,
} from "@/components/admin/AdminUI";
import {
  listEarningPlans,
  createEarningPlan,
  updateEarningPlan,
  deleteEarningPlan,
  listRanks,
  getErrorMessage,
  type EarningPlan,
  type EarningPlanInput,
  type EarningPlanRate,
  type Rank,
} from "@/lib/api";

const PAYOUT: Record<string, string> = { gelir: "Gelir", puan: "Puan", bonus: "Bonus" };
const SCOPE: Record<string, string> = { tree: "Ağaç bazlı", product: "Ürün bazlı" };
const PERIOD: Record<string, string> = { daily: "Günlük", weekly: "Haftalık", monthly: "Aylık" };
const ACTIVITY: Record<string, string> = {
  none: "Aktiflik kontrol edilmesin",
  personal: "Kişisel aktiflik",
  team: "Ekip aktifliği",
};

const emptyPlan: EarningPlanInput = {
  code: "",
  title: "",
  description: "",
  payout_type: "gelir",
  max_rate: 100,
  scope: "tree",
  period: "monthly",
  activity_mode: "none",
  check_matching: true,
  depth: 0,
  sort_order: 1,
  is_active: true,
  rates: [],
};

export default function NetworkSettingsPage() {
  const [plans, setPlans] = useState<EarningPlan[] | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<EarningPlanInput>({ ...emptyPlan });
  const [rates, setRates] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [delId, setDelId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    listEarningPlans()
      .then(setPlans)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    load();
    listRanks()
      .then(setRanks)
      .catch(() => {});
  }, []);

  const select = (p: EarningPlan) => {
    setSelectedId(p.id);
    setCreating(false);
    setNotice("");
    setError("");
    setForm({
      code: p.code,
      title: p.title,
      description: p.description ?? "",
      payout_type: p.payout_type,
      max_rate: p.max_rate,
      scope: p.scope,
      period: p.period,
      activity_mode: p.activity_mode,
      check_matching: p.check_matching,
      depth: p.depth,
      sort_order: p.sort_order,
      is_active: p.is_active,
      rates: p.rates ?? [],
    });
    const map: Record<string, number> = {};
    (p.rates ?? []).forEach((r) => (map[`${r.rank_id}:${r.depth}`] = r.rate));
    setRates(map);
  };

  const startNew = () => {
    setSelectedId(null);
    setCreating(true);
    setNotice("");
    setError("");
    setForm({ ...emptyPlan, sort_order: (plans?.length ?? 0) + 1 });
    setRates({});
  };

  const depth = Math.max(0, Number(form.depth) || 0);

  const collectedRates = useMemo<EarningPlanRate[]>(() => {
    const out: EarningPlanRate[] = [];
    for (const r of ranks) {
      for (let d = 1; d <= depth; d++) {
        const v = Number(rates[`${r.id}:${d}`] || 0);
        if (v > 0) out.push({ rank_id: r.id, depth: d, rate: v });
      }
    }
    return out;
  }, [ranks, depth, rates]);

  const save = async () => {
    if (!form.title.trim()) return setError("Başlık zorunludur.");
    if (!creating && !form.code.trim()) return setError("Kod zorunludur.");
    if (creating && !form.code.trim()) return setError("Kod zorunludur (ör. custom_bonus).");
    setSaving(true);
    setError("");
    try {
      const payload: EarningPlanInput = { ...form, rates: collectedRates };
      if (creating) await createEarningPlan(payload);
      else if (selectedId) await updateEarningPlan(selectedId, payload);
      setNotice(creating ? "Kazanç kalemi eklendi." : "Kazanç kalemi güncellendi.");
      setCreating(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!delId) return;
    setDeleting(true);
    try {
      await deleteEarningPlan(delId);
      setNotice("Kazanç kalemi silindi.");
      setDelId(null);
      if (selectedId === delId) startNew();
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const showEditor = creating || selectedId !== null;

  if (error && plans === null) return <AdminAlert kind="error">{error}</AdminAlert>;
  if (plans === null) return <AdminSpinner label="Kazanç planı yükleniyor…" />;

  return (
    <div>
      <AdminHeader
        title="Network Ayarları"
        subtitle="Kazanç planınızı sisteme entegre edin: kalem başlıkları, tür (gelir/puan/bonus), maksimum oran, kapsam, dönem, aktiflik, derinlik, eşleşme ve kariyer × derinlik oranları."
        actions={
          <>
            <AdminBtn variant="outline" onClick={startNew}>
              + Yeni Kalem
            </AdminBtn>
          </>
        }
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && plans !== null && <AdminAlert kind="error">{error}</AdminAlert>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Kalem listesi */}
        <AdminCard title={`Kazanç Kalemleri (${plans.length})`} subtitle="Düzenlemek için seçin.">
          <div className="flex flex-col gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => select(p)}
                className={`cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  selectedId === p.id
                    ? "border-brand-400 bg-brand-50 dark:bg-white/[0.04]"
                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800 dark:text-white/90">{p.title}</span>
                  <AdminBadge color={p.is_active ? "green" : "gray"}>{p.is_active ? "Aktif" : "Pasif"}</AdminBadge>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/10">{PAYOUT[p.payout_type] ?? p.payout_type}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/10">{SCOPE[p.scope] ?? p.scope}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/10">{PERIOD[p.period] ?? p.period}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/10">maks %{Number(p.max_rate).toLocaleString("tr-TR")}</span>
                  {p.depth > 0 && <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/10">{p.depth} derinlik</span>}
                </div>
              </button>
            ))}
          </div>
        </AdminCard>

        {/* Düzenleyici */}
        {showEditor ? (
          <AdminCard
            title={creating ? "Yeni Kazanç Kalemi" : `Kalemi Düzenle: ${form.title || ""}`}
            subtitle="Tüm alanlar kazanç planınıza göre düzenlenir."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelCls}>Kod (benzersiz) *</label>
                <input
                  className={inputCls}
                  placeholder="ör. custom_bonus"
                  value={form.code}
                  disabled={!creating}
                  onChange={(e) => setForm({ ...form, code: e.target.value.trim().toLowerCase() })}
                />
              </div>
              <div>
                <label className={labelCls}>Başlık *</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Tür</label>
                <select className={inputCls} value={form.payout_type} onChange={(e) => setForm({ ...form, payout_type: e.target.value })}>
                  <option value="gelir">Gelir</option>
                  <option value="puan">Puan</option>
                  <option value="bonus">Bonus</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Maksimum Dağıtım Oranı (%)</label>
                <input type="number" min={0} max={100} step="0.01" className={inputCls} value={form.max_rate}
                  onChange={(e) => setForm({ ...form, max_rate: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className={labelCls}>Kapsam</label>
                <select className={inputCls} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                  <option value="tree">Ağaç bazlı</option>
                  <option value="product">Ürün bazlı</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Dönem</label>
                <select className={inputCls} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                  <option value="daily">Günlük</option>
                  <option value="weekly">Haftalık</option>
                  <option value="monthly">Aylık</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Aktiflik</label>
                <select className={inputCls} value={form.activity_mode} onChange={(e) => setForm({ ...form, activity_mode: e.target.value })}>
                  <option value="none">Aktiflik kontrol edilmesin</option>
                  <option value="personal">Kişisel aktiflik</option>
                  <option value="team">Ekip aktifliği</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Derinlik (nesil)</label>
                <input type="number" min={0} className={inputCls} value={form.depth}
                  onChange={(e) => setForm({ ...form, depth: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className={labelCls}>Sıra</label>
                <input type="number" className={inputCls} value={form.sort_order ?? 1}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 1 })} />
              </div>
              <div className="flex items-end gap-4 pb-1 sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    checked={form.check_matching} onChange={(e) => setForm({ ...form, check_matching: e.target.checked })} />
                  Eşleşmeye dahil
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  Aktif
                </label>
              </div>
            </div>

            <div className="mt-4">
              <label className={labelCls}>Kısa Açıklama (bayiye görünür)</label>
              <textarea className={inputCls} rows={2} value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Kariyer × derinlik oran matrisi */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <label className={labelCls}>Kariyer × Derinlik Oranları (%)</label>
                <span className="text-xs text-gray-400">Boş/0 = o kariyer-derinlik için ödeme yok.</span>
              </div>
              {depth === 0 ? (
                <p className="text-sm text-gray-400">Bu kalem için derinlik 0 (tek seviye). Oran girmek için derinliği artırın.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-2 py-2 text-left fw-600 text-gray-500">Kariyer</th>
                        {Array.from({ length: depth }, (_, i) => (
                          <th key={i} className="px-2 py-2 text-center fw-600 text-gray-500">{i + 1}. nesil</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {ranks.map((r) => (
                        <tr key={r.id}>
                          <td className="px-2 py-1.5 whitespace-nowrap text-gray-700 dark:text-gray-300">{r.name.toUpperCase()}</td>
                          {Array.from({ length: depth }, (_, i) => {
                            const d = i + 1;
                            const key = `${r.id}:${d}`;
                            return (
                              <td key={d} className="px-1 py-1">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className="w-20 rounded-md border border-gray-200 px-2 py-1 text-center text-sm dark:border-gray-800 dark:bg-transparent"
                                  value={rates[key] ?? ""}
                                  placeholder="0"
                                  onChange={(e) => setRates({ ...rates, [key]: Number(e.target.value) || 0 })}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <AdminBtn onClick={save} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</AdminBtn>
              <AdminBtn variant="outline" onClick={() => { setCreating(false); setSelectedId(null); }}>Kapat</AdminBtn>
              {!creating && selectedId && (
                <AdminBtn variant="danger" onClick={() => setDelId(selectedId)}>Sil</AdminBtn>
              )}
            </div>
          </AdminCard>
        ) : (
          <AdminCard title="Kazanç Kalemi Seçin" subtitle="Soldaki listeden bir kalem seçin ya da yeni ekleyin.">
            <p className="py-10 text-center text-gray-400 dark:text-gray-500">
              Kazanç planı kalemlerini buradan yönetin: başlık, tür, oran, dönem, aktiflik, derinlik, eşleşme ve oran matrisi.
            </p>
          </AdminCard>
        )}
      </div>

      <AdminModal open={delId !== null} title="Kazanç Kalemini Sil" tone="danger" onClose={() => setDelId(null)}>
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
          Bu kazanç kalemi ve oranları silinecek. Emin misiniz?
        </p>
        <div className="flex justify-end gap-2">
          <AdminBtn variant="outline" onClick={() => setDelId(null)}>Vazgeç</AdminBtn>
          <AdminBtn variant="danger" onClick={confirmDelete} disabled={deleting}>{deleting ? "Siliniyor…" : "Sil"}</AdminBtn>
        </div>
      </AdminModal>
    </div>
  );
}
