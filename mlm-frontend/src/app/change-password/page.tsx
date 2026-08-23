"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { changePassword, getErrorMessage } from "@/services/api";

const schema = yup.object({
  oldPassword: yup.string().required("Mevcut şifre zorunludur"),
  newPassword: yup.string().min(12, "Yeni şifre en az 12 karakter olmalıdır").max(72, "Yeni şifre en fazla 72 karakter olmalıdır").required("Yeni şifre zorunludur"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword")], "Şifreler eşleşmiyor")
    .required("Yeni şifreyi tekrar girin"),
});

type ChangePasswordForm = yup.InferType<typeof schema>;

function ChangePasswordContent() {
  const { logout } = useAuth();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ resolver: yupResolver(schema) });

  const onSubmit = async (values: ChangePasswordForm) => {
    setError("");
    setSuccess("");
    try {
      await changePassword(values.oldPassword, values.newPassword);
      setSuccess("Şifreniz değiştirildi.");
      reset();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" color="primary.dark" gutterBottom>
            Şifre Değiştir
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Güvenliğiniz için mevcut şifrenizi doğrulayın.
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}
              <TextField
                label="Mevcut Şifre"
                type="password"
                fullWidth
                {...register("oldPassword")}
                error={!!errors.oldPassword}
                helperText={errors.oldPassword?.message}
              />
              <TextField
                label="Yeni Şifre"
                type="password"
                fullWidth
                {...register("newPassword")}
                error={!!errors.newPassword}
                helperText={errors.newPassword?.message}
              />
              <TextField
                label="Yeni Şifre (Tekrar)"
                type="password"
                fullWidth
                {...register("confirmPassword")}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
              <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
                {isSubmitting ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
              </Button>
              <Button variant="text" color="error" onClick={logout}>
                Çıkış Yap
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default function ChangePasswordPage() {
  return (
    <RequireAuth>
      <ChangePasswordContent />
    </RequireAuth>
  );
}
