"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/api";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(loginValue, password);
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" color="primary.dark" gutterBottom>
            Giriş Yap
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            E-posta adresiniz veya üye numaranız (TR90XXXXXX) ile giriş yapın.
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="E-posta veya Üye Numarası"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Şifre"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
            Hesabınız yok mu?{" "}
            <Link href="/register" style={{ color: "#2E7D32" }}>
              Kayıt olun
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
