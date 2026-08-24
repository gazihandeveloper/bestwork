"use client";

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import RequireAuth from "@/components/RequireAuth";
import AppSnackbar from "@/components/AppSnackbar";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { getDashboard } from "@/services/api";
import type { Wallet, UserDashboard } from "@/services/api";

function ProfileContent() {
  const { user, logout } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [dash, setDash] = useState<UserDashboard | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  useEffect(() => {
    api
      .get<{ wallet: Wallet }>("/wallet")
      .then((res) => setWallet(res.data.wallet))
      .catch(() => setWallet(null));
    getDashboard()
      .then(setDash)
      .catch(() => setDash(null));
  }, []);

  const copyMemberCode = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.member_code);
      setSnackbar({ open: true, message: "Üye kodu kopyalandı" });
    } catch {
      setSnackbar({ open: true, message: "Kopyalama başarısız" });
    }
  };

  const infoItems = [
    { label: "Ad Soyad", value: user?.name || "-" },
    { label: "E-posta", value: user?.email || "-" },
    { label: "Paket", value: dash?.user.package || "-" },
    { label: "Rütbe", value: dash?.user.rank || "-" },
    { label: "Durum", value: user?.is_in_pending_pool ? "Yerleşim bekliyor" : "Aktif" },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Profilim
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Hesap Bilgileri
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Chip label={`Üye Numaranız: ${user?.member_code}`} color="primary" variant="outlined" />
                <IconButton size="small" onClick={copyMemberCode} aria-label="üye kodunu kopyala">
                  <ContentCopyRoundedIcon fontSize="small" />
                </IconButton>
                <Chip label={user?.role === "admin" ? "Admin" : user?.role === "customer" ? "Müşteri" : "Üye"} color="secondary" />
              </Box>

              <Grid container spacing={1.5}>
                {infoItems.map((item) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
                    <Box sx={{ bgcolor: "background.default", borderRadius: 3, p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="body2">
                <strong>Bakiye:</strong> {wallet?.balance.toFixed(2)} TL
              </Typography>
              <Typography variant="body2">
                <strong>Chip:</strong> {wallet?.chip_balance.toFixed(2)} TL
              </Typography>
              <Typography variant="body2">
                <strong>Toplam Kazanç:</strong> {wallet?.total_earned.toFixed(2)} TL
              </Typography>
              <Button variant="outlined" color="error" sx={{ mt: 2 }} onClick={logout}>
                Çıkış Yap
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <AppSnackbar open={snackbar.open} message={snackbar.message} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} />
    </Container>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}
