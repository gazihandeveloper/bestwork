"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/MaterialIcon";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { loadCart, saveCart, addToCartStorage, decrementCart, removeFromCart, setCartQuantity } from "@/lib/cart";
import type { CartItem } from "@/lib/cart";
import QtyInput from "@/components/QtyInput";
import { createOrder, getPackages, getErrorMessage, fileUrl as apiFileUrl } from "@/services/api";
import type { Package } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import RequireAuth from "@/components/RequireAuth";
import ProductDetailModal from "@/components/ProductDetailModal";
import { cn } from "@/lib/utils";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

// Ayrı sepet sayfası — /cart
function CartContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [successOrder, setSuccessOrder] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  useEffect(() => {
    getPackages().then(setPackages).catch(() => {});
  }, []);
  // Kargo ayarları (admin panelinden yönetilir)
  const [shippingSettings, setShippingSettings] = useState<{ fee: number; threshold: number }>({ fee: 0, threshold: 0 });
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api"}/settings`)
      .then((r) => r.json())
      .then((d) => {
        const s = d?.settings ?? {};
        setShippingSettings({
          fee: Number(s.shipping_fee ?? 0) || 0,
          threshold: Number(s.free_shipping_threshold ?? 0) || 0,
        });
      })
      .catch(() => {});
  }, []);
  // Üyenin paket indirim oranı (örn. Platin %25)
  const userPkg = packages.find((p) => p.id === user?.package_id);
  const discountRate = userPkg?.discount_rate ?? 0;

  // Sepet verisi
  useEffect(() => {
    const refresh = () => setItems(loadCart());
    refresh();
    window.addEventListener("cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Mağazada gösterilen indirimli fiyat sepete aynen gelir; sepette TEKRAR indirim uygulanmaz.
  const itemPrice = (c: CartItem) =>
    c.retail ? c.product.price : Math.round(c.product.price * (1 - discountRate) * 100) / 100;
  const itemPV = (c: CartItem) => (c.retail ? c.product.pv : c.product.pv * (1 - discountRate));
  const itemCV = (c: CartItem) => (c.retail ? c.product.cv : c.product.cv * (1 - discountRate));

  const totalAmount = items.reduce((sum, c) => sum + itemPrice(c) * c.quantity, 0);
  const totalPV = items.reduce((sum, c) => sum + itemPV(c) * c.quantity, 0);
  const totalCV = items.reduce((sum, c) => sum + itemCV(c) * c.quantity, 0);
  const totalQuantity = items.reduce((sum, c) => sum + c.quantity, 0);
  // İndirim ÖNCESİ normal (katalog) toplam satış tutarı.
  const totalGross = items.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  // Paket indirimi sayesinde kazanılan toplam tutar (perakende ürünlerde indirim yoktur).
  const totalDiscount = items.reduce(
    (sum, c) => sum + (c.retail ? 0 : (c.product.price - itemPrice(c)) * c.quantity),
    0
  );
  // Kargo: ürün toplamı eşiği geçerse ücretsiz; geçmezse sabit ücret.
  // Perakende (paket yükseltme) siparişlerinde kargo uygulanmaz (backend ile aynı kural).
  const isRetail = items.some((c) => c.retail);
  const shippingFee =
    !isRetail && shippingSettings.fee > 0 && !(shippingSettings.threshold > 0 && totalAmount >= shippingSettings.threshold)
      ? shippingSettings.fee
      : 0;
  const payable = totalAmount + shippingFee;

  const checkout = async () => {
    if (!user) {
      // Giriş modalını aç; giriş sonrası sepete dön.
      window.localStorage.setItem("bestwork_login_next", "/cart");
      window.dispatchEvent(new CustomEvent("open-login"));
      return;
    }
    setError("");
    setCheckingOut(true);
    try {
      // Paket yükseltme (perakende) alımlarında indirim uygulanmaz.
      const isRetail = items.some((c) => c.retail);
      const order = await createOrder(
        items.map((c) => ({ product_id: c.product.id, quantity: c.quantity })),
        "eft_havale",
        isRetail,
      );
      setItems([]);
      saveCart([]);
      setSuccessOrder(order.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCheckingOut(false);
    }
  };

  // Başarı bildirimi 8 saniye sonra otomatik kapanır
  useEffect(() => {
    if (successOrder === null) return;
    const t = setTimeout(() => setSuccessOrder(null), 8000);
    return () => clearTimeout(t);
  }, [successOrder]);

  return (
    <div className="py-3">
      {/* Başlık */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => router.push("/shop")}
          className="text-muted-foreground hover:bg-accent rounded px-2"
          aria-label="Alışverişe dön"
        >
          <MaterialIcon name="ArrowLeft" className="size-4" />
        </Button>
        <div>
          <h1 className="text-primary-dark text-2xl font-extrabold">
            Sepetim{items.length > 0 ? ` (${totalQuantity} ürün)` : ""}
          </h1>
          <p className="text-muted-foreground text-sm">
            Siparişleriniz EFT/HAVALE ile tamamlanır.
          </p>
        </div>
      </div>

      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive mb-3 rounded border px-3 py-2 text-sm font-semibold">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="border-border bg-card rounded border py-16 text-center">
          <MaterialIcon name="ShoppingBag" className="text-muted-foreground mx-auto mb-3 size-14" />
          <p className="text-muted-foreground mb-3">Sepetiniz boş.</p>
          <Button variant="outline" onClick={() => router.push("/shop")}>
            Alışverişe Başla
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Sepet öğeleri */}
          <div className="lg:col-span-8">
            <div className="border-border bg-card rounded border p-4">
              {items.map((c) => (
                <div
                  key={c.product.id}
                  className="border-border flex items-center gap-3 border-b py-3 last:border-b-0"
                >
                  <div className="relative size-16 shrink-0">
                    <button
                      type="button"
                      aria-label="Ürün detayını gör"
                      title="Ürün detayı"
                      onClick={() => setDetailId(c.product.id)}
                      className="bg-secondary flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded"
                    >
                      {apiFileUrl(c.product.image_path) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={apiFileUrl(c.product.image_path)!}
                          alt={c.product.name}
                          className="block h-full w-full object-cover"
                        />
                      ) : (
                        <MaterialIcon name="ShoppingBag" className="text-primary-dark" />
                      )}
                    </button>
                    <span className="bg-background/90 text-primary pointer-events-none absolute right-0.5 bottom-0.5 flex size-5 items-center justify-center rounded-full shadow">
                      <MaterialIcon name="Search" className="size-3.5" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setDetailId(c.product.id)}
                      className="block w-full truncate text-left text-sm font-semibold hover:text-primary"
                      title={c.product.name}
                    >
                      {c.product.name.length > 28 ? `${c.product.name.slice(0, 28)}…` : c.product.name}
                    </button>
                    <p className="text-muted-foreground text-xs">
                      {tl(itemPrice(c))} × {c.quantity} = {tl(itemPrice(c) * c.quantity)}
                      {discountRate > 0 && !c.retail && (
                        <span className="text-primary ml-1 font-semibold">(-%{Math.round(discountRate * 100)})</span>
                      )}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="bg-purple-600 rounded px-1.5 py-0.5 text-[10px] font-bold text-white">
                        +{itemPV(c).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} PV
                      </span>
                      <span className="bg-blue-600 rounded px-1.5 py-0.5 text-[10px] font-bold text-white">
                        +{itemCV(c).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} CV
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Adedi azalt"
                      onClick={() => setItems(decrementCart(c.product.id))}
                      className="text-primary hover:bg-accent flex size-8 cursor-pointer items-center justify-center rounded transition-colors"
                    >
                      <MaterialIcon name="Minus" className="size-4" />
                    </button>
                    <QtyInput qty={c.quantity} onChange={(n) => setCartQuantity(c.product, n)} max={c.product.stock} />
                    <button
                      type="button"
                      aria-label="Adedi artır"
                      onClick={() => setItems(addToCartStorage(c.product, 1))}
                      disabled={c.quantity >= c.product.stock}
                      className="text-primary hover:bg-accent flex size-8 cursor-pointer items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-40"
                    >
                      <MaterialIcon name="Plus" className="size-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Ürünü sil"
                    title="Sepetten sil"
                    onClick={() => setItems(removeFromCart(c.product.id))}
                    className="text-destructive hover:bg-destructive/10 flex size-8 cursor-pointer items-center justify-center rounded transition-colors"
                  >
                    <MaterialIcon name="Trash2" className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sipariş özeti */}
          <div className="lg:col-span-4">
            <div className="border-border bg-card rounded border p-4 lg:sticky lg:top-24">
              <p className="mb-2 text-lg font-bold">Sipariş Özeti</p>
              {[
                { label: "Ürün", value: `${totalQuantity} Ürün` },
                { label: "Toplam Satış Tutarı", value: tl(totalGross) },
                { label: "Toplam CV", value: `${totalCV.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} CV` },
                { label: "Toplam PV", value: `${totalPV.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} PV` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground text-sm">{row.label}</span>
                  <span className="text-sm font-semibold">{row.value}</span>
                </div>
              ))}

              {/* Toplam indirim — yeşil satır: ikon + badge içinde beyaz tutar */}
              {totalDiscount > 0 && (
                <div className="border-green-600/30 bg-green-600/10 mt-1 flex items-center justify-between rounded-md border px-2.5 py-1.5">
                  <span className="text-green-700 flex items-center gap-1.5 text-sm font-bold">
                    <MaterialIcon name="percent" className="size-4" />
                    Toplam İndiriminiz
                  </span>
                  <span className="bg-green-600 rounded-full px-2.5 py-0.5 text-xs font-extrabold text-white shadow-sm">
                    -{tl(totalDiscount)}
                  </span>
                </div>
              )}

              {/* Kargo satırı — eşik geçilirse ücretsiz */}
              {!isRetail && shippingSettings.fee > 0 && (
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground text-sm">Kargo</span>
                  {shippingFee > 0 ? (
                    <span className="text-sm font-semibold">{tl(shippingFee)}</span>
                  ) : (
                    <span className="text-green-600 flex items-center gap-1 text-sm font-bold">
                      <MaterialIcon name="check_circle" className="size-4" />
                      Ücretsiz
                      {shippingSettings.threshold > 0 && (
                        <span className="text-muted-foreground text-xs font-normal">
                          ({tl(shippingSettings.threshold)} üzeri)
                        </span>
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Ödenecek tutar — gölgeli kutu */}
              <div className="border-border bg-background shadow-md mt-3 flex items-center justify-between rounded-lg border px-3 py-2.5">
                <span className="text-base font-bold">Ödenecek Tutar</span>
                <span className="text-primary-dark text-lg font-extrabold">{tl(payable)}</span>
              </div>
              <p className="text-muted-foreground mt-1 block text-xs">
                Ödeme: EFT/HAVALE — sipariş, bildirim onaylanana kadar beklemede kalır.
              </p>
              <Separator className="my-3" />
              <Button size="lg" className="w-full" onClick={checkout} disabled={checkingOut}>
                {checkingOut ? "İşleniyor..." : "Siparişi Tamamla"}
              </Button>
              <Button variant="outline" className="mt-2 w-full" onClick={() => router.push("/shop")}>
                Alışverişe Devam Et
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ürün detay modalı — /product/[id] içeriği modal içinde */}
      <ProductDetailModal
        open={detailId !== null}
        productId={detailId}
        onClose={() => setDetailId(null)}
        discountRate={discountRate}
      />

      {/* Başarı bildirimi (Tailwind toast) */}
      {successOrder !== null && (
        <div className="fixed bottom-5 left-1/2 z-[1300] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="bg-foreground text-background shadow-lg flex items-center gap-2 rounded px-5 py-3 text-sm font-semibold">
            <MaterialIcon name="Check" className="size-5 shrink-0" />
            <span className="flex-1 truncate">Sipariş #{successOrder} oluşturuldu (beklemede).</span>
            <Link href="/payment-notifications" className="font-bold underline underline-offset-2">
              Ödeme Bildirimi Yap
            </Link>
            <button
              type="button"
              aria-label="Bildirimi kapat"
              className="ml-1 cursor-pointer text-xl leading-none opacity-60 transition-opacity hover:opacity-100"
              onClick={() => setSuccessOrder(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <RequireAuth>
      <CartContent />
    </RequireAuth>
  );
}
