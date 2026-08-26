"use client";

import { useEffect, useState } from "react";
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
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import { listBinaryTransactions, getErrorMessage } from "@/services/api";
import type { BinaryTransactionsResponse } from "@/services/api";
import RequireAuth from "@/components/RequireAuth";
import EmptyState from "@/components/EmptyState";

const TYPE_META: Record<
  string,
  { label: string; color: "success" | "error" | "warning"; icon: React.ReactElement }
> = {
  add: { label: "Ekleme", color: "success", icon: <TrendingUpRoundedIcon /> },
  deduct: { label: "Eşleşme Düşümü", color: "error", icon: <TrendingDownRoundedIcon /> },
  reset: { label: "Sıfırlama", color: "warning", icon: <RestartAltRoundedIcon /> },
};

function BinaryTransactionsContent() {
  const [data, setData] = useState<BinaryTransactionsResponse | null>(null);
  const [position, setPosition] = useState("");
  const [txType, setTxType] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 10;

  useEffect(() => {
    listBinaryTransactions({
      position: (position as "L" | "R") || undefined,
      transaction_type: (txType as "add" | "deduct" | "reset") || undefined,
      limit,
      offset: page * limit,
    })
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [position, txType, page]);

  const addTotal =
    data?.transactions.filter((t) => t.transaction_type === "add").reduce((s, t) => s + t.cv, 0) ?? 0;
  const deductTotal =
    data?.transactions.filter((t) => t.transaction_type === "deduct").reduce((s, t) => s + t.cv, 0) ?? 0;

  const summaryCards = [
    { label: "Toplam Hareket", value: data?.total ?? 0, highlight: true },
    { label: "Ekleme (sayfa)", value: addTotal },
    { label: "Eşleşme Düşümü (sayfa)", value: deductTotal },
  ];

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom sx={{ fontWeight: 800 }}>
        Binary Hareketleri
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sol ve sağ hatlarınızdaki PV/CV ekleme ve eşleşme düşümlerinin geçmişi.
      </Typography>

      {/* Özet kartları */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map((s) => (
          <Grid size={{ xs: 6, sm: 4 }} key={s.label}>
            <Card
              sx={{
                borderRadius: "13px",
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
                  {typeof s.value === "number" && !Number.isInteger(s.value)
                    ? `${s.value.toLocaleString("tr-TR")} CV`
                    : s.value.toLocaleString("tr-TR")}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
        <ToggleButtonGroup
          value={position}
          exclusive
          size="small"
          onChange={(_, v) => {
            setPosition(v || "");
            setPage(0);
          }}
        >
          <ToggleButton value="">Tüm Hatlar</ToggleButton>
          <ToggleButton value="L">Sol</ToggleButton>
          <ToggleButton value="R">Sağ</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={txType}
          exclusive
          size="small"
          onChange={(_, v) => {
            setTxType(v || "");
            setPage(0);
          }}
        >
          <ToggleButton value="">Tümü</ToggleButton>
          <ToggleButton value="add">Ekleme</ToggleButton>
          <ToggleButton value="deduct">Düşüm</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : data && data.transactions.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={<AccountTreeRoundedIcon />} message="Henüz binary hareketi yok." />
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ borderRadius: "14px", overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
          <TableContainer>
            <Table sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: (theme) => theme.palette.primary.main,
                    "& th": { color: "common.white", fontWeight: 700, fontSize: 13 },
                  }}
                >
                  <TableCell>Tarih</TableCell>
                  <TableCell>Hat</TableCell>
                  <TableCell>İşlem</TableCell>
                  <TableCell align="right">PV</TableCell>
                  <TableCell align="right">CV</TableCell>
                  <TableCell>Açıklama</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.transactions.map((t, i) => {
                  const meta = TYPE_META[t.transaction_type] ?? {
                    label: t.transaction_type,
                    color: "default" as const,
                    icon: <AccountTreeRoundedIcon />,
                  };
                  return (
                    <TableRow
                      key={t.id}
                      hover
                      sx={{
                        bgcolor: i % 2 === 1 ? (theme) => theme.palette.secondary.light : "background.paper",
                        "&:hover": { bgcolor: (theme) => theme.palette.secondary.main },
                      }}
                    >
                      <TableCell sx={{ whiteSpace: "nowrap", fontSize: 13.5 }}>
                        {new Date(t.created_at).toLocaleString("tr-TR", {
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
                          label={t.position === "L" ? "Sol Hat" : "Sağ Hat"}
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
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
                      <TableCell align="right" sx={{ fontSize: 13.5 }}>
                        {t.pv > 0 ? (
                          <Typography sx={{ fontWeight: 700, color: "success.main", fontSize: 14 }}>
                            +{t.pv.toLocaleString("tr-TR")} PV
                          </Typography>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 13.5 }}>
                        {t.cv > 0 ? (
                          <Typography sx={{ fontWeight: 700, color: "primary.dark", fontSize: 14 }}>
                            +{t.cv.toLocaleString("tr-TR")} CV
                          </Typography>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: "text.secondary", maxWidth: 260 }}>
                        <Typography
                          component="span"
                          noWrap
                          sx={{ display: "block", textOverflow: "ellipsis", overflow: "hidden" }}
                        >
                          {t.description || "—"}
                          {t.related_order_id != null && ` · Sipariş #${t.related_order_id}`}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {data && (
            <TablePagination
              component="div"
              count={data.total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={limit}
              rowsPerPageOptions={[limit]}
              labelRowsPerPage=""
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} / ${count.toLocaleString("tr-TR")} hareket`
              }
              sx={{
                borderTop: "1px solid",
                borderColor: "divider",
                "& .MuiTablePagination-toolbar": { minHeight: 56 },
              }}
            />
          )}
        </Card>
      )}
    </Container>
  );
}

export default function BinaryTransactionsPage() {
  return (
    <RequireAuth>
      <BinaryTransactionsContent />
    </RequireAuth>
  );
}
