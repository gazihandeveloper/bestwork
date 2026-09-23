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
  listTaxes,
  createTax,
  updateTax,
  deleteTax,
  listCategories,
  updateCategory,
  getErrorMessage,
  type Tax,
  type TaxInput,
  type Category,
} from "@/lib/api";

const STATUS: Record<string, { label: string; color: "green" | "gray" | "amber" }> = {
  active: { label: "Yayında", color: "green" },
  draft: { label: "Taslak", color: "gray" },
  pending: { label: "Bekliyor", color: "amber" },
};

const emptyForm: TaxInput = { title: "", rate: 20, sort_order: 1, status: "active" };

export default function TaxesPage() {
  const [items, setItems] = useState<Tax[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TaxInput>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    listTaxes(true)
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err)));
  };
  const loadCategories = () => {
    listCategories(true)
      .then(setCategories)
      .catch(() => {});
  };

  useEffect(() => {
    load();
    loadCategories();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: (items?.length ?? 0) + 1 });
    setSelectedCats(new Set());
    setError("");
    setFormOpen(true);
  };

  const openEdit = (t: Tax) => {
    setEditingId(t.id);
    setForm({ title: t.title, rate: t.rate, sort_order: t.sort_order, status: t.status });
    setSelectedCats(new Set(categories.filter((c) => c.tax_id === t.id).map((c) => c.id)));
    setError("");
    setFormOpen(true);
  };

  const toggleCat = (id: number) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Seçilen kategorileri bu vergiye bağlar; çıkarılanların vergisini kaldırır.
  const syncCategories = async (taxId: number) => {
    for (const c of categories) {
      const shouldHave = selectedCats.has(c.id);
      const hasThis = c.tax_id === taxId;
      if (shouldHave === hasThis) continue;
      await updateCategory(c.id, {
        name: c.name,
        slug: c.slug || undefined,
        icon: c.icon,
        description: c.description || undefined,
        sort_order: c.sort_order,
        is_active: c.is_active,
        tax_id: shouldHave ? taxId : null,
      });
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Vergi başlığı zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let taxId = editingId;
      if (editingId) {
        await updateTax(editingId, form);
      } else {
        const created = await createTax(form);
        taxId = created.id;
      }
      if (taxId) await syncCategories(taxId);
      setNotice(editingId ? "Vergi güncellendi." : "Vergi eklendi.");
      setFormOpen(false);
      load();
      loadCategories();
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
      await deleteTax(delId);
      setNotice("Vergi silindi.");
      setDelId(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (error && items === null) return <AdminAlert kind="error">{error}</AdminAlert>;
  if (items === null) return <AdminSpinner label="Vergiler yükleniyor…" />;

  return (
    <div>
      <AdminHeader
        title="Vergiler"
        subtitle="KDV/vergi oranları tanımlayın — başlık, yüzde, sıralama ve durum. Oran, kategorilere atanır ve siparişte otomatik hesaplanır."
        actions={<AdminBtn onClick={openNew}>+ Yeni Vergi</AdminBtn>}
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && items !== null && <AdminAlert kind="error">{error}</AdminAlert>}

      {formOpen && (
        <div className="mb-5">
          <AdminCard
            title={editingId ? `Vergiyi Düzenle (#${editingId})` : "Yeni Vergi"}
            subtitle="Fiyatlar KDV hariçtir; bu oran siparişte fiyatın üzerine eklenir."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelCls}>Başlık *</label>
                <input
                  className={inputCls}
                  placeholder="KDV %20"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Oran (%)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls}
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className={labelCls}>Sıralama</label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.sort_order ?? 1}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className={labelCls}>Durum</label>
                <select
                  className={inputCls}
                  value={form.status ?? "active"}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Yayında</option>
                  <option value="draft">Taslak</option>
                  <option value="pending">Bekliyor</option>
                </select>
              </div>
            </div>
            <div className="mt-5">
              <label className={labelCls}>Bu vergiyi uygula (kategoriler)</label>
              {categories.length === 0 ? (
                <p className="mt-1 text-sm text-gray-400">Henüz kategori yok.</p>
              ) : (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        checked={selectedCats.has(c.id)}
                        onChange={() => toggleCat(c.id)}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Seçilen kategorilerdeki ürünlerin siparişinde bu KDV oranı otomatik uygulanır.
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <AdminBtn onClick={save} disabled={saving}>
                {saving ? "Kaydediliyor…" : editingId ? "Güncelle" : "Kaydet"}
              </AdminBtn>
              <AdminBtn variant="outline" onClick={() => setFormOpen(false)}>
                Vazgeç
              </AdminBtn>
            </div>
          </AdminCard>
        </div>
      )}

      {items.length === 0 ? (
        <AdminEmpty>Henüz vergi tanımı yok. "Yeni Vergi" ile ekleyin.</AdminEmpty>
      ) : (
        <AdminCard title={`Vergi Tanımları (${items.length})`} subtitle="Yalnız “Yayında” olan vergiler siparişte uygulanır.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className={thCls}>Başlık</th>
                  <th className={thCls}>Oran</th>
                  <th className={thCls}>Sıra</th>
                  <th className={thCls}>Durum</th>
                  <th className={`${thCls} text-right`}>İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((t) => {
                  const st = STATUS[t.status] ?? { label: t.status, color: "gray" as const };
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className={`${tdCls} font-medium text-gray-800 dark:text-white/90`}>{t.title}</td>
                      <td className={`${tdCls} text-gray-700 dark:text-gray-300`}>%{Number(t.rate).toLocaleString("tr-TR")}</td>
                      <td className={tdCls}>{t.sort_order}</td>
                      <td className={tdCls}>
                        <AdminBadge color={st.color}>{st.label}</AdminBadge>
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <AdminBtn variant="outline" size="xs" onClick={() => openEdit(t)} className="mr-1">
                          Düzenle
                        </AdminBtn>
                        <AdminBtn variant="danger" size="xs" onClick={() => setDelId(t.id)}>
                          Sil
                        </AdminBtn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      <AdminModal open={delId !== null} title="Vergi Sil" tone="danger" onClose={() => setDelId(null)}>
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
          Bu vergi tanımı silinecek. Bu vergiyi kullanan kategorilerin vergisi kaldırılır.
          Emin misiniz?
        </p>
        <div className="flex justify-end gap-2">
          <AdminBtn variant="outline" onClick={() => setDelId(null)}>
            Vazgeç
          </AdminBtn>
          <AdminBtn variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? "Siliniyor…" : "Sil"}
          </AdminBtn>
        </div>
      </AdminModal>
    </div>
  );
}
