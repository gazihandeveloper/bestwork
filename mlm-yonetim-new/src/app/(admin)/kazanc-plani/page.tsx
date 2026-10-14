"use client";

import { useEffect, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  AdminModal,
  inputCls,
  labelCls,
  tdCls,
  thCls,
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

// description formda her zaman string tutulur; kaydedilirken boşsa null gönderilir.
type PlanForm = Omit<EarningPlanInput, "description"> & { description: string };

const emptyForm: PlanForm = {
  code: "",
  title: "",
  description: "",
  payout_type: "gelir",
  max_rate: 0,
  scope: "product",
  period: "weekly",
  activity_mode: "none",
  check_matching: false,
  depth: 1,
  sort_order: 1,
  is_active: true,
  rates: [],
};

const PAYOUT_LABELS: Record<string, string> = {
  gelir: "Gelir",
  puan: "Puan",
  bonus: "Bonus",
};

const SCOPE_LABELS: Record<string, string> = {
  product: "Ürün",
  tree: "Ağaç",
};

const PERIOD_LABELS: Record<string, string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
};

const ACTIVITY_LABELS: Record<string, string> = {
  none: "Yok",
  personal: "Kişisel",
  team: "Ekip",
};

export default function KazancPlaniPage() {
  const [items, setItems] = useState<EarningPlan[] | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  // rates mini-form alanları
  const [rateRankId, setRateRankId] = useState<number | null>(null);
  const [rateDepth, setRateDepth] = useState(1);
  const [rateValue, setRateValue] = useState(0);

  const load = () => {
    listEarningPlans()
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    load();
    listRanks()
      .then((rs) => {
        setRanks(rs);
        if (rs.length > 0) setRateRankId((prev) => prev ?? rs[0].id);
      })
      .catch(() => {});
  }, []);

  const rankName = (id: number) => ranks.find((r) => r.id === id)?.name ?? `#${id}`;

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: (items?.length ?? 0) + 1 });
    setError("");
    setFormOpen(true);
  };

  const openEdit = (p: EarningPlan) => {
    setEditingId(p.id);
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
      rates: p.rates ? [...p.rates] : [],
    });
    setError("");
    setFormOpen(true);
  };

  const addRate = () => {
    if (!rateRankId) {
      setError("Önce bir kariyer seçin (kariyer listesi yüklenmemiş olabilir).");
      return;
    }
    const row: EarningPlanRate = {
      rank_id: rateRankId,
      depth: Number(rateDepth) || 1,
      rate: Number(rateValue) || 0,
    };
    setForm((f) => ({
      ...f,
      rates: [...f.rates, row],
    }));
    setError("");
  };

  const removeRate = (i: number) => {
    setForm((f) => ({ ...f, rates: f.rates.filter((_, idx) => idx !== i) }));
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Başlık zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    const input: EarningPlanInput = {
      ...form,
      title: form.title.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
    };
    try {
      if (editingId) await updateEarningPlan(editingId, input);
      else await createEarningPlan(input);
      setNotice(editingId ? "Kazanç kalemi güncellendi." : "Kazanç kalemi eklendi.");
      setFormOpen(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (p: EarningPlan) => {
    if (
      !window.confirm(
        `"${p.title}" kazanç kalemi silinecek. Bu işlem geri alınamaz. Emin misiniz?`
      )
    )
      return;
    setError("");
    try {
      await deleteEarningPlan(p.id);
      setNotice("Kazanç kalemi silindi.");
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (error && items === null) return <AdminAlert kind="error">{error}</AdminAlert>;
  if (items === null) return <AdminSpinner label="Kazanç planı yükleniyor…" />;

  return (
    <div>
      <AdminHeader
        title="Kazanç Planı"
        subtitle="Kazanç kalemlerini tanımlayın — ödeme türü, kapsam, dönem ve kariyer × derinlik oranları; komisyon hesaplaması bu planlara göre çalışır."
        actions={<AdminBtn onClick={openNew}>+ Yeni Kazanç Kalemi</AdminBtn>}
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && items !== null && <AdminAlert kind="error">{error}</AdminAlert>}

      {items.length === 0 ? (
        <AdminEmpty>Henüz kazanç kalemi yok. "Yeni Kazanç Kalemi" ile ekleyin.</AdminEmpty>
      ) : (
        <AdminCard title={`Kazanç Kalemleri (${items.length})`} subtitle="Yalnız “Aktif” olan kalemler hesaplamada dikkate alınır.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className={thCls}>Başlık</th>
                  <th className={thCls}>Kod</th>
                  <th className={thCls}>Ödeme Türü</th>
                  <th className={thCls}>Kapsam</th>
                  <th className={thCls}>Dönem</th>
                  <th className={thCls}>Durum</th>
                  <th className={thCls}>Sıra</th>
                  <th className={`${thCls} text-right`}>İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className={`${tdCls} font-medium text-gray-800 dark:text-white/90`}>
                      {p.title}
                    </td>
                    <td className={`${tdCls} font-mono text-xs text-gray-500 dark:text-gray-400`}>
                      {p.code || "—"}
                    </td>
                    <td className={`${tdCls} text-gray-700 dark:text-gray-300`}>
                      {PAYOUT_LABELS[p.payout_type] ?? p.payout_type}
                    </td>
                    <td className={`${tdCls} text-gray-700 dark:text-gray-300`}>
                      {SCOPE_LABELS[p.scope] ?? p.scope}
                    </td>
                    <td className={`${tdCls} text-gray-700 dark:text-gray-300`}>
                      {PERIOD_LABELS[p.period] ?? p.period}
                    </td>
                    <td className={tdCls}>
                      <AdminBadge color={p.is_active ? "green" : "gray"}>
                        {p.is_active ? "Aktif" : "Pasif"}
                      </AdminBadge>
                    </td>
                    <td className={tdCls}>{p.sort_order}</td>
                    <td className={`${tdCls} text-right`}>
                      <AdminBtn variant="outline" size="xs" onClick={() => openEdit(p)} className="mr-1">
                        Düzenle
                      </AdminBtn>
                      <AdminBtn variant="danger" size="xs" onClick={() => confirmDelete(p)}>
                        Sil
                      </AdminBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      <AdminModal
        open={formOpen}
        title={editingId ? `Kazanç Kalemini Düzenle (#${editingId})` : "Yeni Kazanç Kalemi"}
        size="lg"
        onClose={() => setFormOpen(false)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Başlık *</label>
            <input
              className={inputCls}
              placeholder="Mağaza Bonusu"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Kod</label>
            <input
              className={inputCls}
              placeholder="STORE_BONUS"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.trim().toUpperCase() })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Açıklama</label>
            <textarea
              className={inputCls}
              rows={2}
              placeholder="Bu kazancın nasıl hesaplandığını kısaca açıklayın"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Ödeme Türü</label>
            <select
              className={inputCls}
              value={form.payout_type}
              onChange={(e) => setForm({ ...form, payout_type: e.target.value })}
            >
              <option value="gelir">Gelir</option>
              <option value="puan">Puan</option>
              <option value="bonus">Bonus</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Kapsam</label>
            <select
              className={inputCls}
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
            >
              <option value="product">Ürün (ürüne özel oran)</option>
              <option value="tree">Ağaç (downline derinliği)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Dönem</label>
            <select
              className={inputCls}
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
            >
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Aktivite Şartı</label>
            <select
              className={inputCls}
              value={form.activity_mode}
              onChange={(e) => setForm({ ...form, activity_mode: e.target.value })}
            >
              <option value="none">Yok</option>
              <option value="personal">Kişisel</option>
              <option value="team">Ekip</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Maks. Oran (%)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputCls}
              value={form.max_rate}
              onChange={(e) => setForm({ ...form, max_rate: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className={labelCls}>Derinlik</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.depth}
              onChange={(e) => setForm({ ...form, depth: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className={labelCls}>Sıra</label>
            <input
              type="number"
              className={inputCls}
              value={form.sort_order ?? 1}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 1 })}
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                checked={form.check_matching}
                onChange={(e) => setForm({ ...form, check_matching: e.target.checked })}
              />
              Eşleşme kontrolü
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Aktif
            </label>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
            Kariyer × Derinlik Oranları
          </div>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            İsteğe bağlı: hangi kariyerin hangi derinlikte yüzde kazanacağını tanımlayın. Boş
            bırakılabilir.
          </p>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Kariyer</label>
              <select
                className={inputCls}
                value={rateRankId ?? ""}
                onChange={(e) => setRateRankId(Number(e.target.value) || null)}
              >
                {ranks.length === 0 && <option value="">Kariyer yok</option>}
                {ranks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Derinlik</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={rateDepth}
                onChange={(e) => setRateDepth(Number(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className={labelCls}>Oran %</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputCls}
                value={rateValue}
                onChange={(e) => setRateValue(Number(e.target.value) || 0)}
              />
            </div>
            <AdminBtn variant="outline" onClick={addRate}>
              + Ekle
            </AdminBtn>
          </div>
          {form.rates.length > 0 ? (
            <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
              {form.rates.map((r, i) => (
                <li
                  key={`${r.rank_id}-${r.depth}-${i}`}
                  className="flex items-center justify-between py-1.5 text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {rankName(r.rank_id)} · Seviye {r.depth} · %{r.rate}
                  </span>
                  <AdminBtn variant="danger" size="xs" onClick={() => removeRate(i)}>
                    Kaldır
                  </AdminBtn>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-gray-400">Henüz oran satırı eklenmedi.</p>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <AdminBtn onClick={save} disabled={saving}>
            {saving ? "Kaydediliyor…" : editingId ? "Güncelle" : "Kaydet"}
          </AdminBtn>
          <AdminBtn variant="outline" onClick={() => setFormOpen(false)}>
            Vazgeç
          </AdminBtn>
        </div>
      </AdminModal>
    </div>
  );
}
