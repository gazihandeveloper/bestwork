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
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import RequireAuth from "@/components/RequireAuth";
import { getRetailEarnings, getErrorMessage } from "@/services/api";
import type { RetailEarningsResponse } from "@/services/api";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

function RetailEarningsContent() {
  const [data, setData] = useState<RetailEarningsResponse | null>(null);
  const [month, setMonth] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = (monthFilter: string) => {
    setLoading(true);
    getRetailEarnings({ month: monthFilter || undefined, limit: 20, offset: 0 })
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
  getRetailEarnings({ limit: 20, offset: 0 })
    .then(setData)
    .catch((err) => setError(getErrorMessage(err)))
    .finally(() => setLoading(false));
  }, []);

  const applyMonth = () => {
    setError("");
    load(month);
  };

  return (
    <Container maxWidth={false} sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Müşteri (Perakende) Kazancı
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Referans kodunuzla kayıt olan müşterilerin alışverişlerinden kazandığınız perakende komisyonları.
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          size="small"
          type="month"
          label="Ay filtresi"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 180 }}
        />
        <Button variant="contained" onClick={applyMonth} disabled={loading}>
          Uygula
        </Button>
        {month && (
          <Button variant="text" onClick={() => { setMonth(""); load(""); }}>
            Temizle
          </Button>
        )}
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : data ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Perakende Kazanç
                  </Typography>
                  <Typography variant="h6" color="primary.dark">
                    {tl(data.summary.total_amount)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Müşteri Sipariş Adedi
                  </Typography>
                  <Typography variant="h6" color="primary.dark">
                    {data.summary.order_count}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Müşteri CV
                  </Typography>
                  <Typography variant="h6" color="primary.dark">
                    {data.summary.total_cv}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>
            Kazanç Detayları ({data.total} kayıt)
          </Typography>

          {data.items.length === 0 && (
            <Card>
              <CardContent>
                <Typography color="text.secondary">Bu dönemde perakende kazanç yok.</Typography>
              </CardContent>
            </Card>
          )}

          {data.items.map((it) => (
            <Card key={it.commission_id} sx={{ mb: 1.5 }}>
              <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {it.customer_name} · {it.customer_member_code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sipariş #{it.order_id ?? "-"}
                    {it.order_amount != null && ` · ${tl(it.order_amount)}`}
                    {it.related_cv != null && ` · ${it.related_cv} CV`} ·{" "}
                    {new Date(it.created_at).toLocaleString("tr-TR")}
                  </Typography>
                </Box>
                <Typography variant="h6" color="success.main">
                  +{tl(it.amount)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </>
      ) : null}
    </Container>
  );
}

export default function RetailEarningsPage() {
  return (
    <RequireAuth>
      <RetailEarningsContent />
    </RequireAuth>
  );
}
