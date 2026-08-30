"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MaterialIcon } from "@/components/MaterialIcon";
import { getProduct, listProducts, getErrorMessage, fileUrl } from "@/services/api";
import type { Product } from "@/services/api";
import { addToCartStorage } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const CATEGORY_LABELS: Record<string, string> = {
  icecek: "İçecek",
  ev: "Ev & Mutfak",
  bakim: "Bakım & Güzellik",
  enerji: "Enerji & Sağlık",
  gida: "Gıda",
  diger: "Diğer",
};

// Görseli olmayan ürünler için kategori bazlı görsel fallback (public/kategoriler/).
const CATEGORY_IMAGE: Record<string, string> = {
  icecek: "/kategoriler/icecek.jpg",
  enerji: "/kategoriler/enerji.jpg",
  bakim: "/kategoriler/bakim.jpg",
  ev: "/kategoriler/ev.jpg",
  diger: "/kategoriler/diger.jpg",
};

function productIcon(name: string, size = 80) {
  const n = name.toLowerCase();
  if (n.includes("kahve") || n.includes("coffee")) return <MaterialIcon name="Coffee" size={size} />;
  if (n.includes("enerji") || n.includes("energy")) return <MaterialIcon name="Zap" size={size} />;
  if (n.includes("su") || n.includes("drink") || n.includes("çay")) return <MaterialIcon name="CupSoda" size={size} />;
  if (n.includes("krem") || n.includes("bakım") || n.includes("beauty") || n.includes("cilt"))
    return <MaterialIcon name="Flower2" size={size} />;
  return <MaterialIcon name="ShoppingBag" size={size} />;
}

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  // key={id}: ürünler arası geçişte (örn. Benzer Ürünler) tüm durum temizlenir,
  // yükleme ekranı gösterilir ve yeni ürün çekilir.
  return <ProductDetail key={id} id={id} />;
}

function ProductDetail({ id }: { id: number }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [snackbar, setSnackbar] = useState("");
  const [similar, setSimilar] = useState<Product[]>([]);
  const [similarLoading, setSimilarLoading] = useState(true);

  useEffect(() => {
    getProduct(id)
      .then(setProduct)
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  // Benzer Ürünler: aynı kategoriden (category_id veya legacy slug) en fazla 4 ürün, kendisi hariç.
  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    listProducts()
      .then((all) => {
        if (cancelled) return;
        const same = all
          .filter(
            (p) =>
              p.id !== product.id &&
              ((product.category_id != null && p.category_id === product.category_id) ||
                (product.category && p.category === product.category))
          )
          .slice(0, 4);
        setSimilar(same);
      })
      .catch(() => {
        /* benzer ürünler isteğe bağlı — sessizce geç */
      })
      .finally(() => {
        if (!cancelled) setSimilarLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product]);

  if (error) {
    return (
      <div className="bg-background min-h-screen px-4 py-10 pt-[112px] text-center md:pt-[104px]">
        <h2 className="text-muted-foreground mb-2 text-xl font-semibold">{error}</h2>
        <Button asChild>
          <Link href="/shop">Ürünlere Dön</Link>
        </Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-background flex min-h-[60vh] items-center justify-center pt-[112px] md:pt-[104px]">
        <MaterialIcon name="Loader2" className="text-primary size-8 animate-spin" />
      </div>
    );
  }

  const soldOut = product.stock <= 0;
  const categorySlug = product.category ?? null;
  const categoryLabel = product.category_name ?? CATEGORY_LABELS[product.category ?? ""] ?? "Diğer";
  const image = fileUrl(product.image_path) ?? CATEGORY_IMAGE[product.category ?? "diger"] ?? null;

  return (
    <div className="bg-background min-h-screen px-0 pt-[112px] pb-8 md:pt-[104px]">
      <div className="mx-auto w-full px-4 md:w-[75%] md:px-0">
        {/* Breadcrumb: Anasayfa / Ürünler / {ürün adı} */}
        <nav aria-label="breadcrumb" className="mb-3 flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="text-muted-foreground inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <MaterialIcon name="Home" className="size-3.5" />
            Anasayfa
          </Link>
          <MaterialIcon name="ChevronRight" className="text-muted-foreground/50 size-4" />
          <Link href="/shop" className="text-muted-foreground transition-colors hover:text-foreground">
            Ürünler
          </Link>
          <MaterialIcon name="ChevronRight" className="text-muted-foreground/50 size-4" />
          <span className="text-foreground max-w-[40vw] truncate font-semibold md:max-w-xs">{product.name}</span>
        </nav>

        <Button
          variant="ghost"
          onClick={() => router.push("/shop")}
          className="text-foreground mb-3 ml-[-8px] font-semibold"
        >
          <MaterialIcon name="ArrowLeft" className="size-4" />
          Ürünlere Dön
        </Button>

        {/* Ürün kartı */}
        <div className="border-border bg-card overflow-hidden rounded-[17px] border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Sol: görsel (fallback: kategori görseli -> ürün ikonu; boş beyaz kutu bırakılmaz) */}
            <div className="bg-secondary-light/40 relative flex min-h-[280px] items-center justify-center overflow-hidden md:min-h-[460px]">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={product.name}
                  className="block h-[300px] w-full object-cover md:h-full"
                  style={{ filter: soldOut ? "grayscale(1) opacity(0.55)" : "saturate(1.1)" }}
                />
              ) : (
                <div className="from-secondary/70 to-secondary-light/40 text-primary-dark flex flex-col items-center gap-3 bg-gradient-to-br p-10">
                  {productIcon(product.name, 96)}
                  <span className="text-muted-foreground text-xs font-medium">
                    {product.category_name ?? categoryLabel}
                  </span>
                </div>
              )}
              {soldOut && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-destructive text-white rounded-full px-4 py-1.5 text-sm font-bold shadow-lg">
                    Stokta yok
                  </span>
                </div>
              )}
            </div>

            {/* Sağ: detay */}
            <div className="flex flex-col p-4 md:p-6">
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {categorySlug ? (
                  <Link
                    href={`/shop?category=${encodeURIComponent(categorySlug)}`}
                    className="inline-flex transition-opacity hover:opacity-80"
                  >
                    <Badge
                      variant="outline"
                      className="border-border text-muted-foreground cursor-pointer font-medium transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      <MaterialIcon name="Tag" className="size-3" />
                      {categoryLabel}
                    </Badge>
                  </Link>
                ) : (
                  <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                    <MaterialIcon name="Tag" className="size-3" />
                    {categoryLabel}
                  </Badge>
                )}
                <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                  <MaterialIcon name="Package" className="size-3" />
                  SKU: {product.sku ?? "—"}
                </Badge>
                <Badge className="bg-secondary text-primary-dark font-semibold">
                  {product.pv} PV · {product.cv} CV
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-semibold",
                    soldOut ? "border-destructive/50 text-destructive" : "border-[#2E7D32]/50 text-[#2E7D32]"
                  )}
                >
                  {soldOut ? "Stokta yok" : `Stokta (${product.stock} adet)`}
                </Badge>
              </div>

              <h1 className="text-primary-dark text-3xl leading-tight font-extrabold md:text-4xl">{product.name}</h1>

              <p className="text-primary-dark mt-3 text-3xl font-black md:text-4xl">{tl(product.price)}</p>

              <p className="text-muted-foreground mt-4 leading-relaxed">
                {product.description || "Bu ürün için açıklama bulunmuyor."}
              </p>

              <div className="mt-auto pt-6">
                <div className="border-border bg-accent/40 flex flex-wrap items-center gap-3 rounded-xl border p-3">
                  <div className="border-border flex items-center gap-0.5 rounded-full border bg-background px-0.5 py-0.25">
                    <button
                      type="button"
                      aria-label="Adedi azalt"
                      disabled={qty <= 1 || soldOut}
                      onClick={() => setQty((q) => q - 1)}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                    >
                      <MaterialIcon name="Minus" className="size-4" />
                    </button>
                    <span className="min-w-[28px] text-center text-base font-bold">{qty}</span>
                    <button
                      type="button"
                      aria-label="Adedi artır"
                      disabled={soldOut || qty >= product.stock}
                      onClick={() => setQty((q) => q + 1)}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                    >
                      <MaterialIcon name="Plus" className="size-4" />
                    </button>
                  </div>

                  <Button
                    size="lg"
                    className="h-[52px] min-w-[220px] flex-1"
                    disabled={soldOut}
                    onClick={() => {
                      addToCartStorage(product, qty);
                      setSnackbar(`"${product.name}" sepete eklendi.`);
                    }}
                  >
                    <MaterialIcon name="ShoppingCart" className="size-5" />
                    Sepete Ekle
                  </Button>
                </div>
                {soldOut && (
                  <p className="text-destructive mt-2 text-xs font-medium">
                    Bu ürün stokta olmadığı için sepete eklenemiyor.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Benzer Ürünler */}
        {(similar.length > 0 || similarLoading) && (
          <section className="mt-8">
            <h2 className="text-primary-dark mb-3 text-xl font-extrabold md:text-2xl">Benzer Ürünler</h2>
            {similarLoading ? (
              <div className="flex h-40 items-center justify-center">
                <MaterialIcon name="Loader2" className="text-primary size-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {similar.map((p) => {
                  const out = p.stock <= 0;
                  const img = fileUrl(p.image_path) ?? CATEGORY_IMAGE[p.category ?? "diger"];
                  return (
                    <div
                      key={p.id}
                      className="group border-border bg-card relative flex h-full cursor-pointer flex-col overflow-hidden rounded border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                      onClick={() => router.push(`/product/${p.id}`)}
                    >
                      <div className="bg-secondary-light/50 relative h-[130px] overflow-hidden">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={p.name}
                            loading="lazy"
                            className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            style={{ filter: out ? "grayscale(1) opacity(0.5)" : "saturate(1.08)" }}
                          />
                        ) : (
                          <div className="text-primary-dark flex h-full items-center justify-center">
                            {productIcon(p.name, 40)}
                          </div>
                        )}
                        <Badge
                          className={cn(
                            "absolute top-2 left-2 h-5 border-0 text-[10px]",
                            out ? "bg-destructive text-white" : "bg-white/90 text-[#2E7D32]"
                          )}
                        >
                          {out ? "Stokta yok" : "Stokta"}
                        </Badge>
                      </div>
                      <div className="flex flex-1 flex-col p-2.5">
                        <h3 className="line-clamp-2 text-[0.85rem] leading-snug font-bold">{p.name}</h3>
                        <p className="text-primary-dark mt-1.5 text-sm font-extrabold">{tl(p.price)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Sepete ekleme bildirimi */}
      {snackbar && (
        <div className="fixed bottom-5 left-1/2 z-[1300] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="bg-foreground text-background shadow-lg flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold">
            <MaterialIcon name="Check" className="size-5 shrink-0" />
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
