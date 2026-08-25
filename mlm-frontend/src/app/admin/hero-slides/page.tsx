"use client";

import { useEffect, useRef, useState } from "react";
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
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Chip from "@mui/material/Chip";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import RequireAuth from "@/components/RequireAuth";
import {
  listAdminHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  uploadFile,
  fileUrl,
  getErrorMessage,
} from "@/services/api";
import type { HeroSlide } from "@/services/api";

interface FormState {
  id: number | null;
  title: string;
  subtitle: string;
  image_path: string;
  link: string;
  sort_order: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  id: null,
  title: "",
  subtitle: "",
  image_path: "",
  link: "",
  sort_order: "0",
  is_active: true,
};

function AdminHeroSlidesContent() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = () => {
    listAdminHeroSlides()
      .then(setSlides)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const path = await uploadFile(file);
      setForm((f) => ({ ...f, image_path: path }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (s: HeroSlide) => {
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setForm({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle ?? "",
      image_path: s.image_path,
      link: s.link ?? "",
      sort_order: String(s.sort_order),
      is_active: s.is_active,
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
    if (!form.title.trim()) {
      setError("Başlık zorunludur.");
      return;
    }
    if (!form.image_path.trim()) {
      setError("Görsel zorunludur.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        image_path: form.image_path.trim(),
        link: form.link.trim(),
        sort_order: parseInt(form.sort_order || "0", 10) || 0,
        is_active: form.is_active,
      };
      if (form.id) {
        await updateHeroSlide(form.id, payload);
        setSuccess("Slider güncellendi.");
      } else {
        await createHeroSlide(payload);
        setSuccess("Slider eklendi.");
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
      await deleteHeroSlide(id);
      if (form.id === id) resetForm();
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Container maxWidth={false} sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Hero Slider Yönetimi
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Anasayfadaki görsel slider kayıtlarını yönetir. Görseller admin panelinden yüklenir.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {form.id ? `Slider Düzenle (#${form.id})` : "Yeni Slider"}
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
                  label="Alt başlık"
                  fullWidth
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                />
                <TextField
                  label="Buton yönlendirmesi (örn. /shop)"
                  fullWidth
                  value={form.link}
                  onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                />
                <TextField
                  label="Sıra"
                  type="number"
                  fullWidth
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                />

                <Box>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    hidden
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <Button
                    variant="outlined"
                    startIcon={uploading ? <CircularProgress size={18} /> : <UploadRoundedIcon />}
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    fullWidth
                  >
                    {form.image_path ? "Görseli Değiştir" : "Görsel Yükle"}
                  </Button>
                  {form.image_path && (
                    <Box sx={{ mt: 1.5, position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileUrl(form.image_path) ?? ""}
                        alt="Önizleme"
                        style={{
                          width: "100%",
                          height: 140,
                          objectFit: "cover",
                          borderRadius: 12,
                          display: "block",
                        }}
                      />
                      <Chip
                        size="small"
                        label="Yeni görsel"
                        color="success"
                        sx={{ position: "absolute", top: 8, left: 8 }}
                      />
                    </Box>
                  )}
                </Box>

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
                Sliderlar ({slides.length})
              </Typography>
              {loading && <CircularProgress size={24} />}
              <Stack spacing={2}>
                {slides.map((s) => (
                  <Box
                    key={s.id}
                    sx={{
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                      p: 1.5,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 3,
                    }}
                  >
                    <Box sx={{ width: 120, height: 64, flexShrink: 0, borderRadius: 2, overflow: "hidden" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileUrl(s.image_path) ?? ""}
                        alt={s.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                        {s.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        Sıra: {s.sort_order}
                        {s.link ? ` · → ${s.link}` : ""}
                      </Typography>
                      <Chip
                        size="small"
                        label={s.is_active ? "Aktif" : "Pasif"}
                        color={s.is_active ? "success" : "default"}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <IconButton aria-label="düzenle" onClick={() => startEdit(s)}>
                      <EditRoundedIcon />
                    </IconButton>
                    <IconButton aria-label="sil" color="error" onClick={() => handleDelete(s.id)}>
                      <DeleteRoundedIcon />
                    </IconButton>
                  </Box>
                ))}
                {!loading && slides.length === 0 && (
                  <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
                    <ImageOutlinedIcon sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="body1">Henüz slider eklenmemiş.</Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default function AdminHeroSlidesPage() {
  return (
    <RequireAuth adminOnly>
      <AdminHeroSlidesContent />
    </RequireAuth>
  );
}
