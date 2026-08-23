"use client";

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import RequireAuth from "@/components/RequireAuth";
import { listLeadershipBonuses, getErrorMessage } from "@/services/api";
import type { Commission } from "@/services/api";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

function LeadershipBonusContent() {
  const [items, setItems] = useState<Commission[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  useEffect(() => {
    listLeadershipBonuses(limit, offset)
      .then((d) => {
        setItems(d.commissions);
        setTotal(d.total);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [offset]);
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Liderlik Primi (Matching)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Ekibinizin binary kazançlarından 5 nesle kadar aldığınız liderlik primleri.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Toplam Liderlik Primi
            </Typography>
            <Typography variant="h5" color="primary.dark">
              {tl(
                items.reduce((sum, c) => sum + c.amount, 0)
              )}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Toplam {total} kayıt
          </Typography>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">Henüz liderlik primi kazanmadınız.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Tarih</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Kazanç</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Kazandıran Üye</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>İlgili CV</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>{new Date(c.created_at).toLocaleString("tr-TR")}</TableCell>
                  <TableCell align="right" sx={{ color: "success.main", fontWeight: 700 }}>
                    +{tl(c.amount)}
                  </TableCell>
                  <TableCell>{c.from_user_id != null ? `Üye #${c.from_user_id}` : "-"}</TableCell>
                  <TableCell align="right">{c.related_cv ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
        <Button disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - limit))}>
          Önceki
        </Button>
        <Button disabled={offset + limit >= total} onClick={() => setOffset((o) => o + limit)}>
          Sonraki
        </Button>
      </Box>
    </Container>
  );
}

export default function LeadershipBonusPage() {
  return (
    <RequireAuth>
      <LeadershipBonusContent />
    </RequireAuth>
  );
}
