"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  inputCls,
} from "@/components/admin/AdminUI";
import {
  listProducts,
  listHeroSlides,
  fileUrl,
  getErrorMessage,
  type Product,
  type HeroSlide,
} from "@/lib/api";

type Tab = "products" | "slides";
type Kind = "product" | "slide";

interface GalleryItem {
  key: string;
  name: string;
  kind: Kind;
  typeLabel: string;
  image: string;
  active?: boolean;
}

export default function GorsellerPage() {
  const [tab, setTab] = useState<Tab>("products");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [slides, setSlides] = useState<HeroSlide[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch((err) => {
        setError(getErrorMessage(err));
        setProducts([]);
      });
    listHeroSlides()
      .then(setSlides)
      .catch((err) => {
        setError(getErrorMessage(err));
        setSlides([]);
      });
  }, []);

  const loading = products === null || slides === null;

  const items = useMemo<GalleryItem[]>(() => {
    const list: GalleryItem[] = [];
    (products ?? []).forEach((p) => {
      if (!p.image_path) return;
      list.push({
        key: `product-${p.id}`,
        name: p.name,
        kind: "product",
        typeLabel: "Ürün",
        image: p.image_path,
      });
    });
    (slides ?? []).forEach((s) => {
      if (!s.image_path) return;
      list.push({
        key: `slide-${s.id}`,
        name: s.title,
        kind: "slide",
        typeLabel: "Slider",
        image: s.image_path,
        active: s.is_active,
      });
    });
    return list;
  }, [products, slides]);

  const productItems = items.filter((i) => i.kind === "product");
  const slideItems = items.filter((i) => i.kind === "slide");
  const tabItems = tab === "products" ? productItems : slideItems;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? tabItems.filter((i) => i.name.toLowerCase().includes(q))
    : tabItems;

  return (
    <div>
      <AdminHeader
        title="Görseller"
        subtitle="Sistemdeki ürün ve slider görsellerini tek bir galeride görüntüleyin."
      />

      <AdminAlert kind="warning">
        Yeni görseller ilgili kaydın (ürün / slider) düzenleme ekranından yüklenir.
      </AdminAlert>

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      {loading ? (
        <AdminSpinner label="Görseller yükleniyor…" />
      ) : (
        <AdminCard
          title="Medya Galerisi"
          subtitle={`Toplam ${items.length} görsel · ${productItems.length} ürün · ${slideItems.length} slider`}
          actions={
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün / slider adına göre ara…"
              className={`${inputCls} w-full sm:w-72`}
            />
          }
        >
          {/* Kaynak sekmeleri */}
          <div className="mb-5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTab("products")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                tab === "products"
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08]"
              }`}
            >
              Ürün Görselleri ({productItems.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("slides")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                tab === "slides"
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08]"
              }`}
            >
              Slider Görselleri ({slideItems.length})
            </button>
          </div>

          {filtered.length === 0 ? (
            <AdminEmpty>
              {tabItems.length === 0
                ? "Bu kaynakta görseli olan kayıt yok."
                : "Aramaya uyan görsel bulunamadı."}
            </AdminEmpty>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item) => (
                <div
                  key={item.key}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-[#1E293B]"
                >
                  <div
                    className="flex items-center justify-center overflow-hidden bg-gray-900"
                    style={{ height: 180 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl(item.image)}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <p
                      className="truncate text-sm font-medium text-gray-800 dark:text-white/90"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {item.active !== undefined && (
                        <AdminBadge color={item.active ? "green" : "gray"}>
                          {item.active ? "Aktif" : "Pasif"}
                        </AdminBadge>
                      )}
                      <AdminBadge color={item.kind === "product" ? "blue" : "purple"}>
                        {item.typeLabel}
                      </AdminBadge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      )}
    </div>
  );
}
