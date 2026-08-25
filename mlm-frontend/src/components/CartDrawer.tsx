"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Drawer from "@mui/material/Drawer";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import { loadCart, saveCart, addToCartStorage, decrementCart } from "@/lib/cart";
import type { CartItem } from "@/lib/cart";
import { createOrder, getErrorMessage, fileUrl as apiFileUrl } from "@/services/api";
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

  const userPV = user?.total_pv_accumulated ?? 0;
  const isPlatin = userPV >= 5000;
  const celebrated =
    typeof window !== "undefined" && window.localStorage.getItem(PLATIN_FLAG) === "1";
  const showLevels = !!user && !celebrated;

  // Platin'e ulaşınca bir kez konfeti + mesaj; sonrasında tekrar gösterilmez.
  useEffect(() => {
    if (!isPlatin || celebrated) return;
    try {
      window.localStorage.setItem(PLATIN_FLAG, "1");
    } catch {
      /* yoksay */
    }
    setConfetti(true);
    setPlatinMsg(true);
    const t = setTimeout(() => {
      setConfetti(false);
      setPlatinMsg(false);
    }, 5200);
    return () => clearTimeout(t);
  }, [isPlatin, celebrated]);

  useEffect(() => {
    const openHandler = () => setOpen(true);
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

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "min(92%, 380px)", md: 380 },
              borderTopLeftRadius: "28px",
              borderBottomLeftRadius: "28px",
              p: 2.5,
            },
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1.5,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Sepetim{items.length > 0 ? ` (${items.reduce((s, c) => s + c.quantity, 0)} ürün)` : ""}
            </Typography>
            <IconButton aria-label="Sepeti kapat" onClick={() => setOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {error}
            </Alert>
          )}

          {items.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
              <ShoppingBagRoundedIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="body1">Sepetiniz boş.</Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => {
                  setOpen(false);
                  router.push("/shop");
                }}
              >
                Alışverişe Başla
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
                {items.map((c) => (
                  <Box
                    key={c.product.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        overflow: "hidden",
                        bgcolor: "secondary.main",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {apiFileUrl(c.product.image_path) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={apiFileUrl(c.product.image_path)!}
                          alt={c.product.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      ) : (
                        <ShoppingBagRoundedIcon sx={{ color: "primary.dark" }} />
                      )}
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {c.product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tl(c.product.price)} × {c.quantity} = {tl(c.product.price * c.quantity)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <IconButton size="small" onClick={() => setItems(decrementCart(c.product.id))}>
                        <RemoveRoundedIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {c.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setItems(addToCartStorage(c.product, 1))}
                        disabled={c.quantity >= c.product.stock}
                      >
                        <AddRoundedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Kariyer seviyeleri — şebeke gibi dikey çubuklar (özet çizgisinin üstünde) */}
              {showLevels && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}
                  >
                    Kariyer Seviyeleri
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    {LEVELS.map((lv) => {
                      const reached = userPV >= lv.pv;
                      return (
                        <Box key={lv.name} sx={{ flex: 1, textAlign: "center" }}>
                          {/* Merdiven: yukarı doğru yükselen sabit yükseklikli çubuk */}
                          <Box sx={{ height: 56, width: "100%", display: "flex", alignItems: "flex-end" }}>
                            <Box
                              sx={{
                                width: "100%",
                                height: `${lv.height}%`,
                                bgcolor: reached ? lv.color : "#E8E8E8",
                                borderRadius: "6px 6px 2px 2px",
                                boxShadow: reached ? "inset 0 -3px 0 rgba(0,0,0,0.12)" : "none",
                                transition: "background-color 300ms",
                              }}
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: 10,
                              fontWeight: reached ? 800 : 500,
                              color: reached ? lv.color : "text.secondary",
                              display: "block",
                              mt: 0.5,
                            }}
                          >
                            {lv.name}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: 9, color: "text.secondary", display: "block" }}>
                            {lv.pv.toLocaleString("tr-TR")} PV
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                  {isPlatin && platinMsg && (
                    <Box
                      sx={{
                        mt: 1,
                        p: 1,
                        borderRadius: 2,
                        bgcolor: "primary.main",
                        color: "#fff",
                        textAlign: "center",
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      🎉 Artık Platin oldunuz!
                    </Box>
                  )}
                </Box>
              )}

              <Box sx={{ borderTop: "1px solid", borderColor: "divider", mt: 2, pt: 1.5 }}>
                <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
                  Sipariş Özeti
                </Typography>
                {[
                  { label: "Ürün", value: `${totalQuantity} Ürün` },
                  { label: "Toplam Satış Tutarı", value: tl(totalAmount) },
                  { label: "Toplam CV", value: `${totalCV.toLocaleString("tr-TR")} CV` },
                  { label: "Toplam PV", value: `${totalPV.toLocaleString("tr-TR")} PV` },
                  { label: "Ödenecek Tutar", value: tl(totalAmount), strong: true },
                ].map((row) => (
                  <Box
                    key={row.label}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 0.4,
                    }}
                  >
                    <Typography
                      variant={row.strong ? "body1" : "body2"}
                      color={row.strong ? "text.primary" : "text.secondary"}
                      sx={{ fontWeight: row.strong ? 700 : 400 }}
                    >
                      {row.label}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: row.strong ? 800 : 600, color: row.strong ? "primary.dark" : "text.primary" }}
                    >
                      {row.value}
                    </Typography>
                  </Box>
                ))}
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  Ödeme: EFT/HAVALE — sipariş, bildirim onaylanana kadar beklemede kalır.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 1.5 }}
                  onClick={checkout}
                  disabled={checkingOut}
                >
                  {checkingOut ? "İşleniyor..." : "Siparişi Tamamla"}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      <Snackbar
        open={successOrder !== null}
        autoHideDuration={8000}
        onClose={() => setSuccessOrder(null)}
        message={successOrder !== null ? `Sipariş #${successOrder} oluşturuldu (beklemede).` : ""}
        action={
          <Button color="inherit" size="small" component={Link} href="/payment-notifications">
            Ödeme Bildirimi Yap
          </Button>
        }
      />

      {confetti && (
        <Box sx={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2000, overflow: "hidden" }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <Box
              key={i}
              component="span"
              sx={{
                position: "absolute",
                top: "-16px",
                left: `${(i * 37) % 100}%`,
                width: 8,
                height: 14,
                bgcolor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                borderRadius: "2px",
                animation: `bw-fall ${2.4 + (i % 5) * 0.5}s ${(i % 9) * 0.08}s linear forwards`,
                transform: `rotate(${(i * 29) % 360}deg)`,
              }}
            />
          ))}
        </Box>
      )}
    </>
  );
}
