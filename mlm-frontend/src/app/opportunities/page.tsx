"use client";

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { getRanks, getErrorMessage } from "@/services/api";
import type { Rank } from "@/services/api";

const steps = [
  { title: "1. Kayıt Ol", desc: "Ücretsiz üye olun; TR90 ile başlayan üye numaranız otomatik oluşturulur." },
  { title: "2. Alışveriş Yap", desc: "PV/CV kazandıran ürünlerden sipariş verin, paket seviyeniz otomatik yükselsin." },
  { title: "3. Kazan", desc: "Referans, binary, matching ve perakende kazançlarıyla ekibinizi büyütüp kazanın." },
];

const earnings = [
  { title: "Referans Primi", desc: "Sponsor olduğunuz her üyenin sipariş CV'sinden paket oranınıza göre anında kazanırsınız." },
  { title: "Binary Eşleşme", desc: "Sol ve sağ bacağınızdaki CV'ler aylık kapanışta eşleşir, binary bonusu cüzdanınıza yatar." },
  { title: "Liderlik (Matching) Primi", desc: "Ekibinizin binary kazançlarından 5 nesle kadar %20/%10/%10/%10/%5 pay alırsınız." },
  { title: "Perakende Kazancı", desc: "Referans kodunuzla kayıt olan müşterilerin siparişlerinden komisyon kazanırsınız." },
];

const tl = (v: number) => v.toLocaleString("tr-TR");

function OpportunitiesContent() {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRanks()
      .then(setRanks)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container maxWidth={false} sx={{ py: 4 }}>
      {/* Hero */}
      <Box sx={{ textAlign: "center", py: 5, borderRadius: 2.8, bgcolor: "#16331B", color: "#fff", mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          İş Fırsatları
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, maxWidth: 620, mx: "auto", px: 2, color: "#C8E6C9" }}>
          Bestwork MLM ile e-ticareti ve ekibinizi birleştirin: alışveriş yapın, üye davet edin,
          aylık binary kapanışından ve liderlik priminden kazanın.
        </Typography>
      </Box>

      {/* Nasıl çalışır */}
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Nasıl Çalışır?
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {steps.map((s) => (
          <Grid size={{ xs: 12, sm: 4 }} key={s.title}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" color="primary.main" gutterBottom>
                  {s.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {s.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Kariyer seviyeleri */}
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Kariyer Seviyeleri
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card sx={{ mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Rütbe</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Sol Hat PV</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Sağ Hat PV</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Aylık Binary Limiti</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ranks.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Chip size="small" label={r.name} color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">{tl(r.required_left_pv)}</TableCell>
                  <TableCell align="right">{tl(r.required_right_pv)}</TableCell>
                  <TableCell align="right">{tl(r.monthly_binary_limit)} TL</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Kazanç fırsatları */}
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Kazanç Fırsatları
      </Typography>
      <Grid container spacing={2}>
        {earnings.map((e) => (
          <Grid size={{ xs: 12, sm: 6 }} key={e.title}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" color="primary.main" gutterBottom>
                  {e.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {e.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default function OpportunitiesPage() {
  return <OpportunitiesContent />;
}
