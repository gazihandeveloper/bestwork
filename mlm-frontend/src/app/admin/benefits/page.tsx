"use client";

import { useEffect, useState } from "react";
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
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Chip from "@mui/material/Chip";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import RequireAuth from "@/components/RequireAuth";
import {
  listAdminBenefits,
  createBenefit,
  updateBenefit,
  deleteBenefit,
  getErrorMessage,
} from "@/services/api";
import type { Benefit } from "@/services/api";

const ICON_OPTIONS = [
  { value: "shipping", label: "Kargo", icon: <LocalShippingRoundedIcon /> },
  { value: "payment", label: "Güvenli Ödeme", icon: <VerifiedUserRoundedIcon /> },
  { value: "pv", label: "Puan", icon: <RedeemRoundedIcon /> },
  { value: "support", label: "Destek", icon: <SupportAgentRoundedIcon /> },
];

interface FormState {
  id: number | null;
  title: string;
  description: string;
  icon: string;
  sort_order: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  id: null,
  title: "",
  description: "",
  icon: "shipping",
  sort_order: "0",
  is_active: true,
};

function AdminBenefitsContent() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    listAdminBenefits()
      .then(setBenefits)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (b: Benefit) => {
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setForm({
      id: b.id,
      title: b.title,
      description: b.description,
      icon: b.icon,
      sort_order: String(b.sort_order),
      is_active: b.is_active,
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setError("");
    setSuccess("");
  };

  const onSubmit = async () => {
    setError("");
    setSuccess("");
    if (!form.title.trim() || !form.description.trim()) {
      setError("Başlık ve açıklama zorunludur.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        icon: form.icon,
        sort_order: parseInt(form.sort_order || "0", 10) || 0,
        is_active: form.is_active,
      };
      if (form.id) {
        await updateBenefit(form.id, payload);
        setSuccess("Avantaj kartı güncellendi.");
      } else {
        await createBenefit(payload);
        setSuccess("Avantaj kartı eklendi.");
      }
      resetForm();
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError("");
    try {
      await deleteBenefit(id);
      if (form.id === id) resetForm();
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Container maxWidth={false} sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Avantaj Kartları
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Anasayfadaki avantaj kartlarını (Kargo Bedava, Güvenli Ödeme vb.) yönetir.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {form.id ? `Kart Düzenle (#${form.id})` : "Yeni Kart"}
              </Typography>
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success">{success}</Alert>}

                <TextField
                  label="Başlık"
                  fullWidth
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
                <TextField
                  label="Açıklama"
                  fullWidth
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
                <TextField
                  select
                  label="İkon"
                  fullWidth
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                >
                  {ICON_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {o.icon}
                        {o.label}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Sıra"
                  type="number"
                  fullWidth
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    />
                  }
                  label="Aktif (anasayfada göster)"
                />

                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" onClick={onSubmit} disabled={submitting} fullWidth>
                    {submitting ? "Kaydediliyor..." : form.id ? "Güncelle" : "Ekle"}
                  </Button>
                  {form.id && (
                    <Button variant="text" onClick={resetForm}>
                      Vazgeç
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Kartlar ({benefits.length})
              </Typography>
              {loading && <CircularProgress size={24} />}
              <Stack spacing={1.5}>
                {benefits.map((b) => (
                  <Box
                    key={b.id}
                    sx={{
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                      p: 1.5,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2.1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        bgcolor: "secondary.main",
                        color: "primary.dark",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {ICON_OPTIONS.find((o) => o.value === b.icon)?.icon ?? (
                        <LocalShippingRoundedIcon />
                      )}
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                        {b.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {b.description} · Sıra: {b.sort_order}
                      </Typography>
                      <Chip
                        size="small"
                        label={b.is_active ? "Aktif" : "Pasif"}
                        color={b.is_active ? "success" : "default"}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <IconButton aria-label="düzenle" onClick={() => startEdit(b)}>
                      <EditRoundedIcon />
                    </IconButton>
                    <IconButton aria-label="sil" color="error" onClick={() => handleDelete(b.id)}>
                      <DeleteRoundedIcon />
                    </IconButton>
                  </Box>
                ))}
                {!loading && benefits.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                    Henüz kart eklenmemiş.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default function AdminBenefitsPage() {
  return (
    <RequireAuth adminOnly>
      <AdminBenefitsContent />
    </RequireAuth>
  );
}
