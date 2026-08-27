"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Minus,
  ShoppingCart,
  Coffee,
  Zap,
  CupSoda,
  Flower2,
  ShoppingBag,
  Check,
  Loader2,
} from "lucide-react";
import { getProduct, getErrorMessage, fileUrl } from "@/services/api";
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

function productIcon(name: string, size = 80) {
  const n = name.toLowerCase();
  if (n.includes("kahve") || n.includes("coffee")) return <Coffee style={{ width: size, height: size }} />;
  if (n.includes("enerji") || n.includes("energy")) return <Zap style={{ width: size, height: size }} />;
  if (n.includes("su") || n.includes("drink") || n.includes("çay")) return <CupSoda style={{ width: size, height: size }} />;
  if (n.includes("krem") || n.includes("bakım") || n.includes("beauty") || n.includes("cilt"))
    return <Flower2 style={{ width: size, height: size }} />;
  return <ShoppingBag style={{ width: size, height: size }} />;
}

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [snackbar, setSnackbar] = useState("");

  const id = Number(params.id);

  useEffect(() => {
    getProduct(id)
      .then(setProduct)
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

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
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    );
  }

  const soldOut = product.stock <= 0;

  return (
    <div className="bg-background min-h-screen px-0 pt-[96px] pb-8 md:pt-[88px]">
      <div className="mx-auto w-[75%]">
        <Button
          variant="ghost"
          onClick={() => router.push("/shop")}
          className="text-foreground mb-3 ml-[-8px] font-semibold"
        >
          <ArrowLeft className="size-4" />
          Ürünlere Dön
        </Button>

        <div className="border-border bg-card overflow-hidden rounded-[17px] border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Görsel */}
            <div
              className="bg-secondary flex items-center justify-center overflow-hidden md:min-h-[420px]"
              style={{ height: "auto" }}
            >
              {fileUrl(product.image_path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl(product.image_path)!}
                  alt={product.name}
                  className="block h-[280px] w-full object-cover md:h-full"
                  style={{
                    filter: soldOut ? "grayscale(1) opacity(0.55)" : "saturate(1.1)",
                  }}
                />
              ) : (
                <div className="text-primary-dark flex p-10">{productIcon(product.name)}</div>
              )}
            </div>

            {/* Detay */}
            <div className="p-4 md:p-5">
              <div className="mb-1.5 flex flex-wrap gap-1">
                <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                  {CATEGORY_LABELS[product.category ?? ""] ?? "Diğer"}
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                  Stok Kodu: {product.sku ?? "—"}
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
                  {soldOut ? "Stokta Yok" : "Stokta"}
                </Badge>
              </div>

              <h1 className="text-primary-dark text-3xl font-extrabold md:text-4xl">{product.name}</h1>
              <p className="text-muted-foreground mt-1.5">
                {product.description || "Açıklama yok."}
              </p>

              <p className="text-primary-dark mt-3 text-3xl font-black md:text-4xl">{tl(product.price)}</p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <div className="border-border flex items-center gap-0.5 rounded-full border px-0.5 py-0.25">
                  <button
                    type="button"
                    aria-label="Adedi azalt"
                    disabled={qty <= 1}
                    onClick={() => setQty((q) => q - 1)}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-[26px] text-center text-base font-bold">{qty}</span>
                  <button
                    type="button"
                    aria-label="Adedi artır"
                    disabled={qty >= product.stock}
                    onClick={() => setQty((q) => q + 1)}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Plus className="size-4" />
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
                  <ShoppingCart className="size-5" />
                  Sepete Ekle
                </Button>
              </div>
            </div>
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
