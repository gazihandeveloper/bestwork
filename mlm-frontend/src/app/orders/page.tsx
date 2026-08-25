"use client";

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import RequireAuth from "@/components/RequireAuth";
import { getOrders, getErrorMessage } from "@/services/api";
import type { Order } from "@/services/api";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

function OrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth={false} sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Siparişlerim
      </Typography>

      {orders.length === 0 && (
        <Card>
          <CardContent>
            <Typography color="text.secondary">Henüz siparişiniz yok.</Typography>
          </CardContent>
        </Card>
      )}

      {orders.map((o) => (
        <Card key={o.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h6">Sipariş #{o.id}</Typography>
              <Chip label={o.status} color="success" size="small" />
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {new Date(o.created_at).toLocaleString("tr-TR")} · Toplam: {tl(o.total_amount)} · {o.total_pv} PV · {o.total_cv} CV
            </Typography>
            <Divider sx={{ my: 1 }} />
            <List dense>
              {o.items.map((it) => (
                <ListItem key={it.id} disableGutters>
                  <ListItemText
                    primary={`Ürün #${it.product_id ?? "-"} · ${it.quantity} adet`}
                    secondary={`${tl(it.price)} · ${it.pv} PV · ${it.cv} CV`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      ))}
    </Container>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersContent />
    </RequireAuth>
  );
}
