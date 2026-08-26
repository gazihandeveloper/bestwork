"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Coffee,
  Zap,
  CupSoda,
  Flower2,
  ShoppingBag,
  ShoppingCart,
  ArrowRight,
  Plus,
  Minus,
  Check,
  PackageSearch,
} from "lucide-react";
import { listPopularProducts, listProducts, fileUrl } from "@/services/api";
import type { PopularProduct } from "@/services/api";
import { addToCartStorage } from "@/lib/cart";
import { Reveal } from "../landing/Reveal";
import { PASTELS } from "../landing/tokens";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const formatPrice = (v: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

function productIcon(name: string, size = 64) {
  const n = name.toLowerCase();
  if (n.includes("kahve") || n.includes("coffee")) return <Coffee style={{ width: size, height: size }} />;
  if (n.includes("enerji") || n.includes("energy")) return <Zap style={{ width: size, height: size }} />;
  if (n.includes("su") || n.includes("drink") || n.includes("çay")) return <CupSoda style={{ width: size, height: size }} />;
  if (n.includes("krem") || n.includes("bakım") || n.includes("beauty") || n.includes("cilt"))
    return <Flower2 style={{ width: size, height: size }} />;
  return <ShoppingBag style={{ width: size, height: size }} />;
}

// PASTELS + secondary tonlarında döngülü gradyanlar (kart görsel zemini).
const mediaGradient = (index: number) => {
  const gradients = [
    `linear-gradient(135deg, ${PASTELS.mint}, var(--secondary-light))`,
    `linear-gradient(135deg, var(--secondary), var(--secondary-light))`,
    `linear-gradient(135deg, ${PASTELS.peach}, var(--secondary-light))`,
  ];
  return gradients[index % 3];
};

// Ürünlerimiz bölümü — hafta içinde en çok satın alınan 3 ürün.
// Kartlarda adet seçimi + Sepete Ekle; tıklayınca ürün detay sayfası açılır.
export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState<PopularProduct[] | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [error, setError] = useState(false);
  const [snackbar, setSnackbar] = useState("");

  const load = () => {
    listPopularProducts(3, 7)
      .then((ps) => {
        if (ps.length > 0) {
          // Stok durumu ne olursa olsun en çok satılan 3 ürünü göster.
          setProducts(ps.slice(0, 3));
        } else {
          // Henüz satış yoksa stoktaki ilk 3 ürünü göster.
          listProducts().then((all) =>
            setProducts(
              all
                .filter((p) => p.stock > 0)
                .slice(0, 3)
                .map((p) => ({ ...p, sold_quantity: 0 })),
            ),
          );
        }
      })
      .catch((err: unknown) => {
        console.error("Ürünler yüklenemedi:", err);
        setError(true);
      });
  };

  useEffect(() => {
    void load();
  }, []);

  const quantityOf = (id: number) => quantities[id] ?? 1;

  const changeQuantity = (id: number, delta: number, stock: number) => {
    setQuantities((prev) => {
      const next = Math.min(Math.max((prev[id] ?? 1) + delta, 1), Math.max(stock, 1));
      return { ...prev, [id]: next };
    });
  };

  const handleAddToCart = (p: PopularProduct, quantity = 1) => {
    addToCartStorage(p, quantity);
    setSnackbar(`"${p.name}" sepete eklendi.`);
  };

  return (
    <section id="urunler" className="bg-card py-8 scroll-mt-[112px]">
      <Reveal>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-primary text-xs font-bold tracking-[2px] uppercase">ÇOK SATANLAR</p>
            <h2 className="text-primary-dark text-3xl font-bold">Ürünlerimiz</h2>
            <p className="text-muted-foreground">Hafta içinde en çok satın alınan 3 ürün.</p>
          </div>
          <Button asChild variant="ghost" className="text-primary">
            <Link href="/shop">
              Tümünü Gör
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Reveal>

      {products === null && !error ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[420px]" />
          ))}
        </div>
      ) : error ? (
        <div className="text-muted-foreground py-8 text-center">
          <PackageSearch className="text-muted-foreground mx-auto mb-1 size-12" />
          <p>Ürünler yüklenemedi. Lütfen tekrar deneyin.</p>
          <Button
            variant="default"
            onClick={() => {
              setProducts(null);
              setError(false);
              void load();
            }}
            className="mt-2"
          >
            Tekrar Dene
          </Button>
        </div>
      ) : products && products.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          <PackageSearch className="text-muted-foreground mx-auto mb-1 size-12" />
          <p>Henüz ürün eklenmemiş.</p>
          <Button asChild className="mt-2">
            <Link href="/shop">Alışverişe Başla</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products?.map((p, index) => {
            const qty = quantityOf(p.id);
            const soldOut = p.stock <= 0;
            return (
              <Reveal key={p.id} delay={(index % 3) * 80} className="h-full">
                <div
                  className="border-border bg-card group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  onClick={() => router.push(`/product/${p.id}`)}
                >
                  <div
                    className="relative flex h-[180px] items-center justify-center overflow-hidden"
                    style={{ background: mediaGradient(index) }}
                  >
                    <div
                      aria-hidden
                      className="absolute -top-10 -right-10 size-[140px] rounded-full bg-white/25"
                    />
                    <div
                      aria-hidden
                      className="absolute -bottom-9 -left-9 size-[120px] rounded-full bg-white/15"
                    />
                    <Badge
                      className={cn(
                        "absolute top-2.5 left-2.5 z-[2] bg-white/92",
                        soldOut ? "text-destructive" : "text-[#2E7D32]"
                      )}
                    >
                      <PackageSearch className="size-3.5" />
                      {soldOut ? "Stokta Yok" : "Stokta"}
                    </Badge>
                    {p.sold_quantity > 0 && (
                      <Badge className="bg-primary absolute top-2.5 right-2.5 z-[2] text-white">
                        Bu hafta {p.sold_quantity} adet
                      </Badge>
                    )}
                    {p.image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fileUrl(p.image_path) ?? ""}
                        alt={p.name}
                        loading={index === 0 ? "eager" : "lazy"}
                        className="block h-full w-full object-cover transition-transform duration-350 group-hover:scale-105"
                        style={{
                          filter: soldOut ? "grayscale(1) opacity(0.55)" : "saturate(1.1)",
                        }}
                      />
                    ) : (
                      <div
                        className="text-primary-dark transition-transform duration-350 group-hover:scale-105"
                        style={{ filter: soldOut ? "grayscale(1) opacity(0.55)" : "none" }}
                      >
                        {productIcon(p.name)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="truncate text-[1.05rem] leading-[1.35] font-bold">
                      {p.name}
                    </h3>
                    {p.description ? (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                        {p.description}
                      </p>
                    ) : null}

                    <div className="mt-1">
                      <p className="text-primary-dark text-lg font-extrabold">
                        {formatPrice(p.price)}
                      </p>
                    </div>

                    <div className="border-border my-1.5 h-px w-full" />

                    <div className="mt-auto flex items-center gap-1.5">
                      <div className="border-border bg-muted/40 flex items-center gap-1 rounded-full border px-1 py-1">
                        <button
                          type="button"
                          aria-label="Adedi azalt"
                          disabled={qty <= 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            changeQuantity(p.id, -1, p.stock);
                          }}
                          className="flex size-8 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="min-w-[22px] text-center text-sm font-bold">{qty}</span>
                        <button
                          type="button"
                          aria-label="Adedi artır"
                          disabled={qty >= p.stock}
                          onClick={(e) => {
                            e.stopPropagation();
                            changeQuantity(p.id, 1, p.stock);
                          }}
                          className="flex size-8 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <Button
                        className="h-10 flex-1"
                        disabled={soldOut}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(p, quantityOf(p.id));
                        }}
                      >
                        <ShoppingCart className="size-4" />
                        Sepete Ekle
                      </Button>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

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
              className="ml-1 cursor-pointer text-xl leading-none opacity-60 transition-opacity hover:opacity-100"
              onClick={() => setSnackbar("")}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
