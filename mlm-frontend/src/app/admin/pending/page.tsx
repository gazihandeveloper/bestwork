"use client";

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import RequireAuth from "@/components/RequireAuth";
import { listAdminPendingPool, placePendingUserByAdmin, getErrorMessage } from "@/services/api";
import type { PendingPoolEntry } from "@/services/api";

function AdminPendingContent() {
  const [entries, setEntries] = useState<PendingPoolEntry[]>([]);
  const [sponsorIds, setSponsorIds] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<number | null>(null);

  const load = () => {
    listAdminPendingPool()
      .then(setEntries)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const place = async (userId: number, name: string, position: "L" | "R") => {
    const raw = (sponsorIds[userId] || "").trim();
    const sponsorId = Number(raw);
    if (!raw || Number.isNaN(sponsorId)) {
      setError("Hedef sponsor ID girin (sayısal).");
      return;
    }
    setPlacing(userId);
    setError("");
    try {
      await placePendingUserByAdmin(userId, sponsorId, position);
      setSnackbar(`${name}, #${sponsorId} altına ${position === "L" ? "sola" : "sağa"} yerleştirildi.`);
      setEntries((prev) => prev.filter((e) => e.user.id !== userId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPlacing(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Bekleyenler Yönetimi (Admin)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Tüm bekleyen kullanıcılar. Hedef sponsor ID girerek istediğiniz kullanıcının altına yerleştirebilirsiniz.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && entries.length === 0 && (
        <Card>
          <CardContent>
            <Typography color="text.secondary">Bekleyen kullanıcı yok.</Typography>
          </CardContent>
        </Card>
      )}

      {entries.map((e) => (
        <Card key={e.user.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography variant="h6">{e.user.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {e.user.email} · {e.user.member_code}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                  <Chip size="small" label={`Sponsor: ${e.sponsor_name ?? "-"}`} color="primary" variant="outlined" />
                  <Chip size="small" label={`${e.user.total_pv_accumulated} PV`} />
                  <Chip size="small" label={`${e.user.total_cv_accumulated} CV`} />
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <TextField
                  size="small"
                  label="Hedef Sponsor ID"
                  type="number"
                  sx={{ width: 150 }}
                  value={sponsorIds[e.user.id] || ""}
                  onChange={(ev) => setSponsorIds((prev) => ({ ...prev, [e.user.id]: ev.target.value }))}
                />
                <Button
                  variant="contained"
                  color="success"
                  disabled={placing === e.user.id}
                  onClick={() => place(e.user.id, e.user.name, "L")}
                >
                  Sola
                </Button>
                <Button variant="contained" disabled={placing === e.user.id} onClick={() => place(e.user.id, e.user.name, "R")}>
                  Sağa
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}

      <Snackbar open={!!snackbar} autoHideDuration={5000} onClose={() => setSnackbar("")} message={snackbar} />
    </Container>
  );
}

export default function AdminPendingPage() {
  return (
    <RequireAuth adminOnly>
      <AdminPendingContent />
    </RequireAuth>
  );
}
