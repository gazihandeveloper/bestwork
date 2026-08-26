"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LocalDrinkRoundedIcon from "@mui/icons-material/LocalDrinkRounded";
import KitchenRoundedIcon from "@mui/icons-material/KitchenRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import CoffeeRoundedIcon from "@mui/icons-material/CoffeeRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { listProducts, getErrorMessage, fileUrl } from "@/services/api";
import type { Product } from "@/services/api";
import { addToCartStorage } from "@/lib/cart";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

interface CategoryDef {
  key: string | null;
  label: string;
  icon: React.ReactElement;
}

const CATEGORIES: CategoryDef[] = [
  { key: null, label: "Tümü", icon: <StorefrontRoundedIcon /> },
  { key: "icecek", label: "İçecek", icon: <LocalDrinkRoundedIcon /> },
  { key: "enerji", label: "Enerji & Sağlık", icon: <BoltRoundedIcon /> },
  { key: "bakim", label: "Bakım & Güzellik", icon: <SpaRoundedIcon /> },
  { key: "ev", label: "Ev & Mutfak", icon: <KitchenRoundedIcon /> },
  { key: "diger", label: "Diğer", icon: <CategoryRoundedIcon /> },
];

const categoryLabel = (key: string | null) =>
  CATEGORIES.find((c) => c.key === key)?.label ?? key ?? "Diğer";

function productIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("kahve") || n.includes("coffee")) return <CoffeeRoundedIcon sx={{ fontSize: 52 }} />;
  if (n.includes("enerji") || n.includes("energy")) return <BoltRoundedIcon sx={{ fontSize: 52 }} />;
  if (n.includes("su") || n.includes("drink") || n.includes("çay")) return <LocalDrinkRoundedIcon sx={{ fontSize: 52 }} />;
  if (n.includes("krem") || n.includes("bakım") || n.includes("beauty") || n.includes("cilt"))
    return <SpaRoundedIcon sx={{ fontSize: 52 }} />;
  return <ShoppingBagRoundedIcon sx={{ fontSize: 52 }} />;
}

function ShopContent() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState("");
  const [loading, setLoading] = useState(true);

  // Menü aramasından gelen ?q= parametresini başlangıç aramasına yükle
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setSearch(q);
  }, []);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  // Arama: ad veya stok kodu ile DB'den getir (400ms debounce).
  useEffect(() => {
    if (loading) return;
    const id = setTimeout(() => {
      setSearching(true);
      listProducts({ q: search.trim() })
        .then(setProducts)
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(id);
  }, [search, loading]);

  const visibleProducts = useMemo(
    () => (category ? products.filter((p) => (p.category ?? "diger") === category) : products),
    [products, category],
  );

  const countFor = (key: string | null) =>
    key === null ? products.length : products.filter((p) => (p.category ?? "diger") === key).length;

  const addToCart = (product: Product, quantity = 1) => {
    addToCartStorage(product, quantity);
    setSnackbar(`"${product.name}" sepete eklendi.`);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", pt: { xs: 14, md: 13 }, width: "90%", mx: "auto" }}>
      <Container maxWidth={false} sx={{ pb: 8 }}>
        <Typography variant="h4" color="primary.dark" gutterBottom sx={{ fontWeight: 800 }}>
          Ürünler
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Kategoriler */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ position: { md: "sticky" }, top: 96 }}>
              <CardContent>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ürün adı veya stok kodu ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          {searching ? <CircularProgress size={16} /> : <SearchRoundedIcon />}
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ mb: 2 }}
                />
                <Typography variant="h6" gutterBottom>
                  Kategoriler
                </Typography>
                <List dense disablePadding>
                  {CATEGORIES.map((c) => {
                    const active = category === c.key;
                    const count = countFor(c.key);
                    return (
                      <ListItemButton
                        key={c.key ?? "all"}
                        selected={active}
                        onClick={() => setCategory(c.key)}
                        sx={{
                          borderRadius: 2.1,
                          mb: 0.5,
                          "&.Mui-selected": {
                            bgcolor: "primary.main",
                            color: "#fff",
                            "&:hover": { bgcolor: "primary.dark" },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>{c.icon}</ListItemIcon>
                        <ListItemText
                          primary={c.label}
                          slotProps={{ primary: { sx: { fontSize: 14, fontWeight: 600 } } }}
                        />
                        <Chip
                          size="small"
                          label={count}
                          sx={{
                            fontSize: 12,
                            bgcolor: "common.white",
                            color: "text.primary",
                            "&:hover": { bgcolor: "common.white" },
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Ürünler — satırda 3 ürün */}
          <Grid size={{ xs: 12, md: 9 }}>
            <Grid container spacing={2}>
              {visibleProducts.map((p) => {
                const soldOut = p.stock <= 0;
                const image = fileUrl(p.image_path);
                return (
                  <Grid size={{ xs: 6, sm: 6, md: 4 }} key={p.id}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "box-shadow 250ms ease, transform 250ms ease",
                        "&:hover": {
                          boxShadow: 6,
                          transform: "translateY(-4px)",
                          "& .shop-media": { transform: "scale(1.04)" },
                        },
                      }}
                      onClick={() => router.push(`/product/${p.id}`)}
                    >
                      <Box
                        sx={{
                          position: "relative",
                          height: 130,
                          bgcolor: "secondary.main",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt={p.name}
                            loading="lazy"
                            className="shop-media"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                              transition: "transform 300ms ease",
                            }}
                          />
                        ) : (
                          <Box sx={{ color: "primary.dark", display: "flex" }}>
                            {productIcon(p.name)}
                          </Box>
                        )}
                        <Chip
                          size="small"
                          label={soldOut ? "Yok" : "Stokta"}
                          sx={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            bgcolor: "rgba(255,255,255,0.92)",
                            color: soldOut ? "error.main" : "success.main",
                            fontSize: 10,
                            fontWeight: 700,
                            height: 20,
                          }}
                        />
                      </Box>
                      <CardContent
                        sx={{
                          p: 1.5,
                          display: "flex",
                          flexDirection: "column",
                          flexGrow: 1,
                        }}
                      >
                        <Chip
                          size="small"
                          label={categoryLabel(p.category)}
                          variant="outlined"
                          sx={{ fontSize: 10, height: 20, alignSelf: "flex-start", mb: 0.5 }}
                        />
                        <Typography variant="body1" noWrap sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {p.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: 12 }}>
                          Stok Kodu: {p.sku ?? "—"}
                        </Typography>
                        <Box sx={{ mt: "auto", pt: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.dark", fontSize: "1rem" }}>
                            {tl(p.price)}
                          </Typography>
                          <Button
                            variant="contained"
                            fullWidth
                            size="small"
                            startIcon={<AddRoundedIcon />}
                            disabled={soldOut}
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(p);
                            }}
                            sx={{ mt: 0.75, height: 32, fontSize: 13 }}
                          >
                            Sepete Ekle
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>
        </Grid>
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

export default function ShopPage() {
  return <ShopContent />;
}
