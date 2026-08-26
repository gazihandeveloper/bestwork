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
  { key: null, label: "Tümü", icon: <Store className="size-5" /> },
  { key: "icecek", label: "İçecek", icon: <CupSoda className="size-5" /> },
  { key: "enerji", label: "Enerji & Sağlık", icon: <Zap className="size-5" /> },
  { key: "bakim", label: "Bakım & Güzellik", icon: <Flower2 className="size-5" /> },
  { key: "ev", label: "Ev & Mutfak", icon: <CookingPot className="size-5" /> },
  { key: "diger", label: "Diğer", icon: <LayoutGrid className="size-5" /> },
];

const categoryLabel = (key: string | null) =>
  CATEGORIES.find((c) => c.key === key)?.label ?? key ?? "Diğer";

function productIcon(name: string, size = 52) {
  const n = name.toLowerCase();
  if (n.includes("kahve") || n.includes("coffee")) return <Coffee style={{ width: size, height: size }} />;
  if (n.includes("enerji") || n.includes("energy")) return <Zap style={{ width: size, height: size }} />;
  if (n.includes("su") || n.includes("drink") || n.includes("çay")) return <CupSoda style={{ width: size, height: size }} />;
  if (n.includes("krem") || n.includes("bakım") || n.includes("beauty") || n.includes("cilt"))
    return <Flower2 style={{ width: size, height: size }} />;
  return <ShoppingBag style={{ width: size, height: size }} />;
}

function ShopContent() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState("");
  const [loading, setLoading] = useState(true);

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

  const visibleProducts = useMemo(
    () => (category ? products.filter((p) => (p.category ?? "diger") === category) : products),
    [products, category],
  );

  const countFor = (key: string | null) =>
    key === null ? products.length : products.filter((p) => (p.category ?? "diger") === key).length;

  const addToCart = (product: Product, quantity = 1) => {
    addToCartStorage(product, quantity);
    setSnackbar(`"${product.name}" sepete eklendi.`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background pt-[112px] md:pt-[104px]">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background mx-auto min-h-screen w-[75%] pt-[112px] pb-8 md:pt-[104px]">
      <h1 className="text-primary-dark mb-2 text-2xl font-extrabold md:text-3xl">Ürünler</h1>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mb-2 rounded-lg border px-4 py-2.5 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        {/* Kategoriler */}
        <div className="md:col-span-3">
          <div className="border-border bg-card md:sticky md:top-[96px] rounded-xl border p-4">
            <div className="relative mb-2">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Ürün adı veya stok kodu ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {searching && (
                <Loader2 className="text-primary absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
              )}
            </div>
            <h2 className="mb-1.5 text-base font-bold">Kategoriler</h2>
            <nav className="flex flex-col gap-0.5">
              {CATEGORIES.map((c) => {
                const active = category === c.key;
                const count = countFor(c.key);
                return (
                  <button
                    key={c.key ?? "all"}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                      active
                        ? "bg-primary text-white hover:bg-primary-dark"
                        : "hover:bg-accent text-foreground"
                    )}
                  >
                    <span className="flex shrink-0 items-center">{c.icon}</span>
                    <span className="flex-1 text-sm font-semibold">{c.label}</span>
                    <Badge
                      className={cn(
                        "h-5 min-w-5 justify-center px-1.5 text-xs font-normal",
                        active ? "bg-white text-foreground" : "bg-accent text-foreground"
                      )}
                    >
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Ürünler — satırda 3 ürün */}
        <div className="md:col-span-9">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {visibleProducts.map((p) => {
              const soldOut = p.stock <= 0;
              const image = fileUrl(p.image_path);
              return (
                <div
                  key={p.id}
                  className="border-border bg-card group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border shadow-sm transition-all duration-250 hover:-translate-y-1 hover:shadow-md"
                  onClick={() => router.push(`/product/${p.id}`)}
                >
                  <div className="bg-secondary relative flex h-[130px] items-center justify-center overflow-hidden">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={p.name}
                        loading="lazy"
                        className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-primary-dark flex">{productIcon(p.name)}</div>
                    )}
                    <Badge
                      className={cn(
                        "absolute top-2 left-2 h-5 bg-white/92 text-[10px]",
                        soldOut ? "text-destructive" : "text-[#2E7D32]"
                      )}
                    >
                      {soldOut ? "Yok" : "Stokta"}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col p-1.5">
                    <Badge
                      variant="outline"
                      className="border-border text-muted-foreground mb-0.5 h-5 self-start px-2 text-[10px] font-medium"
                    >
                      {categoryLabel(p.category)}
                    </Badge>
                    <h3 className="truncate text-[0.95rem] font-bold">{p.name}</h3>
                    <p className="text-muted-foreground truncate text-xs">Stok Kodu: {p.sku ?? "—"}</p>
                    <div className="mt-auto pt-1">
                      <p className="text-primary-dark text-base font-extrabold">{tl(p.price)}</p>
                      <Button
                        className="mt-0.5 h-8 w-full text-[13px]"
                        disabled={soldOut}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p);
                        }}
                      >
                        <Plus className="size-4" />
                        Sepete Ekle
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sepete ekleme bildirimi */}
      {snackbar && (
        <div className="fixed bottom-5 left-1/2 z-[1300] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="bg-foreground text-background shadow-lg flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold">
            <Check className="size-5 shrink-0" />
            <span className="flex-1 truncate">{snackbar}</span>
            <button
              type="button"
              className="cursor-pointer font-bold underline underline-offset-2"
              onClick={() => {
                setSnackbar("");
                window.dispatchEvent(new CustomEvent("open-cart"));
              }}
            >
              Sepete Git
            </button>
            <button
              type="button"
              aria-label="Bildirimi kapat"
              className="text-muted-foreground ml-1 cursor-pointer text-xl leading-none"
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
