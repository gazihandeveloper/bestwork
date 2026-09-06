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
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getErrorMessage,
  type Category,
  type CategoryInput,
} from "@/lib/api";

const emptyForm: CategoryInput = {
  name: "",
  slug: "",
  icon: "tag",
  description: "",
  sort_order: 1,
  is_active: true,
};

const cleanPayload = (f: CategoryInput): CategoryInput => ({
  ...f,
  slug: f.slug?.trim() ? f.slug.trim() : undefined,
  description: f.description?.trim() ? f.description.trim() : undefined,
});

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryInput>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    listCategories(true)
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: (items?.length ?? 0) + 1 });
    setError("");
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug ?? "",
      icon: c.icon || "tag",
      description: c.description ?? "",
      sort_order: c.sort_order,
      is_active: c.is_active,
    });
    setError("");
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("Kategori adı zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = cleanPayload(form);
      if (editingId) await updateCategory(editingId, payload);
      else await createCategory(payload);
      setNotice(editingId ? "Kategori güncellendi." : "Kategori eklendi.");
      setFormOpen(false);
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
      await deleteCategory(delId);
      setNotice("Kategori silindi.");
      setDelId(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (error && items === null)
    return <AdminAlert kind="error">{error}</AdminAlert>;
  if (items === null) return <AdminSpinner label="Kategoriler yükleniyor…" />;

  return (
    <div>
      <AdminHeader
        title="Kategoriler"
        subtitle="Ürün kategorilerini yönetin — ad, slug, ikon, sıra ve aktiflik; ekleyin, düzenleyin, silin."
        actions={<AdminBtn onClick={openNew}>+ Yeni Kategori</AdminBtn>}
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && items !== null && <AdminAlert kind="error">{error}</AdminAlert>}

      {formOpen && (
        <div className="mb-5">
          <AdminCard
            title={editingId ? `Kategoriyi Düzenle (#${editingId})` : "Yeni Kategori"}
            subtitle="Ad zorunludur; slug boş bırakılırsa otomatik üretilebilir."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelCls}>Ad *</label>
                <input
                  className={inputCls}
                  placeholder="Cilt Bakımı"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Slug (opsiyonel)</label>
                <input
                  className={inputCls}
                  placeholder="cilt-bakimi"
                  value={form.slug ?? ""}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                />
              </div>
              <div>
                <label className={labelCls}>İkon Adı (opsiyonel)</label>
                <input
                  className={inputCls}
                  placeholder="tag"
                  value={form.icon ?? ""}
                  onChange={(e) => setForm({ ...form, icon: e.target.value.trim().toLowerCase() })}
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
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    checked={form.is_active ?? true}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  Aktif
                </label>
              </div>
            </div>
            <div className="mt-4">
              <label className={labelCls}>Açıklama</label>
              <textarea
                className={inputCls}
                rows={2}
                placeholder="Kategori hakkında kısa açıklama (opsiyonel)"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
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
        <AdminEmpty>
          Henüz kategori yok. "Yeni Kategori" ile ekleyin.
        </AdminEmpty>
      ) : (
        <AdminCard
          title={`Kategoriler (${items.length})`}
          subtitle="Pasif kategoriler de yönetim listesinde görünür."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className={thCls}>Ad</th>
                  <th className={thCls}>Slug</th>
                  <th className={thCls}>Açıklama</th>
                  <th className={thCls}>Sıra</th>
                  <th className={thCls}>Durum</th>
                  <th className={`${thCls} text-right`}>İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className={`${tdCls} font-medium text-gray-800 dark:text-white/90`}>
                      {c.name}
                    </td>
                    <td className={`${tdCls} text-gray-500 dark:text-gray-400`}>
                      {c.slug || "—"}
                    </td>
                    <td className={`${tdCls} text-gray-500 dark:text-gray-400`}>
                      {c.description || "—"}
                    </td>
                    <td className={tdCls}>{c.sort_order}</td>
                    <td className={tdCls}>
                      <AdminBadge color={c.is_active ? "green" : "gray"}>
                        {c.is_active ? "Aktif" : "Pasif"}
                      </AdminBadge>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <AdminBtn variant="outline" size="xs" onClick={() => openEdit(c)} className="mr-1">
                        Düzenle
                      </AdminBtn>
                      <AdminBtn variant="danger" size="xs" onClick={() => setDelId(c.id)}>
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
        open={delId !== null}
        title="Kategori Sil"
        tone="danger"
        onClose={() => setDelId(null)}
      >
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
          Bu kategori kalıcı olarak silinecek. Bu kategoriye bağlı ürünler
          silinmez (bağlantıları kaldırılır). Emin misiniz?
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
