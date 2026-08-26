"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { useAuth } from "@/hooks/useAuth";
import { BASE_PATH } from "@/lib/api";
import { getErrorMessage } from "@/lib/api";
import { PASTELS, ELEVATION } from "@/components/landing/tokens";

const NEXT_KEY = "bestwork_login_next";

// Global giriş modalı — "open-login" olayıyla her sayfada açılır.
export default function LoginDialog() {
  const { login } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const openHandler = () => {
      setError("");
      setLoginValue("");
      setPassword("");
      setOpen(true);
    };
    window.addEventListener("open-login", openHandler);
    return () => window.removeEventListener("open-login", openHandler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(loginValue, password);
      setOpen(false);
      const next = window.localStorage.getItem(NEXT_KEY);
      window.localStorage.removeItem(NEXT_KEY);
      if (next && next.startsWith("/")) {
        router.push(next);
      } else if (window.location.pathname === BASE_PATH + "/login") {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "28px",
            overflow: "hidden",
            boxShadow: ELEVATION.l3,
          },
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          px: 3,
          py: 4,
          textAlign: "center",
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
          color: "common.white",
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: -50,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            bgcolor: PASTELS.mint,
            opacity: 0.25,
          }}
        />
        <IconButton
          aria-label="Kapat"
          onClick={() => setOpen(false)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "rgba(255,255,255,0.9)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
          }}
        >
          <CloseRoundedIcon />
        </IconButton>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            bgcolor: PASTELS.mint,
            color: "primary.dark",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 1.5,
          }}
        >
          <PersonRoundedIcon sx={{ fontSize: 34 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Giriş Yap
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
          E-posta adresiniz, üye numaranız veya telefon numaranızla devam edin.
        </Typography>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="E-posta, Üye Numarası veya Telefon"
              placeholder="ornek@mail.com · TR90123456 · 05xx xxx xx xx"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ boxShadow: ELEVATION.l1 }}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : "Giriş Yap"}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" sx={{ mt: 2.5, textAlign: "center" }}>
          Hesabınız yok mu?{" "}
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            style={{ color: "#2E7D32", fontWeight: 700 }}
          >
            Kayıt olun
          </Link>
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
