"use client";

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import RequireAuth from "@/components/RequireAuth";
import { listPendingUsers, placePendingUser, getErrorMessage } from "@/services/api";
import type { User } from "@/services/api";

const DAY_MS = 24 * 60 * 60 * 1000;

function PendingContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<number | null>(null);
	const [now, setNow] = useState(0);

  const load = () => {
    listPendingUsers()
      .then(setUsers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const place = async (userId: number, position: "L" | "R", name: string) => {
    setPlacing(userId);
    setError("");
    try {
      await placePendingUser(userId, position);
      setSnackbar(`${name}, ${position === "L" ? "sol" : "sağ"} bacağa yerleştirildi.`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
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
    <Container maxWidth={false} sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Bekleyenler Havuzu
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sponsorluğunuzu yaptığınız ve henüz ağaca yerleştirmediğiniz üyeler. Sol veya sağ bacağa yerleştirin.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && users.length === 0 && (
        <Card>
          <CardContent>
            <Typography color="text.secondary">Bekleyen üyeniz yok.</Typography>
          </CardContent>
        </Card>
      )}

      {users.map((u) => {
    		const pendingMs = u.pending_since && now > 0 ? now - new Date(u.pending_since).getTime() : 0;
        const days = Math.floor(pendingMs / DAY_MS);
        const overdue = days > 10;

        return (
          <Card key={u.id} sx={{ mb: 2 }}>
            <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6">{u.name}</Typography>
                  {overdue && <WarningRoundedIcon color="error" fontSize="small" />}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {u.email} · {u.member_code}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                  <Chip size="small" label={`${u.total_pv_accumulated} PV`} color="primary" variant="outlined" />
                  <Chip size="small" label={`${u.total_cv_accumulated} CV`} color="secondary" variant="outlined" />
                  <Chip
                    size="small"
                    label={`${days} gündür bekliyor`}
                    color={overdue ? "error" : "default"}
                  />
                </Box>
                {overdue && (
                  <Typography variant="caption" color="error">
                    10 günden fazladır bekliyor!
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  color="success"
                  disabled={placing === u.id}
                  onClick={() => place(u.id, "L", u.name)}
                >
                  Sola Yerleştir
                </Button>
                <Button variant="contained" disabled={placing === u.id} onClick={() => place(u.id, "R", u.name)}>
                  Sağa Yerleştir
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
      })}

      <Snackbar open={!!snackbar} autoHideDuration={5000} onClose={() => setSnackbar("")} message={snackbar} />
    </Container>
  );
}

export default function PendingPage() {
  return (
    <RequireAuth>
      <PendingContent />
    </RequireAuth>
  );
}
