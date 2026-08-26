"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useAuth } from "@/hooks/useAuth";
import { createTicket, getErrorMessage } from "@/services/api";

const schema = yup.object({
  name: yup.string().required("Adınız zorunludur"),
  surname: yup.string().required("Soyadınız zorunludur"),
  phone: yup.string().required("Telefonunuz zorunludur"),
  message: yup.string().min(10, "Mesaj en az 10 karakter olmalıdır").required("Mesaj zorunludur"),
});

type ContactForm = yup.InferType<typeof schema>;

function ContactContent() {
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: user?.name?.split(" ")[0] ?? "",
      surname: user?.name?.split(" ").slice(1).join(" ") ?? "",
      phone: "",
    },
  });

  const onSubmit = async (values: ContactForm) => {
    setError("");
    setSuccess("");
    try {
      await createTicket(values);
      setSuccess("Mesajınız alındı — destek ekibimiz en kısa sürede size dönecek.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom sx={{ fontWeight: 800 }}>
        İletişim / Destek
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Soru, öneri veya sorununuzu ticket olarak iletin; ekibimiz sizinle iletişime geçsin.
      </Typography>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            sx={{
              p: 3,
              borderRadius: "17px",
              background: (theme) =>
                `linear-gradient(165deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
              color: "common.white",
              height: "100%",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "#D8F0DC",
                color: "primary.dark",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1,
              }}
            >
              <SupportAgentRoundedIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Size Nasıl Yardımcı Olabiliriz?
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", maxWidth: 320 }}>
              Tüm sorularınız destek ekibimize iletilir ve ticket numaranızla takip edilir.
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ borderRadius: "17px", border: "1px solid", borderColor: "divider" }}>
            <CardContent sx={{ p: 3 }}>
              {success && (
                <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleRoundedIcon />}>
                  {success}
                </Alert>
              )}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Adınız *"
                        fullWidth
                        {...register("name")}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Soyadınız *"
                        fullWidth
                        {...register("surname")}
                        error={!!errors.surname}
                        helperText={errors.surname?.message}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Telefonunuz *"
                        placeholder="05XX XXX XX XX"
                        fullWidth
                        {...register("phone")}
                        error={!!errors.phone}
                        helperText={errors.phone?.message}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="E-posta"
                        fullWidth
                        value={user?.email ?? ""}
                        disabled
                        helperText="Hesabınızdaki e-posta kullanılır"
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Mesajınız *"
                        fullWidth
                        multiline
                        minRows={4}
                        placeholder="Sorunuzu veya sorununuzu detaylıca yazın..."
                        {...register("message")}
                        error={!!errors.message}
                        helperText={errors.message?.message}
                      />
                    </Grid>
                  </Grid>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isSubmitting}
                    sx={{ alignSelf: { xs: "stretch", md: "flex-end" }, px: 5, bgcolor: (theme) => theme.palette.primary.main }}
                  >
                    {isSubmitting ? <CircularProgress size={22} color="inherit" /> : "Gönder"}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default function ContactPage() {
  return <ContactContent />;
}
