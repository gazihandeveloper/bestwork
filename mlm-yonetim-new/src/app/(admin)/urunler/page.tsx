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
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import {
  listProducts,
  listCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadFile,
  fileUrl,
  getErrorMessage,
  type Category,
} from "@/lib/api";

type ProductRow = {
  id: number;
  name: string;
  stock: number;
  price: number;
  pv: number;
  cv: number;
  category_id?: number | null;
  category_name?: string | null;
  sku?: string | null;
  description?: string | null;
  image_path?: string | null;
  category?: string | null;
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

// Görseli webp'e çevirir (canvas) ve yükler — eski paneldeki desen.
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
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/webp", 0.85)
  );
  if (!blob) throw new Error("WebP dönüşümü başarısız");
  return uploadFile(new File([blob], "urun.webp", { type: "image/webp" }));
}

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

const formatPrice = (v: number) =>
  v.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [filterCat, setFilterCat] = useState<number | "all">("all");
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const list = products ?? [];
  const filteredProducts =
    filterCat === "all"
      ? list
      : list.filter((p) => {
          const cat = categories.find((c) => c.id === filterCat);
          return p.category_id === filterCat || (cat ? p.category === cat.name : false);
        });

  const allSelected =
    filteredProducts.length > 0 && selected.length === filteredProducts.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selected.length > 0 && !allSelected;
    }
  }, [selected, allSelected]);

  const toggleSelect = (id: number) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );

  const toggleSelectAll = () =>
    setSelected(allSelected ? [] : filteredProducts.map((p) => p.id));

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
      if (editingId) await updateProduct(editingId, toBody(form));
      else await createProduct(toBody(form));
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

  if (error && products === null)
    return <AdminAlert kind="error">{error}</AdminAlert>;
  if (products === null) return <AdminSpinner label="Ürünler yükleniyor…" />;

  return (
    <div>
      <AdminHeader
        title="Ürünler"
        subtitle="Ürünleri yönetin — görseller WebP'e çevrilir, stok kodu (sku) ile arama yapılabilir."
        actions={<AdminBtn onClick={openNew}>+ Yeni Ürün</AdminBtn>}
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && products !== null && <AdminAlert kind="error">{error}</AdminAlert>}
      {catError && <AdminAlert kind="warning">Kategoriler yüklenemedi: {catError}</AdminAlert>}

      {/* Form paneli */}
      {formOpen && (
        <div className="mb-5">
          <AdminCard
            title={editingId ? `Ürün Düzenle (#${editingId})` : "Yeni Ürün"}
            subtitle="Ürün adı zorunludur; diğer alanlar boş bırakılabilir."
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
                  style={{ height: 180 }}
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
                    <label className={labelCls}>Ürün Adı *</label>
                    <input
                      className={inputCls}
                      placeholder="Örn. BestWork Kolajen"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Stok Kodu (SKU)</label>
                    <input
                      className={inputCls}
                      placeholder="Örn. BW-1001"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Stok Adet</label>
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: toNum(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fiyat (₺)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={inputCls}
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: toNum(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>PV</label>
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={form.pv}
                      onChange={(e) => setForm({ ...form, pv: toNum(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>CV</label>
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={form.cv}
                      onChange={(e) => setForm({ ...form, cv: toNum(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Kategori</label>
                    <select
                      className={inputCls}
                      value={form.category_id === "" ? "" : String(form.category_id)}
                      onChange={(e) => onCategoryChange(e.target.value)}
                    >
                      <option value="">Kategori yok</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Açıklama</label>
                    <textarea
                      className={inputCls}
                      rows={3}
                      placeholder="Ürün açıklaması…"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
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

      {/* Ürün listesi */}
      <AdminCard
        title="Ürün Listesi"
        subtitle={`${filteredProducts.length} ürün${
          selected.length > 0 ? ` · ${selected.length} seçili` : ""
        }`}
      >
        {/* Kategori filtresi */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFilterCat("all");
              setSelected([]);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              filterCat === "all"
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08]"
            }`}
          >
            Tümü ({list.length})
          </button>
          {categories.map((c) => {
            const cnt = list.filter(
              (p) => p.category_id === c.id || p.category === c.name
            ).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setFilterCat(c.id);
                  setSelected([]);
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  filterCat === c.id
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08]"
                }`}
              >
                {c.name} ({cnt})
              </button>
            );
          })}
        </div>

        {/* Toplu işlem çubuğu */}
        <div
          className={`mb-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${
            selected.length > 0
              ? "border-brand-500/40 bg-brand-500/5"
              : "border-transparent"
          }`}
        >
          <AdminBtn variant="outline" size="xs" onClick={toggleSelectAll} disabled={bulkDeleting}>
            {allSelected ? "Seçimi Temizle" : "Tümünü Seç"}
          </AdminBtn>
          {selected.length > 0 && (
            <>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selected.length} ürün seçildi
              </span>
              <AdminBtn
                variant="danger"
                size="xs"
                className="ml-auto"
                onClick={() => setBulkOpen(true)}
                disabled={bulkDeleting}
              >
                Seçilenleri Sil
              </AdminBtn>
            </>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <AdminEmpty>Bu kategoride ürün yok.</AdminEmpty>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className={`${thCls} w-10`}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Tümünü seç"
                    />
                  </th>
                  <th className={`${thCls} w-14`}>Ürün</th>
                  <th className={thCls}>Ad</th>
                  <th className={thCls}>Stok Kodu</th>
                  <th className={thCls}>Stok</th>
                  <th className={thCls}>PV</th>
                  <th className={thCls}>CV</th>
                  <th className={thCls}>Fiyat</th>
                  <th className={thCls}>Kategori</th>
                  <th className={`${thCls} text-right`}>İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                      selected.includes(p.id) ? "bg-brand-500/5" : ""
                    }`}
                  >
                    <td className={tdCls}>
                      <input
                        type="checkbox"
                        className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        checked={selected.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        aria-label={`${p.name} seç`}
                      />
                    </td>
                    <td className={tdCls}>
                      {p.image_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fileUrl(p.image_path)}
                          alt={p.name}
                          className="h-12 w-12 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-lg dark:border-gray-700 dark:bg-white/[0.03]">
                          📦
                        </div>
                      )}
                    </td>
                    <td className={`${tdCls} font-medium text-gray-800 dark:text-white/90`}>
                      {p.name}
                    </td>
                    <td className={`${tdCls} text-gray-500 dark:text-gray-400`}>
                      {p.sku || "—"}
                    </td>
                    <td className={tdCls}>
                      {p.stock === 0 ? (
                        <AdminBadge color="red">Stokta yok</AdminBadge>
                      ) : (
                        <AdminBadge color="green">{p.stock}</AdminBadge>
                      )}
                    </td>
                    <td className={tdCls}>{p.pv}</td>
                    <td className={tdCls}>{p.cv}</td>
                    <td className={`${tdCls} font-medium`}>₺{formatPrice(p.price ?? 0)}</td>
                    <td className={tdCls}>
                      {p.category_name || p.category ? (
                        <AdminBadge color="blue">
                          {p.category_name || p.category}
                        </AdminBadge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <AdminBtn
                        variant="outline"
                        size="xs"
                        onClick={() => openEdit(p)}
                        className="mr-1"
                      >
                        Düzenle
                      </AdminBtn>
                      <AdminBtn variant="danger" size="xs" onClick={() => setDelTarget(p)}>
                        Sil
                      </AdminBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <AdminModal
        open={delTarget !== null}
        title="Ürün Sil"
        tone="danger"
        onClose={() => setDelTarget(null)}
      >
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
          <strong>{delTarget?.name}</strong> kalıcı olarak silinecek. Emin
          misiniz?
        </p>
        <div className="flex justify-end gap-2">
          <AdminBtn variant="outline" onClick={() => setDelTarget(null)}>
            Vazgeç
          </AdminBtn>
          <AdminBtn variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? "Siliniyor…" : "Sil"}
          </AdminBtn>
        </div>
      </AdminModal>

      <AdminModal
        open={bulkOpen}
        title="Seçilen Ürünleri Sil"
        tone="danger"
        onClose={() => setBulkOpen(false)}
      >
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
          <strong>{selected.length} ürün</strong> kalıcı olarak silinecek. Bu
          işlem geri alınamaz. Emin misiniz?
        </p>
        <div className="flex justify-end gap-2">
          <AdminBtn variant="outline" onClick={() => setBulkOpen(false)}>
            Vazgeç
          </AdminBtn>
          <AdminBtn
            variant="danger"
            onClick={confirmBulkDelete}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? "Siliniyor…" : "Tümünü Sil"}
          </AdminBtn>
        </div>
      </AdminModal>
    </div>
  );
}
