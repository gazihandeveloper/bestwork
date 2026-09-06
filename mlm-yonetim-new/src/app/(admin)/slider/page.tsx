"use client";

import { useEffect, useRef, useState } from "react";
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
  listHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  uploadFile,
  fileUrl,
  getErrorMessage,
  type HeroSlide,
  type HeroSlideInput,
} from "@/lib/api";

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
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/webp", 0.85)
  );
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: (slides?.length ?? 0) + 1 });
    setError("");
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
    setError("");
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

  if (error && slides === null)
    return <AdminAlert kind="error">{error}</AdminAlert>;
  if (slides === null) return <AdminSpinner label="Slider yükleniyor…" />;

  return (
    <div>
      <AdminHeader
        title="Slider Yönetimi"
        subtitle="Ana sayfa hero slider'ını yönetin — görseller WebP'e çevrilir."
        actions={<AdminBtn onClick={openNew}>+ Yeni Slider</AdminBtn>}
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && slides !== null && <AdminAlert kind="error">{error}</AdminAlert>}

      {/* Form paneli */}
      {formOpen && (
        <div className="mb-5">
          <AdminCard
            title={editingId ? `Slider Düzenle (#${editingId})` : "Yeni Slider"}
            subtitle="Tüm alanlar düzenlenebilir; butonları tamamen kaldırabilir veya ekleyebilirsiniz."
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div>
                <label className={labelCls}>Görsel (WebP'e çevrilir)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className={`${inputCls} file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-500 dark:file:bg-brand-500/15 dark:file:text-brand-400`}
                  onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
                />
                <div
                  className="mt-3 flex items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-900 dark:border-gray-700"
                  style={{ height: 150 }}
                >
                  {uploading ? (
                    <div className="size-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : form.image_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fileUrl(form.image_path)}
                      alt="önizleme"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-white/40">Görsel seçilmedi</span>
                  )}
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Rozet (üst yazı) *</label>
                    <input
                      className={inputCls}
                      placeholder="BESTWORK FIRSATLARI"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Ana Başlık</label>
                    <input
                      className={inputCls}
                      placeholder="Zihin ve Beden Dengesi"
                      value={form.subtitle ?? ""}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Açıklama</label>
                    <textarea
                      className={inputCls}
                      rows={2}
                      placeholder="Doğal ve katkısız ürünlerle sağlıklı yaşam."
                      value={form.description ?? ""}
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
                  <div className="flex items-end gap-6 pb-1">
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
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <AdminBtn onClick={save} disabled={saving || uploading}>
                {saving ? "Kaydediliyor…" : editingId ? "Güncelle" : "Kaydet"}
              </AdminBtn>
              <AdminBtn variant="outline" onClick={() => setFormOpen(false)}>
                Vazgeç
              </AdminBtn>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Slider listesi */}
      {slides.length === 0 ? (
        <AdminEmpty>
          Henüz slider yok. "Yeni Slider" ile ekleyin.
        </AdminEmpty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {slides.map((s) => (
            <div
              key={s.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="relative" style={{ height: 190, background: "#111" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl(s.image_path)}
                  alt={s.title}
                  className="h-full w-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(90deg, rgba(0,0,0,.75), transparent)",
                  }}
                />
                <div className="absolute inset-x-0 top-0 p-3 text-white">
                  <span
                    className="mb-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ background: "#2563eb" }}
                  >
                    {s.title}
                  </span>
                  <div
                    className="mb-1 w-fit rounded-lg px-2 py-1 text-sm font-bold leading-tight"
                    style={{ background: "#f97316" }}
                  >
                    {s.subtitle || s.title}
                  </div>
                  {s.description && (
                    <div className="mt-0.5 text-xs text-white/75">{s.description}</div>
                  )}
                </div>
                <span className="absolute right-2 top-2">
                  <AdminBadge color={s.is_active ? "green" : "gray"}>
                    {s.is_active ? "Aktif" : "Pasif"}
                  </AdminBadge>
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Sıra: {s.sort_order}
                </span>
                <div>
                  <AdminBtn variant="outline" size="xs" onClick={() => openEdit(s)} className="mr-1">
                    Düzenle
                  </AdminBtn>
                  <AdminBtn variant="danger" size="xs" onClick={() => setDelId(s.id)}>
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
        title="Slider Sil"
        tone="danger"
        onClose={() => setDelId(null)}
      >
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
          Bu slider kalıcı olarak silinecek. Emin misiniz?
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
