"use client";

import { useEffect, useState } from "react";
import { MaterialIcon, materialName } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import {
  listBenefits,
  createBenefit,
  updateBenefit,
  deleteBenefit,
  getErrorMessage,
  type Benefit,
  type BenefitInput,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// İkon adı çözümü: kullanıcı kebab-case yazar (örn. "chevron-down").
// Eski kayıtlardaki anahtarlar lucide adlarına eşlenir.
const ICON_ALIAS: Record<string, string> = {
  shipping: "truck",
  payment: "shield-check",
  pv: "gift",
  support: "headphones",
};

const toPascal = (name: string) =>
  name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");

const iconFor = (key: string, size = 18) => {
  const resolved = ICON_ALIAS[key] ?? key;
  return <MaterialIcon name={materialName(toPascal(resolved))} size={size} />;
};

const emptyForm: BenefitInput = { title: "", description: "", icon: "shipping", sort_order: 1, is_active: true };

export default function TrustBarPage() {
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

  useEffect(load, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: (items?.length ?? 0) + 1 });
    setFormOpen(true);
  };

  const openEdit = (b: Benefit) => {
    setEditingId(b.id);
    setForm({ title: b.title, description: b.description, icon: b.icon, sort_order: b.sort_order, is_active: b.is_active });
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

  if (error && items === null) return <PanelLayout><ErrorAlert>{error}</ErrorAlert></PanelLayout>;
  if (items === null) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader title="Güvenlik Şeridi" subtitle="Anasayfadaki güven/garanti şeridini yönetin — ikon, başlık, açıklama; ekleyin, düzenleyin, silin." />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && items !== null && <div className="alert alert-danger py-2">{error}</div>}

      <div className="mb-3">
        <button className="btn btn-primary" onClick={openNew}>
          <MaterialIcon name="Plus" size={15} className="me-1" /> Yeni Şerit
        </button>
      </div>

      {formOpen && (
        <PageCard
          title={editingId ? `Şeridi Düzenle (#${editingId})` : "Yeni Şerit"}
          subtitle="İkon seçin, başlık ve açıklamayı yazın; sıra ve aktiflik belirleyin."
          className="mb-3"
        >
          <div className="row g-3">
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
                  placeholder="chevron-down"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value.trim().toLowerCase() })}
                />
                <span className="input-group-text bg-white">{iconFor(form.icon)}</span>
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label">Başlık</label>
              <input className="form-control" placeholder="Kargo Bedava" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Açıklama</label>
              <input className="form-control" placeholder="500 TL ve üzeri siparişlerde" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Sıra</label>
              <input type="number" className="form-control" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 1 })} />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" id="tbActive" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <label className="form-check-label" htmlFor="tbActive">Aktif</label>
              </div>
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
        <InfoAlert>Henüz şerit yok. "Yeni Şerit" ile ekleyin.</InfoAlert>
      ) : (
        <div className="row">
          {items.map((b) => (
            <div key={b.id} className="col-12 col-md-6 col-xl-3 mb-3">
              <div className="card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="border rounded p-2 text-primary bg-light">{iconFor(b.icon)}</span>
                    <span className={cn("badge", b.is_active ? "text-bg-success" : "text-bg-secondary")}>
                      {b.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  <div className="fw-bold">{b.title}</div>
                  <div className="text-muted small flex-grow-1">{b.description}</div>
                  <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                    <span className="text-muted small">Sıra: {b.sort_order}</span>
                    <div>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(b)} aria-label="Düzenle">
                        <MaterialIcon name="Pencil" size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setDelId(b.id)} aria-label="Sil">
                        <MaterialIcon name="Trash2" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={delId !== null}
        title="Şerit Sil"
        tone="danger"
        confirmText="Sil"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDelId(null)}
      >
        Bu güvenlik şeridi kalıcı olarak silinecek. Emin misiniz?
      </ConfirmModal>
    </PanelLayout>
  );
}
