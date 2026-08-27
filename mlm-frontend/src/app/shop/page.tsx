"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  CupSoda,
  CookingPot,
  LayoutGrid,
  Coffee,
  Zap,
  Flower2,
  ShoppingBag,
  Store,
  Check,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { listProducts, getErrorMessage, fileUrl } from "@/services/api";
import type { Product } from "@/services/api";
import { addToCartStorage } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

interface CategoryDef {
  key: string | null;
  label: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryDef[] = [
  { key: null, label: "Tümü", icon: <Store className="size-4" /> },
  { key: "icecek", label: "İçecek", icon: <CupSoda className="size-4" /> },
  { key: "enerji", label: "Enerji & Sağlık", icon: <Zap className="size-4" /> },
  { key: "bakim", label: "Bakım & Güzellik", icon: <Flower2 className="size-4" /> },
  { key: "ev", label: "Ev & Mutfak", icon: <CookingPot className="size-4" /> },
  { key: "diger", label: "Diğer", icon: <LayoutGrid className="size-4" /> },
];

const categoryLabel = (key: string | null) =>
  CATEGORIES.find((c) => c.key === key)?.label ?? key ?? "Diğer";

// Görseli olmayan ürünler için kategori bazlı görsel fallback (public/kategoriler/).
const CATEGORY_IMAGE: Record<string, string> = {
  icecek: "/kategoriler/icecek.jpg",
  enerji: "/kategoriler/enerji.jpg",
  bakim: "/kategoriler/bakim.jpg",
  ev: "/kategoriler/ev.jpg",
  diger: "/kategoriler/diger.jpg",
};

function productIcon(name: string, size = 48) {
  const n = name.toLowerCase();
  if (n.includes("kahve") || n.includes("coffee")) return <Coffee style={{ width: size, height: size }} />;
  if (n.includes("enerji") || n.includes("energy")) return <Zap style={{ width: size, height: size }} />;
  if (n.includes("su") || n.includes("drink") || n.includes("çay")) return <CupSoda style={{ width: size, height: size }} />;
  if (n.includes("krem") || n.includes("bakım") || n.includes("beauty") || n.includes("cilt"))
    return <Flower2 style={{ width: size, height: size }} />;
  return <ShoppingBag style={{ width: size, height: size }} />;
}

type SortKey = "default" | "priceAsc" | "priceDesc" | "nameAsc";

function ShopContent() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState("");
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("default");

  // Menü aramasından gelen ?q= parametresini başlangıç aramasına yükle
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setSearch(q);
  }, []);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  // Arama: ad veya stok kodu ile DB'den getir (400ms debounce).
  useEffect(() => {
    if (loading) return;
    const id = setTimeout(() => {
      setSearching(true);
      listProducts({ q: search.trim() })
        .then(setProducts)
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(id);
  }, [search, loading]);

  const visibleProducts = useMemo(() => {
    let list = category ? products.filter((p) => (p.category ?? "diger") === category) : [...products];
    if (sort === "priceAsc") list.sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") list.sort((a, b) => b.price - a.price);
    else if (sort === "nameAsc") list.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return list;
  }, [products, category, sort]);

  const countFor = (key: string | null) =>
    key === null ? products.length : products.filter((p) => (p.category ?? "diger") === key).length;

  const addToCart = (product: Product, quantity = 1) => {
    addToCartStorage(product, quantity);
    setSnackbar(`"${product.name}" sepete eklendi.`);
  };

  if (loading) {
    return (
      <div className="bg-background flex min-h-[60vh] items-center justify-center pt-[112px] pb-8 md:pt-[104px]">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    );
  }

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "default", label: "Varsayılan" },
    { key: "priceAsc", label: "Fiyat ↑" },
    { key: "priceDesc", label: "Fiyat ↓" },
    { key: "nameAsc", label: "A-Z" },
  ];

  return (
    <div className="bg-background mx-auto min-h-screen w-full px-4 pt-[112px] pb-8 md:w-[75%] md:px-0 md:pt-[104px]">
      {/* Başlık */}
      <h1 className="text-primary-dark mb-4 text-2xl font-extrabold md:text-3xl">Ürünler</h1>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mb-3 rounded border px-4 py-2.5 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Büyük arama çubuğu — menüdeki arama buraya taşındı */}
      <div className="mb-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2" />
          <Input
            autoFocus={search.length > 0}
            placeholder="Ürün adı veya stok kodu ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded border-border pl-12 pr-12 text-base shadow-sm"
          />
          {searching && (
            <Loader2 className="text-primary absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin" />
          )}
        </div>
      </div>

      {/* Kategori çipleri + sıralama */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <SlidersHorizontal className="text-muted-foreground mr-1 size-4" />
        {CATEGORIES.map((c) => {
          const active = category === c.key;
          const count = countFor(c.key);
          return (
            <button
              key={c.key ?? "all"}
              type="button"
              onClick={() => setCategory(c.key)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent"
              )}
            >
              {c.icon}
              {c.label}
              <span
                className={cn(
                  "rounded px-1.5 text-[11px] font-bold",
                  active ? "bg-white/20 text-white" : "bg-accent text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1">
          {sortOptions.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setSort(o.key)}
              className={cn(
                "cursor-pointer rounded border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                sort === o.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ürünler — satırda 4 ürün */}
      {visibleProducts.length === 0 ? (
        <div className="border-border bg-card rounded border py-10 text-center">
          <Search className="text-muted-foreground mx-auto mb-2 size-10" />
          <p className="text-muted-foreground">Aramanızla eşleşen ürün bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((p) => {
            const soldOut = p.stock <= 0;
            const image = fileUrl(p.image_path) ?? CATEGORY_IMAGE[p.category ?? "diger"];
            return (
              <div
                key={p.id}
                className="group border-border bg-card relative flex h-full cursor-pointer flex-col overflow-hidden rounded border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                onClick={() => router.push(`/product/${p.id}`)}
              >
                {/* Görsel */}
                <div className="bg-secondary-light/50 relative h-[150px] overflow-hidden">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={p.name}
                      loading="lazy"
                      className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ filter: soldOut ? "grayscale(1) opacity(0.5)" : "saturate(1.08)" }}
                    />
                  ) : (
                    <div className="text-primary-dark flex h-full items-center justify-center">
                      {productIcon(p.name)}
                    </div>
                  )}
                  <Badge
                    className={cn(
                      "absolute top-2 left-2 h-5 border-0 text-[10px]",
                      soldOut ? "bg-destructive text-white" : "bg-white/90 text-[#2E7D32]"
                    )}
                  >
                    {soldOut ? "Stokta Yok" : "Stokta"}
                  </Badge>
                </div>

                {/* İçerik */}
                <div className="flex flex-1 flex-col p-2.5">
                  <div className="flex items-start justify-between gap-1">
                    <Badge variant="outline" className="border-border text-muted-foreground mb-1 px-1.5 py-0 text-[9px] font-medium">
                      {categoryLabel(p.category)}
                    </Badge>
                    <p className="text-muted-foreground text-[10px]">SKU: {p.sku ?? "—"}</p>
                  </div>
                  <h3 className="line-clamp-2 text-[0.9rem] leading-snug font-bold">{p.name}</h3>

                  <div className="mt-2 flex items-end justify-between gap-1">
                    <p className="text-primary-dark text-base font-extrabold">{tl(p.price)}</p>
                    <Badge variant="secondary" className="bg-secondary/70 px-1.5 py-0 text-[9px] font-bold text-primary-dark">
                      +{p.pv} PV · +{p.cv} CV
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    className="mt-2.5 h-8 w-full text-[12.5px]"
                    disabled={soldOut}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(p);
                    }}
                  >
                    <Plus className="size-3.5" />
                    Sepete Ekle
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sepete ekleme bildirimi */}
      {snackbar && (
        <div className="fixed bottom-5 left-1/2 z-[1300] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="bg-foreground text-background flex items-center gap-2 rounded px-5 py-3 text-sm font-semibold shadow-lg">
            <Check className="size-5 shrink-0" />
            <span className="flex-1 truncate">{snackbar}</span>
            <button
              type="button"
              className="cursor-pointer font-bold underline underline-offset-2"
              onClick={() => {
                setSnackbar("");
                router.push("/cart");
              }}
            >
              Sepete Git
            </button>
            <button
              type="button"
              aria-label="Bildirimi kapat"
              className="ml-1 cursor-pointer text-lg leading-none opacity-60 hover:opacity-100"
              onClick={() => setSnackbar("")}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return <ShopContent />;
}
