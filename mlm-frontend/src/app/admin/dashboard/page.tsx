"use client";

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
import RequireAuth from "@/components/RequireAuth";
import { getAdminDashboard, getErrorMessage, monthlyClose } from "@/services/api";
import type { AdminDashboard } from "@/services/api";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

function AdminDashboardContent() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [closeMsg, setCloseMsg] = useState("");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const handleMonthlyClose = async () => {
    setCloseMsg("");
    setClosing(true);
    try {
      await monthlyClose();
      setCloseMsg("Aylık kapanış tamamlandı.");
      const d = await getAdminDashboard();
      setData(d);
    } catch (err) {
      setCloseMsg(getErrorMessage(err));
    } finally {
      setClosing(false);
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const stats = [
    { title: "Toplam Kullanıcı", value: String(data.total_users) },
    { title: "Aktif", value: String(data.active_users) },
    { title: "Bekleyen (Havuz)", value: String(data.pending_users) },
    { title: "Siparişler", value: String(data.total_orders) },
    { title: "Ciro", value: tl(data.total_revenue) },
    { title: "Ödenen Komisyon", value: tl(data.total_commissions_paid) },
    { title: "Çekilen", value: tl(data.total_withdrawals) },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" color="primary.dark">
          Admin Paneli
        </Typography>
        <Button variant="contained" color="warning" onClick={handleMonthlyClose} disabled={closing}>
          {closing ? "Çalışıyor..." : "Aylık Kapanış"}
        </Button>
      </Box>
      {closeMsg && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {closeMsg}
        </Alert>
      )}

      <Grid container spacing={3}>
        {stats.map((s) => (
          <Grid size={{ xs: 6, sm: 3 }} key={s.title}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {s.title}
                </Typography>
                <Typography variant="h6" color="primary.dark">
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Son Kullanıcılar
              </Typography>
              <List dense>
                {data.recent_users.slice(0, 8).map((u) => (
                  <ListItem key={u.id} disableGutters>
                    <ListItemText primary={`${u.name} · ${u.member_code}`} secondary={u.email} />
                    <Chip size="small" label={u.role} color={u.role === "admin" ? "secondary" : "default"} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Son Çekim Talepleri
              </Typography>
              <List dense>
                {data.recent_withdraw_requests.slice(0, 8).map((w) => (
                  <ListItem key={w.id} disableGutters>
                    <ListItemText primary={`#${w.id} · ${tl(w.amount)}`} secondary={`Kullanıcı ${w.user_id}`} />
                    <Chip
                      size="small"
                      label={w.status}
                      color={w.status === "approved" ? "success" : w.status === "rejected" ? "error" : "warning"}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireAuth adminOnly>
      <AdminDashboardContent />
    </RequireAuth>
  );
}
