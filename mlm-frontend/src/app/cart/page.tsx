"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { loadCart, saveCart, addToCartStorage, decrementCart } from "@/lib/cart";
import type { CartItem } from "@/lib/cart";
import { createOrder, getErrorMessage, getMe, fileUrl as apiFileUrl } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import RequireAuth from "@/components/RequireAuth";
import { cn } from "@/lib/utils";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

// Kariyer/paket seviyeleri — hedef PV ve renkler
const LEVELS = [
  { name: "İLK ADIM", pv: 125, color: "#017cc6" }, // mavi
  { name: "STARTER", pv: 250, color: "#017cc6" }, // mavi
  { name: "BRONZ GİRİŞİMCİ", pv: 500, color: "#b4552d" }, // bronz
  { name: "GÜMÜŞ GİRİŞİMCİ", pv: 1300, color: "#9e9e9e" }, // gümüş
  { name: "ALTIN GİRİŞİMCİ", pv: 2500, color: "#c9a227" }, // altın
  { name: "PLATİN", pv: 5000, color: "#9c27b0" }, // mor
];

// Ayrı sepet sayfası — /cart
function CartContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [successOrder, setSuccessOrder] = useState<number | null>(null);
  // Sunucudan canlı çekilen kullanıcı PV'si (seviye kontrolü için sürekli güncellenir)
  const [livePV, setLivePV] = useState<number | null>(null);

  // Kullanıcının güncel PV'sini sunucudan al (login anlık görüntüsü değil)
  const fetchLivePV = useCallback(() => {
    if (!user) return;
    getMe()
      .then((u) => setLivePV(u.total_pv_accumulated ?? 0))
      .catch(() => {
        /* yoksay */
      });
  }, [user]);

  // Sürekli kontrol: her 15 saniyede bir ve giriş değişince güncelle
  useEffect(() => {
    if (!user) return;
    fetchLivePV();
    const id = setInterval(fetchLivePV, 15000);
    return () => clearInterval(id);
  }, [fetchLivePV, user]);

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

  const totalAmount = items.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const totalPV = items.reduce((sum, c) => sum + c.product.pv * c.quantity, 0);
  const totalCV = items.reduce((sum, c) => sum + c.product.cv * c.quantity, 0);
  const totalQuantity = items.reduce((sum, c) => sum + c.quantity, 0);

  // Seviye dolumu: sunucudaki canlı kariyer PV + bu siparişin PV'si
  const careerPV = livePV ?? user?.total_pv_accumulated ?? 0;
  const levelPV = careerPV + totalPV;

  // Platin'e ulaşınca paket bölümü ömür boyu gizlenir (kalıcı bayrak)
  const [platinDone, setPlatinDone] = useState<boolean>(() =>
    typeof window !== "undefined" && window.localStorage.getItem("bestwork_platin_reached") === "1",
  );
  useEffect(() => {
    if (levelPV >= 5000 && !platinDone) {
      try {
        window.localStorage.setItem("bestwork_platin_reached", "1");
      } catch {
        /* yoksay */
      }
      setPlatinDone(true);
    }
  }, [levelPV, platinDone]);

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
      const order = await createOrder(
        items.map((c) => ({ product_id: c.product.id, quantity: c.quantity })),
        "eft_havale",
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
          <ArrowLeft className="size-4" />
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
          <ShoppingBag className="text-muted-foreground mx-auto mb-3 size-14" />
          <p className="text-muted-foreground mb-3">Sepetiniz boş.</p>
          <Button variant="outline" onClick={() => router.push("/shop")}>
            Alışverişe Başla
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Sepet öğeleri */}
          <div className="lg:col-span-8">
            {/* Paket seviyeleri — ürünlerin üstünde, yan yana (Platin'de ömür boyu gizli) */}
            {user && !platinDone && (
              <div className="mb-3">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-6">
                  {LEVELS.map((lv, i) => {
                    // Kademeli dolum: her paket kendi bölgesinde (önceki paket dolunca başlar)
                    const prevPv = i === 0 ? 0 : LEVELS[i - 1].pv;
                    const segment = lv.pv - prevPv;
                    const inSegment = Math.max(0, Math.min(segment, levelPV - prevPv));
                    const fillPct = Math.min(100, Math.round((inSegment / segment) * 100));
                    const reached = levelPV >= lv.pv;
                    return (
                      <div
                        key={lv.name}
                        className="border-border bg-card overflow-hidden rounded border"
                      >
                        {/* Görsel alanı */}
                        <div
                          className="flex items-center justify-center py-2"
                          style={{ backgroundColor: `${lv.color}14` }}
                        >
                          <div
                            className="flex size-14 items-center justify-center rounded-full px-1 text-center text-[8px] leading-tight font-black text-white"
                            style={{ backgroundColor: lv.color }}
                          >
                            {lv.name}
                          </div>
                        </div>
                        {/* PV */}
                        <p className="mt-1 text-center text-xs font-extrabold" style={{ color: lv.color }}>
                          {lv.pv} PV
                        </p>
                        {/* Bar + sayaç — kademeli */}
                        <div className="px-1.5">
                          <div className="bg-muted mt-1 h-1 w-full overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full transition-[width] duration-300"
                              style={{ width: `${fillPct}%`, backgroundColor: lv.color }}
                            />
                          </div>
                          <p className="text-muted-foreground mt-0.5 text-center text-[8px]">
                            <span className="font-bold">{inSegment.toLocaleString("tr-TR")}</span>/
                            {segment.toLocaleString("tr-TR")}
                          </p>
                        </div>
                        {/* Başlık şeridi */}
                        <div
                          className="mt-1 py-1 text-center text-[9px] font-extrabold tracking-wide text-white"
                          style={{ backgroundColor: lv.color, opacity: reached ? 1 : 0.55 }}
                        >
                          {lv.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="border-border bg-card rounded border p-4">
              {items.map((c) => (
                <div key={c.product.id} className="border-border flex items-center gap-3 border-b py-3 last:border-b-0">
                  <div className="bg-secondary flex size-16 shrink-0 items-center justify-center overflow-hidden rounded">
                    {apiFileUrl(c.product.image_path) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={apiFileUrl(c.product.image_path)!}
                        alt={c.product.name}
                        className="block h-full w-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="text-primary-dark" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => router.push(`/product/${c.product.id}`)}
                      className="block w-full truncate text-left text-sm font-semibold hover:text-primary"
                      title={c.product.name}
                    >
                      {c.product.name.length > 28 ? `${c.product.name.slice(0, 28)}…` : c.product.name}
                    </button>
                    <p className="text-muted-foreground text-xs">
                      {tl(c.product.price)} × {c.quantity} = {tl(c.product.price * c.quantity)}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      +{c.product.pv} PV · +{c.product.cv} CV
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Adedi azalt"
                      onClick={() => setItems(decrementCart(c.product.id))}
                      className="text-primary hover:bg-accent flex size-8 cursor-pointer items-center justify-center rounded transition-colors"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="min-w-5 text-center text-sm font-bold">{c.quantity}</span>
                    <button
                      type="button"
                      aria-label="Adedi artır"
                      onClick={() => setItems(addToCartStorage(c.product, 1))}
                      disabled={c.quantity >= c.product.stock}
                      className="text-primary hover:bg-accent flex size-8 cursor-pointer items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
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
                { label: "Toplam Satış Tutarı", value: tl(totalAmount) },
                { label: "Toplam CV", value: `${totalCV.toLocaleString("tr-TR")} CV` },
                { label: "Toplam PV", value: `${totalPV.toLocaleString("tr-TR")} PV` },
                { label: "Ödenecek Tutar", value: tl(totalAmount), strong: true },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-0.5">
                  <span className={row.strong ? "text-base font-bold" : "text-muted-foreground text-sm"}>
                    {row.label}
                  </span>
                  <span className={row.strong ? "text-primary-dark text-base font-extrabold" : "text-sm font-semibold"}>
                    {row.value}
                  </span>
                </div>
              ))}
              <p className="text-muted-foreground mt-0.5 block text-xs">
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

      {/* Başarı bildirimi (Tailwind toast) */}
      {successOrder !== null && (
        <div className="fixed bottom-5 left-1/2 z-[1300] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="bg-foreground text-background shadow-lg flex items-center gap-2 rounded px-5 py-3 text-sm font-semibold">
            <Check className="size-5 shrink-0" />
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
