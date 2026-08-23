"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import MilitaryTechRoundedIcon from "@mui/icons-material/MilitaryTechRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import { api, getErrorMessage } from "@/lib/api";
import { getDashboard } from "@/services/api";
import RequireAuth from "@/components/RequireAuth";
import EmptyState from "@/components/EmptyState";
import type { Commission } from "@/services/api";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const TYPE_META: Record<string, { label: string; color: "success" | "info" | "warning" | "default"; icon: React.ReactElement }> = {
  referral: { label: "Referans", color: "success", icon: <GroupsRoundedIcon /> },
  binary: { label: "Binary", color: "info", icon: <AccountTreeRoundedIcon /> },
  matching: { label: "Matching", color: "warning", icon: <MilitaryTechRoundedIcon /> },
};

function CommissionsContent() {
  const searchParams = useSearchParams();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ referral: 0, binary: 0, matching: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState(searchParams.get("type") || "");
  const [page, setPage] = useState(0);
  const limit = 10;

  useEffect(() => {
    Promise.all([
      api.get<{ commissions: Commission[]; total: number }>("/commissions", {
        params: { type: type || undefined, limit, offset: page * limit },
      }),
      getDashboard(),
    ])
      .then(([res, dash]) => {
        setCommissions(res.data.commissions);
        setTotal(res.data.total);
        setTotals({
          referral: dash.total_referral_earnings,
          binary: dash.total_binary_earnings,
          matching: dash.total_matching_earnings,
        });
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [type, page]);

  const summaryCards = [
    { label: "Toplam Prim", value: totals.referral + totals.binary + totals.matching, highlight: true },
    { label: "Referans", value: totals.referral },
    { label: "Binary", value: totals.binary },
    { label: "Matching", value: totals.matching },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom sx={{ fontWeight: 800 }}>
        Prim Detayları
      </Typography>

      {/* Özet kartları */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map((s) => (
          <Grid size={{ xs: 6, sm: 3 }} key={s.label}>
            <Card
              sx={{
                borderRadius: "18px",
                border: "1px solid",
                borderColor: "divider",
                background: s.highlight
                  ? (theme) =>
                      `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                  : "background.paper",
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: s.highlight ? "rgba(255,255,255,0.85)" : "text.secondary",
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  {s.label.toLocaleUpperCase("tr-TR")}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, color: s.highlight ? "common.white" : "primary.dark" }}
                >
                  {tl(s.value)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <ToggleButtonGroup
          value={type}
          exclusive
          size="small"
          onChange={(_, v) => {
            setType(v || "");
            setPage(0);
          }}
        >
          <ToggleButton value="">Tümü</ToggleButton>
          <ToggleButton value="referral">Referans</ToggleButton>
          <ToggleButton value="binary">Binary</ToggleButton>
          <ToggleButton value="matching">Matching</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : commissions.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={<ReceiptLongRoundedIcon />} message="Bu filtrede komisyon kaydı yok." />
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ borderRadius: "20px", overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
          <TableContainer>
            <Table sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: (theme) => theme.palette.primary.main,
                    "& th": { color: "common.white", fontWeight: 700, fontSize: 13 },
                  }}
                >
                  <TableCell>Tarih</TableCell>
                  <TableCell>Tür</TableCell>
                  <TableCell align="right">İlgili CV</TableCell>
                  <TableCell align="right">Tutar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {commissions.map((c, i) => {
                  const meta = TYPE_META[c.type] ?? {
                    label: c.type,
                    color: "default" as const,
                    icon: <ReceiptLongRoundedIcon />,
                  };
                  return (
                    <TableRow
                      key={c.id}
                      hover
                      sx={{
                        bgcolor: i % 2 === 1 ? (theme) => theme.palette.secondary.light : "background.paper",
                        "&:hover": { bgcolor: (theme) => theme.palette.secondary.main },
                      }}
                    >
                      <TableCell sx={{ whiteSpace: "nowrap", fontSize: 13.5 }}>
                        {new Date(c.created_at).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={meta.icon}
                          label={meta.label}
                          color={meta.color}
                          sx={{ fontWeight: 600, "& .MuiChip-icon": { fontSize: 15 } }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 13.5, color: "text.secondary" }}>
                        {c.related_cv != null ? `${c.related_cv.toLocaleString("tr-TR")} CV` : "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 800, color: "primary.dark", fontSize: 14 }}>
                          +{tl(c.amount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={limit}
            rowsPerPageOptions={[limit]}
            labelRowsPerPage=""
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} / ${count.toLocaleString("tr-TR")} kayıt`
            }
            sx={{
              borderTop: "1px solid",
              borderColor: "divider",
              "& .MuiTablePagination-toolbar": { minHeight: 56 },
            }}
          />
        </Card>
      )}
    </Container>
  );
}

function CommissionsPageInner() {
  return (
    <Suspense fallback={null}>
      <CommissionsContent />
    </Suspense>
  );
}

export default function CommissionsPage() {
  return (
    <RequireAuth>
      <CommissionsPageInner />
    </RequireAuth>
  );
}
