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
} from "@/components/admin/AdminUI";
import {
  listBenefits,
  createBenefit,
  updateBenefit,
  deleteBenefit,
  getErrorMessage,
  type Benefit,
  type BenefitInput,
} from "@/lib/api";

const emptyForm: BenefitInput = {
  title: "",
  description: "",
  icon: "shipping",
  sort_order: 1,
  is_active: true,
};

export default function GuvenlikSeridiPage() {
  const [items, setItems] = useState<Benefit[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BenefitInput>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    listBenefits()
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

  const openEdit = (b: Benefit) => {
    setEditingId(b.id);
    setForm({
      title: b.title,
      description: b.description,
      icon: b.icon,
      sort_order: b.sort_order,
      is_active: b.is_active,
    });
    setError("");
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Başlık ve açıklama zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) await updateBenefit(editingId, form);
      else await createBenefit(form);
      setNotice(editingId ? "Güvenlik şeridi güncellendi." : "Güvenlik şeridi eklendi.");
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
      await deleteBenefit(delId);
      setNotice("Güvenlik şeridi silindi.");
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
  if (items === null) return <AdminSpinner label="Güvenlik şeridi yükleniyor…" />;

  return (
    <div>
      <AdminHeader
        title="Güvenlik Şeridi"
        subtitle="Anasayfadaki güven/garanti şeridini yönetin — ikon, başlık, açıklama; ekleyin, düzenleyin, silin."
        actions={<AdminBtn onClick={openNew}>+ Yeni Şerit</AdminBtn>}
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && items !== null && <AdminAlert kind="error">{error}</AdminAlert>}

      {formOpen && (
        <div className="mb-5">
          <AdminCard
            title={editingId ? `Şeridi Düzenle (#${editingId})` : "Yeni Şerit"}
            subtitle="İkon adı, başlık ve açıklama; sıra ve aktiflik belirleyin."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>İkon Adı</label>
                <input
                  className={inputCls}
                  placeholder="shipping / truck / shield-check / gift"
                  value={form.icon}
                  onChange={(e) =>
                    setForm({ ...form, icon: e.target.value.trim().toLowerCase() })
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Başlık</label>
                <input
                  className={inputCls}
                  placeholder="Kargo Bedava"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Açıklama</label>
                <input
                  className={inputCls}
                  placeholder="500 TL ve üzeri siparişlerde"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Sıra</label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: Number(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="flex items-center gap-6 sm:col-span-2">
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
        <AdminEmpty>Henüz şerit yok. "Yeni Şerit" ile ekleyin.</AdminEmpty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((b) => (
            <div
              key={b.id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-sm font-semibold uppercase tracking-wide text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                  {b.icon.slice(0, 2) || "★"}
                </span>
                <AdminBadge color={b.is_active ? "green" : "gray"}>
                  {b.is_active ? "Aktif" : "Pasif"}
                </AdminBadge>
              </div>
              <div className="font-semibold text-gray-800 dark:text-white/90">
                {b.title}
              </div>
              <div className="mt-0.5 flex-1 text-sm text-gray-500 dark:text-gray-400">
                {b.description}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Sıra: {b.sort_order}
                </span>
                <div>
                  <AdminBtn variant="outline" size="xs" onClick={() => openEdit(b)} className="mr-1">
                    Düzenle
                  </AdminBtn>
                  <AdminBtn variant="danger" size="xs" onClick={() => setDelId(b.id)}>
                    Sil
                  </AdminBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal
        open={delId !== null}
        title="Şerit Sil"
        tone="danger"
        onClose={() => setDelId(null)}
      >
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
          Bu güvenlik şeridi kalıcı olarak silinecek. Emin misiniz?
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
