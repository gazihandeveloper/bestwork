"use client";

import { useEffect, useState } from "react";
import { MaterialIcon, materialName } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getErrorMessage,
  type Category,
  type CategoryInput,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// İkon adı çözümü (guvenlik-seridi deseni): kullanıcı kebab-case yazar (örn. "tag").
// Bilinmeyen adlarda varsayılan "tag" ikonu gösterilir.
const ICON_ALIAS: Record<string, string> = {
  category: "tag",
};

const toPascal = (name: string) =>
  name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");

const iconFor = (key: string, size = 18) => {
  const resolved = ICON_ALIAS[key] ?? key;
  return <MaterialIcon name={materialName(toPascal(resolved))} size={size} />;
};

const emptyForm: CategoryInput = {
  name: "",
  slug: "",
  icon: "tag",
  description: "",
  sort_order: 1,
  is_active: true,
};

// Boş slug gönderilmez; backend kendi üretsin ya da NULL kalsın.
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

  // Yönetim görünümü: pasif kategoriler de listede görünsün.
  const load = () => {
    listCategories(true)
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: (items?.length ?? 0) + 1 });
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

  if (error && items === null) return <PanelLayout><ErrorAlert>{error}</ErrorAlert></PanelLayout>;
  if (items === null) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader
        title="Kategoriler"
        subtitle="Ürün kategorilerini yönetin — ad, slug, ikon, sıra ve aktiflik; ekleyin, düzenleyin, silin."
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && items !== null && <div className="alert alert-danger py-2">{error}</div>}

      <div className="mb-3">
        <button className="btn btn-primary" onClick={openNew}>
          <MaterialIcon name="Plus" size={15} className="me-1" /> Yeni Kategori
        </button>
      </div>

      {formOpen && (
        <PageCard
          title={editingId ? `Kategoriyi Düzenle (#${editingId})` : "Yeni Kategori"}
          subtitle="Ad zorunludur; slug boş bırakılırsa otomatik üretilebilir. İkon adını Google Material Symbols'tan kopyalayın."
          className="mb-3"
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Ad *</label>
              <input
                className="form-control"
                placeholder="Cilt Bakımı"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">
                Slug
                <span className="text-muted small ms-1">(opsiyonel, örn. cilt-bakimi)</span>
              </label>
              <input
                className="form-control"
                placeholder="cilt-bakimi"
                value={form.slug ?? ""}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">
                İkon Adı
                <a
                  href="https://fonts.google.com/icons"
                  target="_blank"
                  rel="noreferrer"
                  className="ms-2 small text-primary text-decoration-none"
                >
                  Tüm ikonlar için Material Symbols &rarr;
                </a>
              </label>
              <div className="input-group">
                <input
                  className="form-control"
                  placeholder="tag"
                  value={form.icon ?? ""}
                  onChange={(e) => setForm({ ...form, icon: e.target.value.trim().toLowerCase() })}
                />
                <span className="input-group-text bg-white">{iconFor(form.icon ?? "tag")}</span>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label">Sıra</label>
              <input
                type="number"
                className="form-control"
                value={form.sort_order ?? 1}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 1 })}
              />
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="catActive"
                  checked={form.is_active ?? true}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="catActive">Aktif</label>
              </div>
            </div>
            <div className="col-12">
              <label className="form-label">Açıklama</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Kategori hakkında kısa açıklama (opsiyonel)"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="col-12">
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />}
                {editingId ? "Güncelle" : "Kaydet"}
              </button>
              <button className="btn btn-outline-secondary ms-2" onClick={() => setFormOpen(false)}>Vazgeç</button>
            </div>
          </div>
        </PageCard>
      )}

      {items.length === 0 ? (
        <InfoAlert>Henüz kategori yok. "Yeni Kategori" ile ekleyin.</InfoAlert>
      ) : (
        <PageCard title={`Kategoriler (${items.length})`} bodyClassName="p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>İkon</th>
                  <th>Ad</th>
                  <th>Slug</th>
                  <th>Açıklama</th>
                  <th style={{ width: 70 }}>Sıra</th>
                  <th style={{ width: 90 }}>Durum</th>
                  <th style={{ width: 110 }} className="text-end">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="border rounded p-2 text-primary bg-light d-inline-flex">
                        {iconFor(c.icon)}
                      </span>
                    </td>
                    <td className="fw-bold">{c.name}</td>
                    <td>
                      <code className="text-muted">{c.slug || "—"}</code>
                    </td>
                    <td className="text-muted small">{c.description || "—"}</td>
                    <td>{c.sort_order}</td>
                    <td>
                      <span className={cn("badge", c.is_active ? "text-bg-success" : "text-bg-secondary")}>
                        {c.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(c)} aria-label="Düzenle">
                        <MaterialIcon name="Pencil" size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setDelId(c.id)} aria-label="Sil">
                        <MaterialIcon name="Trash2" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}

      <ConfirmModal
        open={delId !== null}
        title="Kategori Sil"
        tone="danger"
        confirmText="Sil"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDelId(null)}
      >
        Bu kategori kalıcı olarak silinecek. Bu kategoriye bağlı ürünler silinmez
        (bağlantıları kaldırılır). Emin misiniz?
      </ConfirmModal>
    </PanelLayout>
  );
}
