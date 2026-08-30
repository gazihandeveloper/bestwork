"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import {
  listHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  uploadFile,
  getErrorMessage,
  type HeroSlide,
  type HeroSlideInput,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// Görseller canlı domain üzerinden servis edilir ("/api" soneki olmadan).
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "")
  .replace(/\/api\/?$/, "") || (process.env.NODE_ENV === "development" ? "" : "https://mahmutgazihanarslan.com.tr");

const fileUrl = (p: string) => `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;

const emptyForm: HeroSlideInput = {
  title: "",
  subtitle: "",
  description: "",
  image_path: "",
  primary_button_text: "Alışverişe Başla",
  primary_button_link: "/shop",
  secondary_button_text: "Üye Ol",
  secondary_button_link: "/register",
  show_buttons: true,
  sort_order: 1,
  is_active: true,
};

// Görseli webp'e çevirir (canvas) ve yükler.
async function convertAndUpload(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const maxW = 1920;
  const scale = Math.min(1, maxW / bitmap.width);
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Görsel işlenemedi");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.85));
  if (!blob) throw new Error("WebP dönüşümü başarısız");
  return uploadFile(new File([blob], "slide.webp", { type: "image/webp" }));
}

export default function SliderPage() {
  const [slides, setSlides] = useState<HeroSlide[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<HeroSlideInput>({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = () => {
    listHeroSlides()
      .then(setSlides)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: (slides?.length ?? 0) + 1 });
    setFormOpen(true);
  };

  const openEdit = (s: HeroSlide) => {
    setEditingId(s.id);
    setForm({
      title: s.title,
      subtitle: s.subtitle ?? "",
      description: s.description ?? "",
      image_path: s.image_path,
      primary_button_text: s.primary_button_text ?? "",
      primary_button_link: s.primary_button_link ?? "",
      secondary_button_text: s.secondary_button_text ?? "",
      secondary_button_link: s.secondary_button_link ?? "",
      show_buttons: s.show_buttons,
      sort_order: s.sort_order,
      is_active: s.is_active,
    });
    setFormOpen(true);
  };

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const path = await convertAndUpload(file);
      setForm((f) => ({ ...f, image_path: path }));
      setNotice("Görsel WebP olarak yüklendi ve önizlendi.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.image_path) {
      setError("Rozet (üst yazı) ve görsel zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) await updateHeroSlide(editingId, form);
      else await createHeroSlide(form);
      setNotice(editingId ? "Slider güncellendi." : "Slider eklendi.");
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
      await deleteHeroSlide(delId);
      setNotice("Slider silindi.");
      setDelId(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (error && slides === null) return <PanelLayout><ErrorAlert>{error}</ErrorAlert></PanelLayout>;
  if (slides === null) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader title="Slider Yönetimi" subtitle="Ana sayfa hero slider'ını yönetin — görseller WebP'e çevrilir." />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && slides !== null && <div className="alert alert-danger py-2">{error}</div>}

      <div className="mb-3">
        <button className="btn btn-primary" onClick={openNew}>
          <MaterialIcon name="Plus" size={15} className="me-1" /> Yeni Slider
        </button>
      </div>

      {/* Form paneli */}
      {formOpen && (
        <PageCard
          title={editingId ? `Slider Düzenle (#${editingId})` : "Yeni Slider"}
          subtitle="Tüm alanlar düzenlenebilir; butonları tamamen kaldırabilir veya ekleyebilirsiniz."
          className="mb-3"
        >
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Görsel (WebP'e çevrilir)</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="form-control"
                onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
              />
              <div className="mt-2 position-relative border rounded overflow-hidden" style={{ height: 150, background: "#111" }}>
                {uploading ? (
                  <div className="d-flex align-items-center justify-content-center h-100">
                    <div className="spinner-border text-light" role="status" />
                  </div>
                ) : form.image_path ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileUrl(form.image_path)} alt="önizleme" className="w-100 h-100 object-fit-cover" />
                    <span className="position-absolute bottom-0 start-0 m-1 badge text-bg-dark">
                      <MaterialIcon name="Image" size={11} className="me-1" />WebP
                    </span>
                  </>
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-white-50">
                    <MaterialIcon name="Upload" size={22} />
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-8">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Rozet (üst yazı)</label>
                  <input className="form-control" placeholder="BESTWORK FIRSATLARI" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Ana Başlık</label>
                  <input className="form-control" placeholder="Zihin ve Beden Dengesi" value={form.subtitle ?? ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label">Açıklama</label>
                  <textarea className="form-control" rows={2} placeholder="Doğal ve katkısız ürünlerle sağlıklı yaşam." value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">1. Buton Yazısı</label>
                  <input className="form-control" placeholder="Alışverişe Başla" value={form.primary_button_text ?? ""} onChange={(e) => setForm({ ...form, primary_button_text: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">1. Buton Linki</label>
                  <input className="form-control" placeholder="/shop" value={form.primary_button_link ?? ""} onChange={(e) => setForm({ ...form, primary_button_link: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">2. Buton Yazısı</label>
                  <input className="form-control" placeholder="Üye Ol" value={form.secondary_button_text ?? ""} onChange={(e) => setForm({ ...form, secondary_button_text: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">2. Buton Linki</label>
                  <input className="form-control" placeholder="/register" value={form.secondary_button_link ?? ""} onChange={(e) => setForm({ ...form, secondary_button_link: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Sıra</label>
                  <input type="number" className="form-control" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 1 })} />
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <div className="form-check form-switch mb-2">
                    <input className="form-check-input" type="checkbox" id="showBtns" checked={form.show_buttons} onChange={(e) => setForm({ ...form, show_buttons: e.target.checked })} />
                    <label className="form-check-label" htmlFor="showBtns">
                      {form.show_buttons ? <MaterialIcon name="Eye" size={13} className="me-1" /> : <MaterialIcon name="EyeOff" size={13} className="me-1" />}
                      Butonları Göster
                    </label>
                  </div>
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <div className="form-check form-switch mb-2">
                    <input className="form-check-input" type="checkbox" id="isActive" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                    <label className="form-check-label" htmlFor="isActive">Aktif</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-primary" onClick={save} disabled={saving || uploading}>
              {saving && <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />}
              {editingId ? "Güncelle" : "Kaydet"}
            </button>
            <button className="btn btn-outline-secondary" onClick={() => setFormOpen(false)}>Vazgeç</button>
          </div>
        </PageCard>
      )}

      {/* Slider listesi */}
      {slides.length === 0 ? (
        <InfoAlert>Henüz slider yok. "Yeni Slider" ile ekleyin.</InfoAlert>
      ) : (
        <div className="row">
          {slides.map((s) => (
            <div key={s.id} className="col-12 col-md-6 col-xl-4 mb-3">
              <div className="card h-100">
                <div className="position-relative" style={{ height: 190, background: "#111", overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileUrl(s.image_path)} alt={s.title} className="w-100 h-100 object-fit-cover" />
                  <div className="position-absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.75), transparent)" }} />
                  <div className="position-absolute top-0 start-0 p-3 text-white">
                      <span className="badge mb-1" style={{ background: "#2563eb" }}>{s.title}</span>
                      <div className="fw-bold fs-5 lh-sm rounded-2 px-2 py-1 mb-1" style={{ background: "#f97316", width: "fit-content" }}>
                        {s.subtitle || s.title}
                      </div>
                      {s.description && <div className="small text-white-75 mt-0.5">{s.description}</div>}
                    <div className="mt-1.5 d-flex gap-1">
                      {s.show_buttons && (
                        <>
                          <span className="badge" style={{ background: "#ec4899" }}>{s.primary_button_text || "Alışverişe Başla"}</span>
                          <span className="badge" style={{ background: "#22c55e" }}>{s.secondary_button_text || "Üye Ol"}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={cn("position-absolute top-0 end-0 m-2 badge", s.is_active ? "text-bg-success" : "text-bg-secondary")}>
                    {s.is_active ? "Aktif" : "Pasif"}
                  </span>
                </div>
                <div className="card-body d-flex justify-content-between align-items-center py-2">
                  <span className="text-muted small">Sıra: {s.sort_order}</span>
                  <div>
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(s)} aria-label="Düzenle">
                      <MaterialIcon name="Pencil" size={14} />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setDelId(s.id)} aria-label="Sil">
                      <MaterialIcon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={delId !== null}
        title="Slider Sil"
        tone="danger"
        confirmText="Sil"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDelId(null)}
      >
        Bu slider kalıcı olarak silinecek. Emin misiniz?
      </ConfirmModal>
    </PanelLayout>
  );
}
