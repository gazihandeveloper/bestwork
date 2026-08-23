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
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import RequireAuth from "@/components/RequireAuth";
import {
  listAdminPaymentNotifications,
  approvePaymentNotification,
  rejectPaymentNotification,
  getErrorMessage,
} from "@/services/api";
import type { PaymentNotification } from "@/services/api";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const statusColors: Record<string, "success" | "error" | "warning"> = {
  approved: "success",
  rejected: "error",
  pending: "warning",
};

function AdminPaymentNotificationsContent() {
  const [items, setItems] = useState<PaymentNotification[]>([]);
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  const load = () => {
    listAdminPaymentNotifications({ limit: 50 })
      .then((d) => setItems(d.payment_notifications))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handle = async (id: number, action: "approve" | "reject") => {
    setActing(id);
	setLoading(true);
    setError("");
    try {
      if (action === "approve") await approvePaymentNotification(id);
      else await rejectPaymentNotification(id);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActing(null);
    }
  };

  const filtered = filter ? items.filter((i) => i.status === filter) : items;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Ödeme Bildirimleri (Admin)
      </Typography>

      <ToggleButtonGroup
        value={filter}
        exclusive
        size="small"
        sx={{ mb: 2 }}
        onChange={(_, v) => setFilter(v ?? "")}
      >
        <ToggleButton value="">Tümü</ToggleButton>
        <ToggleButton value="pending">Bekleyen</ToggleButton>
        <ToggleButton value="approved">Onaylanan</ToggleButton>
        <ToggleButton value="rejected">Reddedilen</ToggleButton>
      </ToggleButtonGroup>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">Bildirim yok.</Typography>
          </CardContent>
        </Card>
      ) : (
        filtered.map((pn) => (
          <Card key={pn.id} sx={{ mb: 2 }}>
            <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography variant="h6">
                  #{pn.id} · {tl(pn.amount)} <Chip size="small" label={pn.status} color={statusColors[pn.status] || "default"} />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Kullanıcı {pn.user_id}
                  {pn.order_id != null && ` · Sipariş #${pn.order_id}`} · {pn.bank_name || "-"} · {pn.reference_no || "-"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(pn.created_at).toLocaleString("tr-TR")}
                  {pn.file_path && ` · Dosya: ${pn.file_path}`}
                </Typography>
                {pn.note && (
                  <Typography variant="caption" sx={{ display: "block" }} color="text.secondary">
                    Not: {pn.note}
                  </Typography>
                )}
              </Box>
              {pn.status === "pending" && (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button variant="contained" color="success" disabled={acting === pn.id} onClick={() => handle(pn.id, "approve")}>
                    Onayla
                  </Button>
                  <Button variant="outlined" color="error" disabled={acting === pn.id} onClick={() => handle(pn.id, "reject")}>
                    Reddet
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </Container>
  );
}

export default function AdminPaymentNotificationsPage() {
  return (
    <RequireAuth adminOnly>
      <AdminPaymentNotificationsContent />
    </RequireAuth>
  );
}
