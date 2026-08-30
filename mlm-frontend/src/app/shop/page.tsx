"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listProducts, listCategories, getErrorMessage, fileUrl } from "@/services/api";
import type { Product } from "@/services/api";
import { addToCartStorage } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

interface CategoryDef {
  key: string | null;
  id?: number;
  label: string;
}

const FALLBACK_CATEGORIES: CategoryDef[] = [
  { key: "icecek", label: "İçecek" },
];

const CATEGORY_IMAGE: Record<string, string> = {
  icecek: "/kategoriler/icecek.jpg",
  enerji: "/kategoriler/enerji.jpg",
  bakim: "/kategoriler/bakim.jpg",
  ev: "/kategoriler/ev.jpg",
  diger: "/kategoriler/diger.jpg",
};

function toPascal(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

// Bir ürün bir kategorinin altında sayılır: category_id eşleşir VEYA legacy category slug'ı eşleşir.
function matchesCategory(p: Product, def: CategoryDef): boolean {
  if (def.key === null) return true;
  if (def.id != null && p.category_id != null) return p.category_id === def.id;
  return (p.category ?? "diger") === def.key;
}

type SortKey = "default" | "priceAsc" | "priceDesc" | "nameAsc";

function ShopContent() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>(FALLBACK_CATEGORIES);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState("");
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("default");
  const [filterOpen, setFilterOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setSearch(q);
    const cat = params.get("category");
    if (cat) setCategory(cat);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((cats) => {
        if (cancelled || cats.length === 0) return;
        const apiChips: CategoryDef[] = cats
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((c) => {
            return { key: c.slug, id: c.id, label: c.name };
          });
        setCategories(apiChips);
      })
      .catch(() => {
        /* fallback kalır */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

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

  const selectCategory = (key: string | null) => {
    setCategory(key);
    const params = new URLSearchParams(window.location.search);
    if (key) params.set("category", key);
    else params.delete("category");
    const qs = params.toString();
    router.replace(qs ? `/shop?${qs}` : "/shop", { scroll: false });
    setFilterOpen(false);
  };

  const visibleProducts = useMemo(() => {
    const list = category
      ? products.filter((p) => {
          const def = categories.find((c) => c.key === category);
          return def ? matchesCategory(p, def) : (p.category ?? "diger") === category;
        })
      : [...products];
    if (sort === "priceAsc") list.sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") list.sort((a, b) => b.price - a.price);
    else if (sort === "nameAsc") list.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return list;
  }, [products, category, categories, sort]);

  const countFor = (def: CategoryDef) =>
    def.key === null ? products.length : products.filter((p) => matchesCategory(p, def)).length;

  const addToCart = (product: Product, quantity = 1) => {
    addToCartStorage(product, quantity);
    setSnackbar(`"${product.name}" sepete eklendi.`);
  };

  if (loading) {
    return (
      <div className="bg-background flex min-h-[60vh] items-center justify-center pt-[112px] pb-8 md:pt-[104px]">
        
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
    <div className="bg-background min-h-screen w-full pt-[112px] pb-8 md:pt-[104px]">
      <div className="mx-auto w-full px-4 md:w-[92%] lg:w-[85%] lg:px-0">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
            Anasayfa
          </Link>
          
          <span className="font-semibold text-foreground">Mağaza</span>
        </nav>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* ── Sol kenar çubuğu: kategori ── */}
          <aside className="lg:w-60 lg:shrink-0">
            <button
              type="button"
              className="text-foreground mb-3 flex w-full cursor-pointer items-center justify-between rounded border px-3.5 py-2 text-sm font-semibold lg:hidden"
              onClick={() => setFilterOpen((v) => !v)}
            >
              Kategoriler
              <span className="text-muted-foreground">{category ? categories.find((c) => c.key === category)?.label ?? "Tümü" : "Tümü"}</span>
            </button>

            <div className={cn("flex flex-col gap-4 lg:flex", filterOpen ? "block" : "hidden")}>
              {/* Hızlı Alışveriş */}
              <Button className="w-full" size="lg" onClick={() => setQuickOpen(true)}>
                Hızlı Sipariş
              </Button>

              {/* Kategori listesi */}
              <div>
                <h3 className="text-foreground mb-2 text-base font-bold">Kategori</h3>
                <ul className="space-y-0.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => selectCategory(null)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm transition-colors",
                        category === null ? "text-primary font-semibold" : "text-foreground hover:bg-accent"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          category === null ? "border-primary bg-primary" : "border-border"
                        )}
                      >
                        
                      </span>
                      Tümü
                      <span className="text-muted-foreground">({products.length})</span>
                    </button>
                  </li>
                  {categories.map((c) => {
                    const active = category === c.key;
                    const count = countFor(c);
                    return (
                      <li key={c.key ?? "all"}>
                        <button
                          type="button"
                          onClick={() => selectCategory(c.key)}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm transition-colors",
                            active ? "text-primary font-semibold" : "text-foreground hover:bg-accent"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded border",
                              active ? "border-primary bg-primary" : "border-border"
                            )}
                          >
                            
                          </span>
                          <span className="truncate">{c.label}</span>
                          <span className="text-muted-foreground">({count})</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </aside>

          {/* ── Ana içerik ── */}
          <main className="min-w-0 flex-1">
            <h1 className="text-foreground mb-4 text-2xl font-extrabold md:text-3xl">Ürünler</h1>

            {error && (
              <div className="border-destructive/50 bg-destructive/10 text-destructive mb-3 rounded border px-4 py-2.5 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Arama */}
            <div className="relative mb-4">
              
              <Input
                autoFocus={search.length > 0}
                placeholder="Ürün adı veya stok kodu ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded border-border pl-12 pr-12 text-base shadow-sm"
              />
            </div>

            {/* Sıralama + adet */}
            <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm">{visibleProducts.length} ürün</span>
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

            {/* Ürün ızgarası */}
            {visibleProducts.length === 0 ? (
              <div className="border-border bg-card rounded border py-10 text-center">
                
                <p className="text-muted-foreground">Aramanızla eşleşen ürün bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visibleProducts.map((p) => {
                  const image = fileUrl(p.image_path) ?? CATEGORY_IMAGE[p.category ?? "diger"];
                  return <ProductCard key={p.id} product={p} image={image} onAdd={addToCart} />;
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Hızlı Sipariş popup */}
      <QuickOrderModal open={quickOpen} onClose={() => setQuickOpen(false)} onAdd={addToCart} />

      {/* Sepete ekleme bildirimi */}
      {snackbar && (
        <div className="fixed bottom-5 left-1/2 z-[1300] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="bg-foreground text-background flex items-center gap-2 rounded px-5 py-3 text-sm font-semibold shadow-lg">
            
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

// ── Ürün kartı: adet seçici + "Sepete Ekle" butonu ────────────────────────
function ProductCard({
  product,
  image,
  onAdd,
}: {
  product: Product;
  image: string | null;
  onAdd: (p: Product, qty: number) => void;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const soldOut = product.stock <= 0;
  const clamp = (q: number) => Math.min(Math.max(q, 1), Math.max(product.stock, 1));

  return (
    <div
      onClick={() => router.push(`/product/${product.id}`)}
      className="group border-border bg-card relative flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      {/* Görsel */}
      <div className="bg-white relative h-[190px] overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full p-3 object-contain transition-transform duration-500 group-hover:scale-105"
            style={{ filter: soldOut ? "grayscale(1) opacity(0.5)" : "saturate(1.05)" }}
          />
        ) : (
          <div className="text-primary-dark flex h-full items-center justify-center">
            
          </div>
        )}
        {soldOut && (
          <span className="bg-destructive text-white absolute top-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-bold">
            Stokta yok
          </span>
        )}
      </div>

      {/* Özet */}
      <div className="flex flex-1 flex-col p-2.5">
        <div className="text-muted-foreground mb-1 text-xs">
          {product.category_name || product.category || "Ürün"}
        </div>
        <h3 className="text-foreground line-clamp-2 min-h-[2.6rem] text-[0.9rem] leading-snug font-bold">
          {product.name}
        </h3>
        <div className="mt-auto space-y-1.5 pt-2">
          <p className="text-foreground text-[0.95rem] leading-tight font-extrabold whitespace-nowrap">
            {tl(product.price)}
          </p>
          {product.sku && (
            <div className="text-muted-foreground text-[11px] font-medium">Stok Kodu: #{product.sku}</div>
          )}

          {/* Adet seçici */}
          <div className="border-border flex items-center rounded-md border">
            <button
              type="button"
              aria-label="Adedi azalt"
              className="text-muted-foreground flex-1 cursor-pointer py-1.5 text-center hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              disabled={soldOut || qty <= 1}
              onClick={(e) => {
                e.stopPropagation();
                setQty((q) => clamp(q - 1));
              }}
            >
              −
            </button>
            <span className="text-foreground w-7 text-center text-sm font-bold">{qty}</span>
            <button
              type="button"
              aria-label="Adedi artır"
              className="text-muted-foreground flex-1 cursor-pointer py-1.5 text-center hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              disabled={soldOut || qty >= product.stock}
              onClick={(e) => {
                e.stopPropagation();
                setQty((q) => clamp(q + 1));
              }}
            >
              +
            </button>
          </div>

          <Button
            size="sm"
            className="h-8 w-full text-[12px]"
            disabled={soldOut}
            onClick={(e) => {
              e.stopPropagation();
              onAdd(product, qty);
            }}
          >
            Sepete Ekle
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Hızlı Sipariş popup'ı: SKU ile ürün ekle + adet /- ──────────────────────
function QuickOrderModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (p: Product, qty: number) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [added, setAdded] = useState<Record<number, boolean>>({});
  const [msg, setMsg] = useState("");

  // Açılınca sıfırla
  useEffect(() => {
    if (open) {
      setQ("");
      setResults([]);
      setQtys({});
      setAdded({});
      setMsg("");
    }
  }, [open]);

  // SKU / ad araması (300ms debounce)
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 1) {
      setResults([]);
      return;
    }
    const id = setTimeout(() => {
      setSearching(true);
      listProducts({ q: term })
        .then((list) =>
          setResults(list.filter((p) => (p.sku ?? "").toLowerCase().includes(term.toLowerCase())))
        )
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(id);
  }, [q, open]);

  if (!open) return null;

  return (
    <div className="bg-black/50 fixed inset-0 z-[1400] flex items-start justify-center overflow-y-auto p-4 pt-[12vh]" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-lg border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-foreground text-base font-bold">Hızlı Sipariş</h2>
          <button
            type="button"
            aria-label="Kapat"
            className="text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <label className="text-muted-foreground mb-1.5 block text-xs font-semibold">Stok Kodu</label>
          <div className="relative">
            
            <Input
              autoFocus
              placeholder="Stok kodu girin (örn. 015)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 pl-9"
            />
          </div>


          {!searching && q.trim() && results.length === 0 && (
            <p className="text-muted-foreground py-3 text-center text-sm">Bu stok koduyla ürün bulunamadı.</p>
          )}

          <div className="mt-2 flex flex-col gap-2">
            {results.map((p) => {
              const qty = qtys[p.id] ?? 1;
              const max = Math.max(p.stock, 1);
              const soldOut = p.stock <= 0;
              const img = fileUrl(p.image_path);
              return (
                <div key={p.id} className="border-border bg-background flex items-center gap-2 rounded border p-2">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.name} className="size-10 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded">
                      
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-bold">{p.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {tl(p.price)}
                      {p.sku ? ` · #${p.sku}` : ""}
                    </p>
                  </div>

                  {/* Adet +/- */}
                  <div className="border-border flex shrink-0 items-center rounded-md border">
                    <button
                      type="button"
                      aria-label="Adedi azalt"
                      className="text-muted-foreground cursor-pointer px-1.5 py-1.5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={soldOut || qty <= 1}
                      onClick={() => setQtys((s) => ({ ...s, [p.id]: Math.max(1, qty - 1) }))}
                    >
                      −
                    </button>
                    <span className="text-foreground w-7 text-center text-sm font-bold">{qty}</span>
                    <button
                      type="button"
                      aria-label="Adedi artır"
                      className="text-muted-foreground cursor-pointer px-1.5 py-1.5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={soldOut || qty >= max}
                      onClick={() => setQtys((s) => ({ ...s, [p.id]: Math.min(max, qty + 1) }))}
                    >
                      +
                    </button>
                  </div>

                  <Button
                    size="sm"
                    className="h-8 shrink-0"
                    disabled={soldOut}
                    onClick={() => {
                      onAdd(p, qty);
                      setMsg(`"${p.name}" sepete eklendi.`);
                      setAdded((s) => ({ ...s, [p.id]: true }));
                      setTimeout(() => setAdded((s) => ({ ...s, [p.id]: false })), 1400);
                    }}
                  >
                    
                    Ekle
                  </Button>
                </div>
              );
            })}
          </div>

          {msg && <p className="text-green-700 mt-2 text-xs font-semibold">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
