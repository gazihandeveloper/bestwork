"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { loadCart, saveCart, addToCartStorage, decrementCart } from "@/lib/cart";
import type { CartItem } from "@/lib/cart";
import { createOrder, getErrorMessage, getMe, fileUrl as apiFileUrl } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

// Kariyer/paket seviyeleri — required_pv bilindik (250→5000); her seviyenin rengi ve yüksekliği
const LEVELS = [
  { name: "Starter", pv: 250, height: 15, color: "#2196F3" }, // mavi
  { name: "Bronze", pv: 500, height: 35, color: "#4CAF50" }, // yeşil
  { name: "Gümüş", pv: 1300, height: 55, color: "#FF9800" }, // turuncu
  { name: "Altın", pv: 2500, height: 75, color: "#9C27B0" }, // mor
  { name: "Platin", pv: 5000, height: 100, color: "#F44336" }, // kırmızı
];
const PLATIN_FLAG = "bestwork_platin_confetti_done";
const CONFETTI_COLORS = ["#f44336", "#4caf50", "#2196f3", "#ffeb3b", "#ff9800", "#9c27b0", "#00bcd4", "#e91e63"];

// Global sepet paneli — her sayfada "open-cart" olayıyla sağdan açılır.
export default function CartDrawer() {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [successOrder, setSuccessOrder] = useState<number | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [platinMsg, setPlatinMsg] = useState(false);
  const [celebrated, setCelebrated] = useState<boolean>(() =>
    typeof window !== "undefined" && window.localStorage.getItem(PLATIN_FLAG) === "1",
  );
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

  useEffect(() => {
    const openHandler = () => {
      setOpen(true);
      fetchLivePV(); // her açılışta PV'yi taze çek
    };
    const refresh = () => setItems(loadCart());
    refresh();
    window.addEventListener("open-cart", openHandler);
    window.addEventListener("cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("open-cart", openHandler);
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
  const isPlatin = levelPV >= 5000;
  // Barlar Platin olana kadar HER ZAMAN görünür; Platin'e ulaşılıp kutlandıktan sonra gizlenir.
  const showLevels = !!user && (!isPlatin || !celebrated);

  // Platin'e ulaşınca bir kez kutla; PV platin altına düşerse bayrak sıfırlanır ve barlar geri gelir.
  useEffect(() => {
    if (!isPlatin) {
      if (celebrated) {
        setCelebrated(false);
        try {
          window.localStorage.removeItem(PLATIN_FLAG);
        } catch {
          /* yoksay */
        }
      }
      return;
    }
    if (celebrated) return;
    try {
      window.localStorage.setItem(PLATIN_FLAG, "1");
    } catch {
      /* yoksay */
    }
    setCelebrated(true);
    setConfetti(true);
    setPlatinMsg(true);
    const t = setTimeout(() => {
      setConfetti(false);
      setPlatinMsg(false);
    }, 5200);
    return () => clearTimeout(t);
  }, [isPlatin, celebrated]);

  const checkout = async () => {
    if (!user) {
      // Giriş modalını aç; giriş sonrası shop'a dön.
      window.localStorage.setItem("bestwork_login_next", "/shop");
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

  // Başarı bildirimi 8 saniye sonra otomatik kapanır (eski Snackbar autoHideDuration davranışı).
  useEffect(() => {
    if (successOrder === null) return;
    const t = setTimeout(() => setSuccessOrder(null), 8000);
    return () => clearTimeout(t);
  }, [successOrder]);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[min(92%,380px)] p-2.5">
          <div className="flex h-full flex-col">
            {/* Başlık */}
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">
                Sepetim{items.length > 0 ? ` (${items.reduce((s, c) => s + c.quantity, 0)} ürün)` : ""}
              </h2>
              <button
                type="button"
                aria-label="Sepeti kapat"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-9 cursor-pointer items-center justify-center rounded-sm transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {error && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive mb-1.5 rounded-sm border px-3 py-2 text-sm font-semibold">
                {error}
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-muted-foreground py-16 text-center">
                <ShoppingBag className="mx-auto mb-2 size-12" />
                <p>Sepetiniz boş.</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setOpen(false);
                    router.push("/shop");
                  }}
                >
                  Alışverişe Başla
                </Button>
              </div>
            ) : (
              <>
                {/* Sepet öğeleri */}
                <div className="flex-1 overflow-y-auto">
                  {items.map((c) => (
                    <div key={c.product.id} className="border-border flex items-center gap-3 border-b py-2">
                      <div className="bg-secondary flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-sm">
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
                        <p className="truncate text-sm font-semibold">{c.product.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {tl(c.product.price)} × {c.quantity} = {tl(c.product.price * c.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Adedi azalt"
                          onClick={() => setItems(decrementCart(c.product.id))}
                          className="text-primary hover:bg-accent flex size-7 cursor-pointer items-center justify-center rounded-sm transition-colors"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="min-w-5 text-center text-sm font-bold">{c.quantity}</span>
                        <button
                          type="button"
                          aria-label="Adedi artır"
                          onClick={() => setItems(addToCartStorage(c.product, 1))}
                          disabled={c.quantity >= c.product.stock}
                          className="text-primary hover:bg-accent flex size-7 cursor-pointer items-center justify-center rounded-sm transition-colors disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kariyer seviyeleri — şebeke gibi dikey çubuklar (özet çizgisinin üstünde) */}
                {showLevels && (
                  <div className="mb-2">
                    <div className="text-muted-foreground mb-1 flex items-baseline justify-between">
                      <span className="text-xs font-bold">Kariyer Seviyeleri</span>
                      <span className="text-primary text-xs font-extrabold">
                        Seviye PV: {levelPV.toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {LEVELS.map((lv) => {
                        const reached = levelPV >= lv.pv;
                        const fillPct = Math.min(100, Math.round((levelPV / lv.pv) * 100));
                        return (
                          <div key={lv.name} className="flex-1 text-center">
                            {/* Merdiven: sabit yükseklikli çubuk + PV'ye göre iç dolum */}
                            <div className="flex h-14 w-full items-end">
                              <div
                                className="relative w-full overflow-hidden rounded-sm"
                                style={{ height: `${lv.height}%`, backgroundColor: "#EDEDED" }}
                              >
                                <div
                                  className="absolute bottom-0 left-0 w-full transition-[height] duration-300"
                                  style={{
                                    height: `${fillPct}%`,
                                    backgroundColor: lv.color,
                                    opacity: reached ? 1 : 0.55,
                                    boxShadow: reached ? "inset 0 -3px 0 rgba(0,0,0,0.12)" : "none",
                                  }}
                                />
                              </div>
                            </div>
                            <span
                              className="mt-0.5 block"
                              style={{
                                fontSize: 10,
                                fontWeight: reached ? 800 : 500,
                                color: reached ? lv.color : "var(--muted-foreground)",
                              }}
                            >
                              {lv.name}
                            </span>
                            <span className="text-muted-foreground block" style={{ fontSize: 9 }}>
                              {lv.pv.toLocaleString("tr-TR")} PV
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {isPlatin && platinMsg && (
                      <div className="bg-primary mt-3 rounded-sm p-3 text-center text-base font-extrabold tracking-wide text-white shadow-lg animate-[bw-pulse_1.2s_ease-in-out_2] sm:text-lg">
                        🎉 Artık Platin seviyesine ulaştınız!
                      </div>
                    )}
                  </div>
                )}

                <Separator className="mt-2" />

                {/* Sipariş özeti */}
                <div className="pt-3">
                  <p className="mb-1 text-base font-bold">Sipariş Özeti</p>
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
                  <Button size="lg" className="mt-3 w-full" onClick={checkout} disabled={checkingOut}>
                    {checkingOut ? "İşleniyor..." : "Siparişi Tamamla"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Başarı bildirimi (Tailwind toast) */}
      {successOrder !== null && (
        <div className="fixed bottom-5 left-1/2 z-[1300] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="bg-foreground text-background shadow-lg flex items-center gap-2 rounded-sm px-5 py-3 text-sm font-semibold">
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

      {/* Platin konfettisi */}
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-[2000] overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                top: "-16px",
                left: `${(i * 37) % 100}%`,
                width: 8,
                height: 14,
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                borderRadius: "1.4px",
                animation: `bw-fall ${2.4 + (i % 5) * 0.5}s ${(i % 9) * 0.08}s linear forwards`,
                transform: `rotate(${(i * 29) % 360}deg)`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
