"use client";

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import RequireAuth from "@/components/RequireAuth";
import { getSettings, saveSettings, getErrorMessage } from "@/services/api";

interface FieldDef {
  key: string;
  label: string;
  multiline?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: "corporate_title", label: "Bölüm Başlığı" },
  { key: "corporate_description", label: "Açıklama", multiline: true },
  { key: "corporate_address", label: "Adres" },
  { key: "corporate_phone", label: "Telefon" },
  { key: "corporate_email", label: "E-posta" },
  { key: "corporate_hours", label: "Çalışma Saatleri" },
];

function AdminCorporateContent() {
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        const merged: Record<string, string> = {};
        for (const f of FIELDS) merged[f.key] = s[f.key] ?? "";
        setValues(merged);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const onSubmit = async () => {
    if (!values) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await saveSettings(values);
      setSuccess("Kurumsal içerik güncellendi.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (values === null) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <CircularProgress size={24} />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Kurumsal İçerik
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Anasayfadaki kurumsal bölümünün başlık, açıklama ve iletişim bilgilerini düzenler.
      </Typography>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            {FIELDS.map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                fullWidth
                multiline={f.multiline}
                minRows={f.multiline ? 3 : undefined}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev!, [f.key]: e.target.value }))}
              />
            ))}

            <Box>
              <Button variant="contained" onClick={onSubmit} disabled={saving}>
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}

export default function AdminCorporatePage() {
  return (
    <RequireAuth adminOnly>
      <AdminCorporateContent />
    </RequireAuth>
  );
}
