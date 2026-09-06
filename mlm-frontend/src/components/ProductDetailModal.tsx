"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getProduct, getErrorMessage, fileUrl } from "@/services/api";
import type { Product } from "@/services/api";
import { addToCartStorage } from "@/lib/cart";
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

// Ürün detay modalı — /product/[id] sayfasının içeriğini modal içinde gösterir.
export default function ProductDetailModal({
  open,
  onClose,
  productId,
  discountRate = 0,
}: {
  open: boolean;
  onClose: () => void;
  productId: number | null;
  discountRate?: number;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!open || productId == null) return;
    setProduct(null);
    setError("");
    setQty(1);
    setAdded(false);
    getProduct(productId)
      .then(setProduct)
      .catch((err) => setError(getErrorMessage(err)));
  }, [open, productId]);

  const discounted = (price: number) => Math.round(price * (1 - discountRate) * 100) / 100;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0">
        {error ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={onClose}>Kapat</Button>
          </div>
        ) : !product ? (
          <div className="flex h-56 items-center justify-center">
            <MaterialIcon name="Loader2" className="text-primary size-8 animate-spin" />
          </div>
        ) : (
          <>
            <DialogTitle className="sr-only">{product.name}</DialogTitle>
            <div className="max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Sol: görsel (fallback: kategori görseli -> ürün ikonu) */}
                <div className="bg-secondary-light/40 relative flex min-h-[260px] items-center justify-center overflow-hidden md:min-h-[420px]">
                  {fileUrl(product.image_path) ?? CATEGORY_IMAGE[product.category ?? "diger"] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(fileUrl(product.image_path) ?? CATEGORY_IMAGE[product.category ?? "diger"])!}
                      alt={product.name}
                      className="block h-[280px] w-full object-cover md:h-full"
                      style={{ filter: product.stock <= 0 ? "grayscale(1) opacity(0.55)" : "saturate(1.1)" }}
                    />
                  ) : (
                    <div className="from-secondary/70 to-secondary-light/40 text-primary-dark flex flex-col items-center gap-3 bg-gradient-to-br p-10">
                      {productIcon(product.name, 96)}
                      <span className="text-muted-foreground text-xs font-medium">
                        {product.category_name ?? CATEGORY_LABELS[product.category ?? ""] ?? "Diğer"}
                      </span>
                    </div>
                  )}
                  {product.stock <= 0 && (
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
                    <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                      <MaterialIcon name="Tag" className="size-3" />
                      {product.category_name ?? CATEGORY_LABELS[product.category ?? ""] ?? "Diğer"}
                    </Badge>
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
                        product.stock <= 0 ? "border-destructive/50 text-destructive" : "border-[#2E7D32]/50 text-[#2E7D32]"
                      )}
                    >
                      {product.stock <= 0 ? "Stokta yok" : `Stokta (${product.stock} adet)`}
                    </Badge>
                  </div>

                  <h2 className="text-primary-dark text-2xl leading-tight font-extrabold md:text-3xl">{product.name}</h2>

                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    <span className="text-primary-dark text-3xl font-black md:text-4xl">
                      {discountRate > 0 ? tl(discounted(product.price)) : tl(product.price)}
                    </span>
                    {discountRate > 0 && (
                      <>
                        <span className="text-muted-foreground text-sm line-through">{tl(product.price)}</span>
                        <span className="text-primary-dark text-sm font-bold">-%{Math.round(discountRate * 100)}</span>
                      </>
                    )}
                  </div>

                  <p className="text-muted-foreground mt-4 leading-relaxed">
                    {product.description || "Bu ürün için açıklama bulunmuyor."}
                  </p>

                  <div className="mt-auto pt-6">
                    <div className="border-border bg-accent/40 flex flex-wrap items-center gap-3 rounded-xl border p-3">
                      <div className="border-border flex items-center gap-0.5 rounded-full border bg-background px-0.5 py-0.25">
                        <button
                          type="button"
                          aria-label="Adedi azalt"
                          disabled={qty <= 1 || product.stock <= 0}
                          onClick={() => setQty((q) => q - 1)}
                          className="flex size-9 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                        >
                          <MaterialIcon name="Minus" className="size-4" />
                        </button>
                        <span className="min-w-[28px] text-center text-base font-bold">{qty}</span>
                        <button
                          type="button"
                          aria-label="Adedi artır"
                          disabled={product.stock <= 0 || qty >= product.stock}
                          onClick={() => setQty((q) => q + 1)}
                          className="flex size-9 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                        >
                          <MaterialIcon name="Plus" className="size-4" />
                        </button>
                      </div>

                      <Button
                        size="lg"
                        className="h-[52px] min-w-[200px] flex-1"
                        disabled={product.stock <= 0}
                        onClick={() => {
                          addToCartStorage(product, qty);
                          setAdded(true);
                          setTimeout(() => setAdded(false), 1500);
                        }}
                      >
                        <MaterialIcon name={added ? "Check" : "ShoppingCart"} className="size-5" />
                        {added ? "Sepete Eklendi" : "Sepete Ekle"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
