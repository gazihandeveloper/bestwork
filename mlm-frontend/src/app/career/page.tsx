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
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { alpha } from "@mui/material/styles";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { listCareer, getRanks, getErrorMessage } from "@/services/api";
import type { CareerProgress, Rank } from "@/services/api";

const fmt = (v: number) => v.toLocaleString("tr-TR");

function CareerContent() {
  const { user } = useAuth();
  const [achieved, setAchieved] = useState<CareerProgress[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listCareer(), getRanks()])
      .then(([c, r]) => {
        setAchieved(c);
        setRanks(r);
      })
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

  const leftPV = user?.total_pv_left ?? 0;
  const rightPV = user?.total_pv_right ?? 0;
  const achievedIDs = new Set(achieved.map((a) => a.rank_id));
  const activeID = achieved.find((a) => a.is_active)?.rank_id ?? null;

  const achievedByRank = new Map(achieved.map((a) => [a.rank_id, a]));
  const steps = ranks.map((r, i) => {
    const isAchieved = achievedIDs.has(r.id);
    const isActive = r.id === activeID;
    const next = !isAchieved && (i === 0 || achievedIDs.has(ranks[i - 1].id));
    return { rank: r, isAchieved, isActive, next, index: i };
  });

  const currentStep = steps.find((s) => s.next) ?? null;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom sx={{ fontWeight: 800 }}>
        Kariyer Takibi
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Rütbeler bacak PV toplamlarına göre kazanılır ve kalıcıdır — adım adım ilerleyin.
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && ranks.length === 0 && (
        <Card>
          <CardContent>
            <Typography color="text.secondary">Rütbe tanımları bulunamadı.</Typography>
          </CardContent>
        </Card>
      )}

      {/* Sıradaki hedef bandı */}
      {currentStep && (
        <Card
          sx={{
            mb: 4,
            borderRadius: "24px",
            border: "1px solid",
            borderColor: "divider",
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: "common.white",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <StarRoundedIcon sx={{ color: "#D8F0DC" }} />
              <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "rgba(255,255,255,0.9)" }}>
                SIRADAKİ HEDEF
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {currentStep.rank.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
              Sol {fmt(currentStep.rank.required_left_pv)} PV · Sağ {fmt(currentStep.rank.required_right_pv)} PV
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2, flexWrap: "wrap", gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Sol: {fmt(leftPV)} / {fmt(currentStep.rank.required_left_pv)} PV
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Sağ: {fmt(rightPV)} / {fmt(currentStep.rank.required_right_pv)} PV
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Math.round((leftPV / currentStep.rank.required_left_pv) * 100))}
              sx={{
                mt: 1,
                borderRadius: 4,
                height: 10,
                bgcolor: "rgba(255,255,255,0.25)",
                "& .MuiLinearProgress-bar": { bgcolor: "#D8F0DC", borderRadius: 4 },
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Rütbe kutuları — satırda 3 */}
      <Grid container spacing={2}>
        {steps.map((s) => {
          const achievedAt = achievedByRank.get(s.rank.id)?.achieved_at;
          const leftPct = Math.min(100, Math.round((leftPV / s.rank.required_left_pv) * 100));
          const rightPct = Math.min(100, Math.round((rightPV / s.rank.required_right_pv) * 100));
          const pct = Math.round((leftPct + rightPct) / 2);

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.rank.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "20px",
                  border: "2px solid",
                  borderColor: s.isAchieved ? "warning.main" : s.next ? "primary.main" : "divider",
                  bgcolor: s.next
                    ? (theme) => alpha(theme.palette.secondary.main, 0.15)
                    : "background.paper",
                  opacity: s.isAchieved || s.next ? 1 : 0.75,
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 250ms ease, box-shadow 250ms ease",
                  "&:hover": {
                    transform: s.isAchieved || s.next ? "translateY(-4px)" : "none",
                    boxShadow: s.isAchieved || s.next ? 6 : 0,
                  },
                }}
              >
                <CardContent sx={{ p: 2.5, display: "flex", flexDirection: "column", flexGrow: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    {/* İkon + durum */}
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: s.isAchieved
                          ? "warning.main"
                          : s.next
                            ? "primary.main"
                            : (theme) => theme.palette.secondary.light,
                        color: s.isAchieved || s.next ? "common.white" : "text.disabled",
                      }}
                    >
                      {s.isAchieved ? (
                        <CheckCircleRoundedIcon sx={{ fontSize: 26 }} />
                      ) : s.next ? (
                        <StarRoundedIcon sx={{ fontSize: 24 }} />
                      ) : (
                        <LockRoundedIcon sx={{ fontSize: 22 }} />
                      )}
                    </Box>
                    {s.isActive && (
                      <Chip
                        size="small"
                        label="Güncel Rütbeniz"
                        color="success"
                        icon={<EmojiEventsRoundedIcon />}
                        sx={{ fontWeight: 700, "& .MuiChip-icon": { fontSize: 14 } }}
                      />
                    )}
                    {s.next && (
                      <Chip
                        size="small"
                        label="Sonraki"
                        color="primary"
                        icon={<StarRoundedIcon />}
                        sx={{ fontWeight: 700, "& .MuiChip-icon": { fontSize: 14 } }}
                      />
                    )}
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.dark" }}>
                    {s.rank.name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Sol {fmt(s.rank.required_left_pv)} PV · Sağ {fmt(s.rank.required_right_pv)} PV
                  </Typography>

                  {achievedAt ? (
                    <Typography variant="caption" color="warning.dark" sx={{ mt: 0.5, fontWeight: 700 }}>
                      Kazanıldı: {new Date(achievedAt).toLocaleDateString("tr-TR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, fontWeight: 600 }}>
                      {s.next ? "Yaklaşıyorsunuz..." : "Kilitli"}
                    </Typography>
                  )}

                  <Box sx={{ mt: "auto", pt: 1.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        borderRadius: 4,
                        height: 8,
                        bgcolor: "secondary.light",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: s.isAchieved ? "warning.main" : s.next ? "primary.main" : "divider",
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Sol: %{leftPct}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Sağ: %{rightPct}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>

                {/* Geçilen seviyeler: blur + ortada yuvarlak tik */}
                {s.isAchieved && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      bgcolor: "rgba(255,255,255,0.45)",
                      backdropFilter: "blur(2.5px)",
                      WebkitBackdropFilter: "blur(2.5px)",
                    }}
                  >
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: "50%",
                        bgcolor: "warning.main",
                        color: "common.white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: 4,
                      }}
                    >
                      <CheckCircleRoundedIcon sx={{ fontSize: 38 }} />
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "warning.dark" }}>
                      GEÇİLDİ
                    </Typography>
                  </Box>
                )}
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
}

export default function CareerPage() {
  return (
    <RequireAuth>
      <CareerContent />
    </RequireAuth>
  );
}
