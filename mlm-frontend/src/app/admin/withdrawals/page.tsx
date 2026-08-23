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
import Chip from "@mui/material/Chip";
import RequireAuth from "@/components/RequireAuth";
import { listWithdrawals, approveWithdrawal, rejectWithdrawal, getErrorMessage } from "@/services/api";
import type { WithdrawRequest } from "@/services/api";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

function AdminWithdrawalsContent() {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    listWithdrawals()
      .then(setRequests)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    setError("");
    try {
      if (action === "approve") await approveWithdrawal(id);
      else await rejectWithdrawal(id);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Para Çekme Talepleri
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && requests.length === 0 && (
        <Card>
          <CardContent>
            <Typography color="text.secondary">Bekleyen talep yok.</Typography>
          </CardContent>
        </Card>
      )}

      {requests.map((w) => (
        <Card key={w.id} sx={{ mb: 2 }}>
          <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box>
              <Typography variant="h6">#{w.id} · {tl(w.amount)}</Typography>
              <Typography variant="body2" color="text.secondary">
                Kullanıcı {w.user_id} · {w.method || "-"} · {new Date(w.requested_at).toLocaleString("tr-TR")}
              </Typography>
            </Box>
            {w.status === "pending" ? (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="contained" color="success" onClick={() => handleAction(w.id, "approve")}>
                  Onayla
                </Button>
                <Button variant="outlined" color="error" onClick={() => handleAction(w.id, "reject")}>
                  Reddet
                </Button>
              </Box>
            ) : (
              <Chip
                label={w.status}
                color={w.status === "approved" ? "success" : "error"}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </Container>
  );
}

export default function AdminWithdrawalsPage() {
  return (
    <RequireAuth adminOnly>
      <AdminWithdrawalsContent />
    </RequireAuth>
  );
}
