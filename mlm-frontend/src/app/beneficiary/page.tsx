"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import RequireAuth from "@/components/RequireAuth";
import EmptyState from "@/components/EmptyState";
import FamilyRestroomRoundedIcon from "@mui/icons-material/FamilyRestroomRounded";
import { listBeneficiaries, createBeneficiary, deleteBeneficiary, getErrorMessage } from "@/services/api";
import type { Beneficiary } from "@/services/api";

const schema = yup.object({
  full_name: yup.string().required("Ad soyad zorunludur"),
  relationship: yup.string().required("Yakınlık derecesi zorunludur"),
  phone: yup.string().optional(),
  email: yup.string().email("Geçerli e-posta girin").optional(),
});

type BeneficiaryForm = yup.InferType<typeof schema>;

function BeneficiaryContent() {
  const [items, setItems] = useState<Beneficiary[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BeneficiaryForm>({ resolver: yupResolver(schema) });

  const load = () => {
    listBeneficiaries()
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, []);

  const onSubmit = async (values: BeneficiaryForm) => {
    setError("");
    setSuccess("");
    try {
      await createBeneficiary(values);
      setSuccess("Varis eklendi.");
      reset();
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    setError("");
    try {
      await deleteBeneficiary(id);
      setSuccess("Varis silindi.");
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Varis Bilgileri
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Kazançlarınızın devredileceği varislerinizi tanımlayın.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Yeni Varis
              </Typography>
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2}>
                  {error && <Alert severity="error">{error}</Alert>}
                  {success && <Alert severity="success">{success}</Alert>}
                  <TextField label="Ad Soyad" fullWidth {...register("full_name")} error={!!errors.full_name} helperText={errors.full_name?.message} />
                  <TextField label="Yakınlık (Eş, Çocuk...)" fullWidth {...register("relationship")} error={!!errors.relationship} helperText={errors.relationship?.message} />
                  <TextField label="Telefon" fullWidth {...register("phone")} error={!!errors.phone} helperText={errors.phone?.message} />
                  <TextField label="E-posta" fullWidth {...register("email")} error={!!errors.email} helperText={errors.email?.message} />
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? "Ekleniyor..." : "Varis Ekle"}
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
                Varislerim ({items.length})
              </Typography>
              {items.length === 0 && (
                <EmptyState icon={<FamilyRestroomRoundedIcon />} message="Henüz varis eklemediniz." />
              )}
              {items.map((b) => (
                <Box key={b.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {b.full_name} · {b.relationship}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {b.phone || "-"} · {b.email || "-"}
                    </Typography>
                  </Box>
                  <IconButton color="error" onClick={() => handleDelete(b.id)} aria-label="sil">
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

export default function BeneficiaryPage() {
  return (
    <RequireAuth>
      <BeneficiaryContent />
    </RequireAuth>
  );
}
