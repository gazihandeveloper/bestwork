"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading, EmptyRow } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import {
  api,
  listProducts,
  listCategories,
  uploadFile,
  getErrorMessage,
  type Product,
  type Category,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// Görseller canlı domain üzerinden servis edilir ("/api" soneki olmadan).
const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/?$/, "") ||
  (process.env.NODE_ENV === "development" ? "" : "https://mahmutgazihanarslan.com.tr");

const fileUrl = (p?: string | null) => {
  if (!p) return "";
  return `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;
};

// api.ts'teki Product tipi henüz sku/description/image_path/category/created_at
// içermiyor (diğer ekip ekliyor). Yerel kesişim tipi hem bugün hem de api.ts
// güncellendikten sonra derlenir — api.ts'e dokunmadan alanlara erişim sağlar.
type ProductRow = Product & {
  sku?: string | null;
  description?: string | null;
  image_path?: string | null;
  category?: string | null;
  created_at?: string;
};

interface ProductForm {
  name: string;
  sku: string;
  stock: number;
  pv: number;
  cv: number;
  price: number;
  category_id: number | "";
  category: string;
  description: string;
  image_path: string;
}

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  stock: 0,
  pv: 0,
  cv: 0,
  price: 0,
  category_id: "",
  category: "",
  description: "",
  image_path: "",
};

const toNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Görseli webp'e çevirir (canvas) ve yükler — slider sayfasındaki desen.
async function convertAndUpload(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const maxW = 1200;
  const scale = Math.min(1, maxW / bitmap.width);
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Görsel işlenemedi");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.85));
  if (!blob) throw new Error("WebP dönüşümü başarısız");
  return uploadFile(new File([blob], "urun.webp", { type: "image/webp" }));
}

// ── Sayfa içinde tanımlı ürün CRUD'u (api.ts'te yok) ──────────────────────
// Sözleşme gövdesi: {name,price,pv,cv,stock,sku,description,image_path,category_id,category}
function toBody(f: ProductForm) {
  return {
    name: f.name.trim(),
    sku: f.sku.trim(),
    stock: f.stock,
    pv: f.pv,
    cv: f.cv,
    price: f.price,
    description: f.description,
    image_path: f.image_path,
    category_id: f.category_id === "" ? null : f.category_id,
    category: f.category,
  };
}

async function createProduct(input: ProductForm): Promise<void> {
  await api.post("/admin/products", toBody(input));
}

async function updateProduct(id: number, input: ProductForm): Promise<void> {
  await api.put(`/admin/products/${id}`, toBody(input));
}

async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/admin/products/${id}`);
}

const formatPrice = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function UrunlerPage() {
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catError, setCatError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Toplu seçim + toplu silme
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [filterCat, setFilterCat] = useState<number | "all">("all");
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Kategori filtresine göre görünür ürünler
  const list = products ?? [];
  const filteredProducts =
    filterCat === "all"
      ? list
      : list.filter((p) => {
          const cat = categories.find((c) => c.id === filterCat);
          return p.category_id === filterCat || (cat ? p.category === cat.name : false);
        });

  const allSelected = filteredProducts.length > 0 && selected.length === filteredProducts.length;

  // "Tümünü seç" kutusunun belirsiz (yarım) durumu
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selected.length > 0 && !allSelected;
    }
  }, [selected, allSelected]);

  const toggleSelect = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleSelectAll = () => setSelected(allSelected ? [] : filteredProducts.map((p) => p.id));

  const clearSelection = () => setSelected([]);

  const confirmBulkDelete = async () => {
    if (selected.length === 0) return;
    setBulkDeleting(true);
    setError("");
    try {
      await Promise.all(selected.map((id) => deleteProduct(id)));
      setNotice(`${selected.length} ürün silindi.`);
      setSelected([]);
      setBulkOpen(false);
      loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBulkDeleting(false);
    }
  };

  const loadProducts = () => {
    listProducts()
      .then(setProducts)
      .catch((err) => setError(getErrorMessage(err)));
  };

  const loadCategories = () => {
    listCategories(true)
      .then(setCategories)
      .catch((err) => setCatError(getErrorMessage(err)));
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setFormOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    const matched = p.category_id
      ? categories.find((c) => c.id === p.category_id)
      : p.category
        ? categories.find((c) => c.name === p.category)
        : undefined;
    setEditingId(p.id);
    setForm({
      name: p.name ?? "",
      sku: p.sku ?? "",
      stock: p.stock ?? 0,
      pv: p.pv ?? 0,
      cv: p.cv ?? 0,
      price: p.price ?? 0,
      category_id: matched ? matched.id : (p.category_id ?? ""),
      category: p.category ?? "",
      description: p.description ?? "",
      image_path: p.image_path ?? "",
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

  const onCategoryChange = (value: string) => {
    if (value === "") {
      setForm((f) => ({ ...f, category_id: "", category: "" }));
      return;
    }
    const id = Number(value);
    const cat = categories.find((c) => c.id === id);
    setForm((f) => ({ ...f, category_id: id, category: cat?.name ?? "" }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("Ürün adı zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) await updateProduct(editingId, form);
      else await createProduct(form);
      setNotice(editingId ? "Ürün güncellendi." : "Ürün eklendi.");
      setFormOpen(false);
      loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(delTarget.id);
      setNotice("Ürün silindi.");
      setSelected((s) => s.filter((x) => x !== delTarget.id));
      setDelTarget(null);
      loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (error && products === null) return <PanelLayout><ErrorAlert>{error}</ErrorAlert></PanelLayout>;
  if (products === null) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader title="Ürünler" subtitle="Ürünleri yönetin — görseller WebP'e çevrilir, stok kodu (sku) ile arama yapılabilir." />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && products !== null && <div className="alert alert-danger py-2">{error}</div>}
      {catError && <div className="alert alert-warning py-2">Kategoriler yüklenemedi: {catError}</div>}

      <div className="mb-3">
        <button className="btn btn-primary" onClick={openNew}>
          <MaterialIcon name="Plus" size={15} className="me-1" /> Yeni Ürün
        </button>
      </div>

      {/* Form paneli */}
      {formOpen && (
        <PageCard
          title={editingId ? `Ürün Düzenle (#${editingId})` : "Yeni Ürün"}
          subtitle="Ürün adı zorunludur; diğer alanlar boş bırakılabilir."
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
              <div className="mt-2 position-relative border rounded overflow-hidden" style={{ height: 170, background: "#111" }}>
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
                  <label className="form-label">Ürün Adı *</label>
                  <input
                    className="form-control"
                    placeholder="Örn. BestWork Kolajen"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Stok Kodu (SKU)</label>
                  <input
                    className="form-control"
                    placeholder="Örn. BW-1001"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Stok Adet</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: toNum(e.target.value) })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">PV</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={form.pv}
                    onChange={(e) => setForm({ ...form, pv: toNum(e.target.value) })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">CV</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={form.cv}
                    onChange={(e) => setForm({ ...form, cv: toNum(e.target.value) })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Fiyat (₺)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="form-control"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: toNum(e.target.value) })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Kategori</label>
                  <select
                    className="form-select"
                    value={form.category_id === "" ? "" : String(form.category_id)}
                    onChange={(e) => onCategoryChange(e.target.value)}
                  >
                    <option value="">Kategori yok</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Açıklama</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Ürün açıklaması…"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
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

      {/* Ürün listesi */}
      <PageCard
        title="Ürün Listesi"
        subtitle={`${filteredProducts.length} ürün${selected.length > 0 ? ` · ${selected.length} seçili` : ""}`}
      >
        {/* Kategori filtresi — yan yana çipler */}
        <div className="d-flex flex-wrap gap-1 mb-3">
          <button
            type="button"
            onClick={() => { setFilterCat("all"); setSelected([]); }}
            className={cn("btn btn-sm", filterCat === "all" ? "btn-primary" : "btn-outline-secondary")}
          >
            Tümü ({list.length})
          </button>
          {categories.map((c) => {
            const cnt = list.filter((p) => p.category_id === c.id || p.category === c.name).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setFilterCat(c.id); setSelected([]); }}
                className={cn("btn btn-sm", filterCat === c.id ? "btn-primary" : "btn-outline-secondary")}
              >
                {c.name} ({cnt})
              </button>
            );
          })}
        </div>

        {filteredProducts.length === 0 ? (
          <InfoAlert>Bu kategoride ürün yok.</InfoAlert>
        ) : (
          <>
            {/* Toplu işlem araç çubuğu */}
            <div
              className={cn(
                "d-flex align-items-center gap-2 rounded border px-2 py-1.5 mb-2",
                selected.length > 0 ? "border-primary bg-primary bg-opacity-10" : "border-transparent"
              )}
            >
              <button className="btn btn-sm btn-outline-secondary" onClick={toggleSelectAll} disabled={bulkDeleting}>
                {allSelected ? "Seçimi Temizle" : "Tümünü Seç"}
              </button>
              {selected.length > 0 && (
                <>
                  <span className="fw-semibold small">{selected.length} ürün seçildi</span>
                  <button
                    className="btn btn-sm btn-danger ms-auto"
                    onClick={() => setBulkOpen(true)}
                    disabled={bulkDeleting}
                  >
                    <MaterialIcon name="Trash2" size={13} className="me-1" />
                    Seçilenleri Sil
                  </button>
                </>
              )}
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className="form-check-input"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Tümünü seç"
                      />
                    </th>
                    <th style={{ width: 64 }}>Ürün</th>
                    <th>Ad</th>
                    <th>Stok Kodu</th>
                    <th>Stok</th>
                    <th>PV</th>
                    <th>CV</th>
                    <th>Fiyat</th>
                    <th>Kategori</th>
                    <th className="text-end">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className={selected.includes(p.id) ? "table-primary" : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selected.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          aria-label={`${p.name} seç`}
                        />
                      </td>
                      <td>
                      {p.image_path ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={fileUrl(p.image_path)}
                          alt={p.name}
                          style={{ width: 48, height: 48, objectFit: "cover" }}
                          className="rounded border"
                        />
                      ) : (
                        <div
                          className="d-flex align-items-center justify-content-center rounded border bg-dark text-white-50"
                          style={{ width: 48, height: 48 }}
                        >
                          <MaterialIcon name="Package" size={20} />
                        </div>
                      )}
                    </td>
                    <td className="fw-medium">{p.name}</td>
                    <td className="text-muted">{p.sku || "—"}</td>
                    <td>
                      {p.stock === 0 ? (
                        <span className="badge text-bg-danger">Stokta yok</span>
                      ) : (
                        <span className="badge text-bg-success">{p.stock}</span>
                      )}
                    </td>
                    <td>{p.pv}</td>
                    <td>{p.cv}</td>
                    <td className="fw-medium">₺{formatPrice(p.price ?? 0)}</td>
                    <td>
                      {p.category_name || p.category ? (
                        <span className="badge text-bg-light border">
                          <MaterialIcon name="Tag" size={11} className="me-1" />
                          {p.category_name || p.category}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(p)} aria-label="Düzenle">
                        <MaterialIcon name="Pencil" size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setDelTarget(p)} aria-label="Sil">
                        <MaterialIcon name="Trash2" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </PageCard>

      <ConfirmModal
        open={delTarget !== null}
        title="Ürün Sil"
        tone="danger"
        confirmText="Sil"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      >
        <strong>{delTarget?.name}</strong> kalıcı olarak silinecek. Emin misiniz?
      </ConfirmModal>

      <ConfirmModal
        open={bulkOpen}
        title="Seçilen Ürünleri Sil"
        tone="danger"
        confirmText="Tümünü Sil"
        busy={bulkDeleting}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkOpen(false)}
      >
        <strong>{selected.length} ürün</strong> kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?
      </ConfirmModal>
    </PanelLayout>
  );
}
