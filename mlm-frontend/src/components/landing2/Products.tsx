"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  ArrowRight,
  Plus,
  Minus,
  Check,
  PackageSearch,
  Eye,
} from "lucide-react";
import { listPopularProducts, listProducts, fileUrl } from "@/services/api";
import type { PopularProduct } from "@/services/api";
import { addToCartStorage } from "@/lib/cart";
import { Reveal } from "../landing/Reveal";
import { BASE_PATH } from "@/lib/api";
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

// Görseli olmayan ürünler için kategori bazlı görsel fallback (public/kategoriler/).
const CATEGORY_IMAGE: Record<string, string> = {
  icecek: `${BASE_PATH}/kategoriler/icecek.jpg`,
  enerji: `${BASE_PATH}/kategoriler/enerji.jpg`,
  bakim: `${BASE_PATH}/kategoriler/bakim.jpg`,
  ev: `${BASE_PATH}/kategoriler/ev.jpg`,
  diger: `${BASE_PATH}/kategoriler/diger.jpg`,
};

// Ürün görselini çözer: DB görseli yoksa kategori görseline düşer.
function resolveImage(p: PopularProduct): string | null {
  if (p.image_path) return fileUrl(p.image_path);
  return CATEGORY_IMAGE[(p.category ?? "diger")] ?? CATEGORY_IMAGE.diger;
}

// Ürünlerimiz bölümü — hafta içinde en çok satın alınan ürünler (stokta olanlar öncelikli).
// Kartlarda adet seçimi + Sepete Ekle; tıklayınca ürün detay sayfası açılır.
export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState<PopularProduct[] | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [error, setError] = useState(false);
  const [snackbar, setSnackbar] = useState("");

  const load = () => {
    listPopularProducts(6, 7)
      .then((ps) => {
        if (ps.length > 0) {
          // Önce stokta olanları al (tükenen ürünler gri görünmesin); 3'ten fazla yoksa stoktakilerle tamamla.
          const inStock = ps.filter((p) => p.stock > 0);
          const picked = inStock.slice(0, 3);
          if (picked.length < 3) {
            listProducts()
              .then((all) => {
                const rest = all
                  .filter((p) => p.stock > 0 && !picked.some((x) => x.id === p.id))
                  .slice(0, 3 - picked.length)
                  .map((p) => ({ ...p, sold_quantity: 0 }));
                setProducts([...picked, ...rest].slice(0, 3));
              })
              .catch(() => setProducts(picked.slice(0, 3)));
          } else {
            setProducts(picked.slice(0, 3));
          }
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
    <section id="urunler" className="bg-card py-10 scroll-mt-[112px] md:py-14">
      {/* Başlık */}
      <Reveal>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
          <div>
            <span className="text-primary dark:text-primary-dark text-xs font-bold tracking-[0.22em] uppercase">
              Çok Satanlar
            </span>
            <h2 className="text-primary-dark mt-2 text-3xl font-bold md:text-4xl">
              Ürünlerimiz
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm md:text-base">
              En çok tercih edilen ürünler — PV/CV puan kazanın, seviye atlayın.
            </p>
          </div>
          <Button asChild variant="outline" className="text-primary border-primary/40 rounded hover:bg-primary/5">
            <Link href="/shop">
              Tümünü Gör
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Reveal>

      {/* Yükleniyor */}
      {products === null && !error ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[330px]" />
          ))}
        </div>
      ) : error ? (
        <div className="text-muted-foreground py-10 text-center">
          <PackageSearch className="text-muted-foreground mx-auto mb-2 size-12" />
          <p>Ürünler yüklenemedi. Lütfen tekrar deneyin.</p>
          <Button
            variant="default"
            onClick={() => {
              setProducts(null);
              setError(false);
              void load();
            }}
            className="mt-3"
          >
            Tekrar Dene
          </Button>
        </div>
      ) : products && products.length === 0 ? (
        <div className="text-muted-foreground py-10 text-center">
          <PackageSearch className="text-muted-foreground mx-auto mb-2 size-12" />
          <p>Henüz ürün eklenmemiş.</p>
          <Button asChild className="mt-3">
            <Link href="/shop">Alışverişe Başla</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products?.map((p, index) => {
            const qty = quantityOf(p.id);
            const soldOut = p.stock <= 0;
            const image = resolveImage(p);
            return (
              <Reveal key={p.id} delay={(index % 3) * 80} className="h-full">
                <div
                  className="group border-border bg-background relative flex h-full cursor-pointer flex-col overflow-hidden rounded border shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.22)]"
                  onClick={() => router.push(`/product/${p.id}`)}
                >
                  {/* Görsel */}
                  <div className="relative h-[160px] overflow-hidden">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={p.name}
                        loading={index === 0 ? "eager" : "lazy"}
                        className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{
                          filter: soldOut ? "grayscale(1) opacity(0.5)" : "saturate(1.08)",
                        }}
                      />
                    ) : (
                      <div className="bg-gradient-to-br from-secondary-light to-secondary flex h-full w-full items-center justify-center">
                        <PackageSearch className="text-primary-dark size-12" />
                      </div>
                    )}

                    {/* Rozetler */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
                      <Badge
                        className={cn(
                          "border-0 shadow-sm",
                          soldOut
                            ? "bg-destructive text-white"
                            : "bg-white/90 text-[#2E7D32] backdrop-blur-sm"
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", soldOut ? "bg-white" : "bg-[#2E7D32]")} />
                        {soldOut ? "Stokta Yok" : "Stokta"}
                      </Badge>
                    </div>
                    {p.sold_quantity > 0 && !soldOut && (
                      <Badge className="bg-primary absolute top-2.5 right-2.5 border-0 text-white shadow-sm">
                        Bu hafta {p.sold_quantity} adet
                      </Badge>
                    )}

                    {/* Hover inceleme */}
                    <div className="bg-black/25 absolute inset-0 flex items-center justify-center opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-primary-dark shadow-lg">
                        <Eye className="size-4" />
                        İncele
                      </span>
                    </div>
                  </div>

                  {/* İçerik */}
                  <div className="flex flex-1 flex-col p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 flex-1 text-[0.92rem] leading-snug font-bold text-foreground">
                        {p.name}
                      </h3>
                    </div>
                    {p.description ? (
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[0.78rem]">
                        {p.description}
                      </p>
                    ) : null}

                    {/* PV/CV rozeti */}
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <Badge variant="secondary" className="bg-secondary/70 px-1.5 py-0 text-[9.5px] font-bold text-primary-dark">
                        +{p.pv} PV
                      </Badge>
                      <Badge variant="secondary" className="bg-secondary/70 px-1.5 py-0 text-[9.5px] font-bold text-primary-dark">
                        +{p.cv} CV
                      </Badge>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <p className="text-primary-dark text-lg font-black tracking-tight">
                        {formatPrice(p.price)}
                      </p>
                    </div>

                    <div className="border-border my-2.5 h-px w-full" />

                    {/* Aksiyonlar */}
                    <div className="mt-auto flex items-center gap-2">
                      <div className="border-border bg-muted/50 flex shrink-0 items-center gap-1 rounded border px-1 py-1">
                        <button
                          type="button"
                          aria-label="Adedi azalt"
                          disabled={qty <= 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            changeQuantity(p.id, -1, p.stock);
                          }}
                          className="text-primary hover:bg-accent flex size-7 cursor-pointer items-center justify-center rounded-[7px] transition-colors disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="min-w-[20px] text-center text-sm font-bold">{qty}</span>
                        <button
                          type="button"
                          aria-label="Adedi artır"
                          disabled={qty >= p.stock}
                          onClick={(e) => {
                            e.stopPropagation();
                            changeQuantity(p.id, 1, p.stock);
                          }}
                          className="text-primary hover:bg-accent flex size-7 cursor-pointer items-center justify-center rounded-[7px] transition-colors disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 flex-1 text-[13px]"
                        disabled={soldOut}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(p, quantityOf(p.id));
                        }}
                      >
                        <ShoppingCart className="size-3.5" />
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
          <div className="bg-foreground text-background shadow-lg flex items-center gap-2 rounded px-5 py-3 text-sm font-semibold">
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
