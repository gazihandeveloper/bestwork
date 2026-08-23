"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import RequireAuth from "@/components/RequireAuth";
import { listProducts, createProduct, deleteProduct, getErrorMessage } from "@/services/api";
import type { Product } from "@/services/api";

const schema = yup.object({
  name: yup.string().required("Ürün adı zorunludur"),
  price: yup.number().typeError("Fiyat sayı olmalıdır").positive("Fiyat > 0").required("Fiyat zorunludur"),
  pv: yup.number().typeError("PV sayı olmalıdır").min(0).required("PV zorunludur"),
  cv: yup.number().typeError("CV sayı olmalıdır").min(0).required("CV zorunludur"),
  stock: yup.number().typeError("Stok sayı olmalıdır").min(0).required("Stok zorunludur"),
  category: yup.string().optional(),
});

type ProductForm = yup.InferType<typeof schema>;

function AdminProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({ resolver: yupResolver(schema) });

  const load = () => {
    listProducts()
      .then(setProducts)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onSubmit = async (values: ProductForm) => {
    setError("");
    setSuccess("");
    try {
      await createProduct(values);
      setSuccess("Ürün eklendi.");
      reset();
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    setError("");
    try {
      await deleteProduct(id);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Ürün Yönetimi
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Yeni Ürün
              </Typography>
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2}>
                  {error && <Alert severity="error">{error}</Alert>}
                  {success && <Alert severity="success">{success}</Alert>}
                  <TextField label="Ürün Adı" fullWidth {...register("name")} error={!!errors.name} helperText={errors.name?.message} />
                  <TextField label="Fiyat (TL)" type="number" fullWidth {...register("price")} error={!!errors.price} helperText={errors.price?.message} />
                  <TextField label="PV" type="number" fullWidth {...register("pv")} error={!!errors.pv} helperText={errors.pv?.message} />
                  <TextField label="CV" type="number" fullWidth {...register("cv")} error={!!errors.cv} helperText={errors.cv?.message} />
                  <TextField label="Stok" type="number" fullWidth {...register("stock")} error={!!errors.stock} helperText={errors.stock?.message} />
                  <TextField select label="Kategori" fullWidth {...register("category")} defaultValue="diger">
                    <MenuItem value="icecek">İçecek</MenuItem>
                    <MenuItem value="ev">Ev & Mutfak</MenuItem>
                    <MenuItem value="bakim">Bakım & Güzellik</MenuItem>
                    <MenuItem value="enerji">Enerji & Sağlık</MenuItem>
                    <MenuItem value="gida">Gıda</MenuItem>
                    <MenuItem value="diger">Diğer</MenuItem>
                  </TextField>
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? "Ekleniyor..." : "Ürün Ekle"}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ürünler ({products.length})
              </Typography>
              {loading && <CircularProgress size={24} />}
              {products.map((p) => (
                <Box key={p.id} sx={{ display: "flex", alignItems: "center", py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      #{p.id} {p.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {p.sku ? `${p.sku} · ` : ""}
                      {p.price} TL · {p.pv} PV · {p.cv} CV · Stok: {p.stock}
                    </Typography>
                  </Box>
                  <IconButton color="error" onClick={() => handleDelete(p.id)} aria-label="sil">
                    <DeleteRoundedIcon />
                  </IconButton>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default function AdminProductsPage() {
  return (
    <RequireAuth adminOnly>
      <AdminProductsContent />
    </RequireAuth>
  );
}
