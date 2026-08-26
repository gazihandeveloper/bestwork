"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Snackbar from "@mui/material/Snackbar";
import Skeleton from "@mui/material/Skeleton";
import type { Theme } from "@mui/material/styles";
import CoffeeRoundedIcon from "@mui/icons-material/CoffeeRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import LocalDrinkRoundedIcon from "@mui/icons-material/LocalDrinkRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import { listPopularProducts, listProducts, fileUrl } from "@/services/api";
import type { PopularProduct } from "@/services/api";
import { addToCartStorage } from "@/lib/cart";
import Reveal from "./Reveal";
import { PASTELS, ELEVATION, MOTION } from "./tokens";

const formatPrice = (v: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

function productIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("kahve") || n.includes("coffee")) return <CoffeeRoundedIcon sx={{ fontSize: 64 }} />;
  if (n.includes("enerji") || n.includes("energy")) return <BoltRoundedIcon sx={{ fontSize: 64 }} />;
  if (n.includes("su") || n.includes("drink") || n.includes("çay")) return <LocalDrinkRoundedIcon sx={{ fontSize: 64 }} />;
  if (n.includes("krem") || n.includes("bakım") || n.includes("beauty") || n.includes("cilt"))
    return <SpaRoundedIcon sx={{ fontSize: 64 }} />;
  return <ShoppingBagRoundedIcon sx={{ fontSize: 64 }} />;
}

// M3 yeşil dünyasından türetilen 3 döngülü gradyan.
const mediaGradient = (theme: Theme, index: number) => {
  const gradients = [
    `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.light})`,
    `linear-gradient(135deg, ${PASTELS.mint}, ${theme.palette.secondary.light})`,
    `linear-gradient(135deg, ${PASTELS.peach}, ${PASTELS.sage})`,
  ];
  return gradients[index % 3];
};

// Ürünlerimiz bölümü — hafta içinde en çok satın alınan 3 ürün.
// Kartlarda adet seçimi + Sepete Ekle; tıklayınca şık detay modalı açılır.
export default function FeaturedProducts() {
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
    <Box
      component="section"
      id="urunler"
      sx={{ py: 8, bgcolor: "background.paper", scrollMarginTop: "112px" }}
    >
      <Container maxWidth={false}>
        <Reveal>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
              mb: 4,
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "primary.main", letterSpacing: 2, fontWeight: 700 }}
              >
                ÇOK SATANLAR
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 700, color: "primary.dark" }}>
                Ürünlerimiz
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Hafta içinde en çok satın alınan 3 ürün.
              </Typography>
            </Box>
            <Button component={Link} href="/shop" endIcon={<ArrowForwardRoundedIcon />}>
              Tümünü Gör
            </Button>
          </Box>
        </Reveal>

        {products === null && !error ? (
          <Grid container spacing={3}>
            {[0, 1, 2].map((i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Skeleton variant="rounded" height={420} />
              </Grid>
            ))}
          </Grid>
        ) : error ? (
          <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
            <Inventory2RoundedIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
            <Typography variant="body1">Ürünler yüklenemedi. Lütfen tekrar deneyin.</Typography>
            <Button
              variant="contained"
              onClick={() => {
                setProducts(null);
                setError(false);
                void load();
              }}
              sx={{ mt: 2 }}
            >
              Tekrar Dene
            </Button>
          </Box>
        ) : products && products.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
            <Inventory2RoundedIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
            <Typography variant="body1">Henüz ürün eklenmemiş.</Typography>
            <Button component={Link} href="/shop" variant="contained" sx={{ mt: 2 }}>
              Alışverişe Başla
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {products?.map((p, index) => {
              const qty = quantityOf(p.id);
              const soldOut = p.stock <= 0;
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
                  <Reveal delay={(index % 3) * 80} sx={{ height: "100%" }}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        borderRadius: "17px",
                        boxShadow: ELEVATION.l1,
                        border: "1px solid",
                        borderColor: "divider",
                        cursor: "pointer",
                        transition: `box-shadow 250ms ${MOTION.standard}, transform 250ms ${MOTION.standard}`,
                        "&:hover": {
                          boxShadow: ELEVATION.l3,
                          transform: "translateY(-6px)",
                          "& .product-media": { transform: "scale(1.05)" },
                        },
                      }}
                      onClick={() => router.push(`/product/${p.id}`)}
                    >
                      <Box
                        sx={{
                          position: "relative",
                          height: 170,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: (theme) => mediaGradient(theme, index),
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          aria-hidden
                          sx={{
                            position: "absolute",
                            top: -40,
                            right: -40,
                            width: 140,
                            height: 140,
                            borderRadius: "50%",
                            bgcolor: "rgba(255,255,255,0.28)",
                          }}
                        />
                        <Chip
                          size="small"
                          icon={<Inventory2RoundedIcon sx={{ fontSize: 14 }} />}
                          label={soldOut ? "Stokta Yok" : "Stokta"}
                          sx={{
                            position: "absolute",
                            top: 10,
                            left: 10,
                            zIndex: 2,
                            bgcolor: "rgba(255,255,255,0.92)",
                            color: soldOut ? "error.main" : "success.main",
                            borderRadius: "20px",
                            "& .MuiChip-label": { fontSize: 11, fontWeight: 700 },
                          }}
                        />
                        {p.sold_quantity > 0 && (
                          <Chip
                            size="small"
                            label={`Bu hafta ${p.sold_quantity} adet`}
                            sx={{
                              position: "absolute",
                              top: 10,
                              right: 10,
                              zIndex: 2,
                              bgcolor: (theme) => theme.palette.primary.dark,
                              color: "common.white",
                              borderRadius: "20px",
                              "& .MuiChip-label": { fontSize: 11, fontWeight: 700 },
                            }}
                          />
                        )}
                        {p.image_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={fileUrl(p.image_path) ?? ""}
                            alt={p.name}
                            loading={index === 0 ? "eager" : "lazy"}
                            className="product-media"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                              transition: `transform 350ms ${MOTION.emphasized}`,
                              filter: soldOut ? "grayscale(1) opacity(0.55)" : "saturate(1.1)",
                            }}
                          />
                        ) : (
                          <Box
                            className="product-media"
                            sx={{
                              color: "primary.dark",
                              display: "flex",
                              transition: `transform 350ms ${MOTION.emphasized}`,
                              filter: soldOut ? "grayscale(1) opacity(0.55)" : "none",
                            }}
                          >
                            {productIcon(p.name)}
                          </Box>
                        )}
                      </Box>

                      <CardContent sx={{ p: 2.5, display: "flex", flexDirection: "column", flexGrow: 1 }}>
                        <Typography
                          variant="h6"
                          noWrap
                          sx={{
                            textOverflow: "ellipsis",
                            fontWeight: 700,
                            fontSize: "1.05rem",
                            lineHeight: 1.35,
                          }}
                        >
                          {p.name}
                        </Typography>
                        {p.description ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              mt: 0.25,
                            }}
                          >
                            {p.description}
                          </Typography>
                        ) : null}

                        <Box sx={{ mt: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.dark" }}>
                            {formatPrice(p.price)}
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 1.5 }} />

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              border: "1px solid",
                              borderColor: "divider",
                              borderRadius: "20px",
                              px: 0.5,
                              py: 0.25,
                            }}
                          >
                            <IconButton
                              size="small"
                              aria-label="Adedi azalt"
                              disabled={qty <= 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                changeQuantity(p.id, -1, p.stock);
                              }}
                            >
                              <RemoveRoundedIcon fontSize="small" />
                            </IconButton>
                            <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 22, textAlign: "center" }}>
                              {qty}
                            </Typography>
                            <IconButton
                              size="small"
                              aria-label="Adedi artır"
                              disabled={qty >= p.stock}
                              onClick={(e) => {
                                e.stopPropagation();
                                changeQuantity(p.id, 1, p.stock);
                              }}
                            >
                              <AddRoundedIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<ShoppingCartRoundedIcon />}
                            disabled={soldOut}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(p, quantityOf(p.id));
                            }}
                            sx={{ flex: 1, height: 40 }}
                          >
                            Sepete Ekle
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Reveal>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Snackbar
          open={!!snackbar}
          autoHideDuration={4000}
          onClose={() => setSnackbar("")}
          message={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CheckRoundedIcon sx={{ fontSize: 20 }} />
              {snackbar}
            </Box>
          }
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setSnackbar("");
                window.dispatchEvent(new CustomEvent("open-cart"));
              }}
              sx={{ fontWeight: 700 }}
            >
              Sepete Git
            </Button>
          }
        />
      </Container>
    </Box>
  );
}
