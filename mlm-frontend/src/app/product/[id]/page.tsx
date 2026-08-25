"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import CoffeeRoundedIcon from "@mui/icons-material/CoffeeRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import LocalDrinkRoundedIcon from "@mui/icons-material/LocalDrinkRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import { getProduct, getErrorMessage, fileUrl } from "@/services/api";
import type { Product } from "@/services/api";
import { addToCartStorage } from "@/lib/cart";

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

function productIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("kahve") || n.includes("coffee")) return <CoffeeRoundedIcon sx={{ fontSize: 80 }} />;
  if (n.includes("enerji") || n.includes("energy")) return <BoltRoundedIcon sx={{ fontSize: 80 }} />;
  if (n.includes("su") || n.includes("drink") || n.includes("çay")) return <LocalDrinkRoundedIcon sx={{ fontSize: 80 }} />;
  if (n.includes("krem") || n.includes("bakım") || n.includes("beauty") || n.includes("cilt"))
    return <SpaRoundedIcon sx={{ fontSize: 80 }} />;
  return <ShoppingBagRoundedIcon sx={{ fontSize: 80 }} />;
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
      <Container maxWidth={false} sx={{ py: 10, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button variant="contained" component={Link} href="/shop">
          Ürünlere Dön
        </Button>
      </Container>
    );
  }

  if (!product) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const soldOut = product.stock <= 0;

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", pt: { xs: 12, md: 11 } }}>
      <Container maxWidth={false} sx={{ pb: 8 }}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => router.push("/shop")}
          sx={{ mb: 3, textTransform: "none", fontWeight: 600, ml: -1 }}
        >
          Ürünlere Dön
        </Button>

        <Card sx={{ borderRadius: "24px", overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
          <Grid container>
            {/* Görsel */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  height: { xs: 280, md: "100%" },
                  minHeight: { md: 420 },
                  bgcolor: "secondary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {fileUrl(product.image_path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileUrl(product.image_path)!}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      filter: soldOut ? "grayscale(1) opacity(0.55)" : "saturate(1.1)",
                    }}
                  />
                ) : (
                  <Box sx={{ color: "primary.dark", display: "flex" }}>{productIcon(product.name)}</Box>
                )}
              </Box>
            </Grid>

            {/* Detay */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: { xs: 3, md: 5 } }}>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                  <Chip
                    size="small"
                    label={CATEGORY_LABELS[product.category ?? ""] ?? "Diğer"}
                    variant="outlined"
                  />
                  <Chip size="small" label={`Stok Kodu: ${product.sku ?? "—"}`} variant="outlined" />
                  <Chip
                    size="small"
                    label={`${product.pv} PV · ${product.cv} CV`}
                    sx={{ bgcolor: "secondary.main", color: "primary.dark", fontWeight: 600 }}
                  />
                  <Chip
                    size="small"
                    label={soldOut ? "Stokta Yok" : "Stokta"}
                    color={soldOut ? "error" : "success"}
                    variant="outlined"
                  />
                </Box>

                <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.dark" }}>
                  {product.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
                  {product.description || "Açıklama yok."}
                </Typography>

                <Typography variant="h4" sx={{ fontWeight: 900, mt: 3 }}>
                  {tl(product.price)}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mt: 3,
                    flexWrap: "wrap",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "28px",
                      px: 0.5,
                      py: 0.25,
                    }}
                  >
                    <IconButton
                      size="small"
                      aria-label="Adedi azalt"
                      disabled={qty <= 1}
                      onClick={() => setQty((q) => q - 1)}
                    >
                      <RemoveRoundedIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body1" sx={{ fontWeight: 700, minWidth: 26, textAlign: "center" }}>
                      {qty}
                    </Typography>
                    <IconButton
                      size="small"
                      aria-label="Adedi artır"
                      disabled={qty >= product.stock}
                      onClick={() => setQty((q) => q + 1)}
                    >
                      <AddRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<ShoppingCartRoundedIcon />}
                    disabled={soldOut}
                    onClick={() => {
                      addToCartStorage(product, qty);
                      setSnackbar(`"${product.name}" sepete eklendi.`);
                    }}
                    sx={{ flex: 1, minWidth: 220, height: 52 }}
                  >
                    Sepete Ekle
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Card>
      </Container>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar("")}
        message={snackbar}
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
    </Box>
  );
}
