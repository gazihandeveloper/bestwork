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
import PentagonRoundedIcon from "@mui/icons-material/PentagonRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";
import HexagonRoundedIcon from "@mui/icons-material/HexagonRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import SquareRoundedIcon from "@mui/icons-material/SquareRounded";
import { alpha } from "@mui/material/styles";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { listCareer, getRanks, getErrorMessage } from "@/services/api";
import type { CareerProgress, Rank } from "@/services/api";

const fmt = (v: number) => v.toLocaleString("tr-TR");

// Girişimci dışındaki seviyeler İngilizce gösterilir
const RANK_DISPLAY: Record<string, string> = {
  safir: "Sapphire",
  zümrüt: "Emerald",
};

// Stitch panelindeki gibi her rütbeye özel ikon + renk (+ elmas yıldızları)
function rankMeta(name: string): { icon: typeof DiamondRoundedIcon; color: string; stars: number } {
  const n = name.toLocaleLowerCase("tr-TR");
  const map: Record<string, { icon: typeof DiamondRoundedIcon; color: string; stars: number }> = {
    jade: { icon: PentagonRoundedIcon, color: "#2e7d32", stars: 0 },
    pearl: { icon: CircleRoundedIcon, color: "#9e9e9e", stars: 0 },
    safir: { icon: HexagonRoundedIcon, color: "#1565c0", stars: 0 },
    ruby: { icon: DiamondRoundedIcon, color: "#c62828", stars: 0 },
    zümrüt: { icon: SquareRoundedIcon, color: "#43a047", stars: 0 },
    diamond: { icon: DiamondRoundedIcon, color: "#90caf9", stars: 0 },
    "blue diamond": { icon: DiamondRoundedIcon, color: "#1e88e5", stars: 0 },
    "green diamond": { icon: DiamondRoundedIcon, color: "#43a047", stars: 0 },
    "red diamond": { icon: DiamondRoundedIcon, color: "#e53935", stars: 0 },
    "black diamond": { icon: DiamondRoundedIcon, color: "#212121", stars: 0 },
    president: { icon: DiamondRoundedIcon, color: "#ffd700", stars: 2 },
    ambassador: { icon: DiamondRoundedIcon, color: "#ffd700", stars: 3 },
  };
  return map[n] ?? { icon: DiamondRoundedIcon, color: "#90caf9", stars: 0 };
}

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
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom sx={{ fontWeight: 800 }}>
        Kariyer Takibi
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Rütbeler hat PV toplamlarına göre kazanılır ve kalıcıdır — adım adım ilerleyin.
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && ranks.length === 0 && (
        <Card>
          <CardContent>
            <Typography color="text.secondary">Rütbe tanımları bulunamadı.</Typography>
          </CardContent>
        </Card>
      )}

      {/* Kariyer seviyeleri — Stitch paneli: yatay kaydırılabilir rütbe kartları */}
      <Card sx={{ mb: 4, borderRadius: "24px", border: "1px solid", borderColor: "divider" }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <EmojiEventsRoundedIcon sx={{ color: "primary.main" }} />
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "text.secondary" }}>
              KARİYER SEVİYELERİ
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
              {currentStep ? `Sıradaki: ${currentStep.rank.name}` : "Tümü kazanıldı 🎉"}
            </Typography>
          </Box>
          <Box
            sx={{
              overflowX: "auto",
              pb: 1,
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            <Box sx={{ display: "flex", gap: 1.5, width: "max-content", mx: "auto" }}>
            {[
              // Başlangıç seviyesi: GİRİŞİMCİ — rütbesi olmayan kullanıcıda seçili
              {
                id: "girisimci",
                name: "Girişimci",
                isActive: activeID == null,
                isAchieved: true,
                isNext: false,
                meta: { icon: DiamondRoundedIcon, color: "#004786", stars: 0 },
              },
              ...steps.map((s) => ({
                id: s.rank.id,
                name: RANK_DISPLAY[s.rank.name.toLocaleLowerCase("tr-TR")] ?? s.rank.name,
                isActive: s.isActive,
                isAchieved: s.isAchieved,
                isNext: s.next,
                meta: rankMeta(s.rank.name),
              })),
            ].map((c) => {
              const Icon = c.meta.icon;
              return (
                <Box
                  key={c.id}
                  sx={{
                    flex: "0 0 auto",
                    width: 150,
                    height: 100,
                    borderRadius: "16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    cursor: "pointer",
                    transition: "transform 200ms ease, box-shadow 200ms ease",
                    "&:hover": { transform: "translateY(-3px)" },
                    bgcolor: c.isActive
                      ? "primary.main"
                      : c.isNext
                        ? (theme) => alpha(theme.palette.primary.main, 0.12)
                        : c.isAchieved
                          ? (theme) => alpha(theme.palette.success.main, 0.12)
                          : (theme) => alpha(theme.palette.secondary.main, 0.06),
                    border: "1.5px solid",
                    borderColor: c.isActive
                      ? "primary.main"
                      : c.isNext
                        ? "primary.main"
                        : c.isAchieved
                          ? "success.main"
                          : "divider",
                    boxShadow: c.isActive || c.isNext ? 4 : 0,
                  }}
                >
                  <Box sx={{ position: "relative" }}>
                    <Icon sx={{ fontSize: 40, color: c.isActive ? "#fff" : c.meta.color }} />
                    {c.isAchieved && (
                      <CheckCircleRoundedIcon
                        sx={{
                          position: "absolute",
                          top: -6,
                          left: -10,
                          fontSize: 18,
                          color: "success.main",
                          bgcolor: "background.paper",
                          borderRadius: "50%",
                        }}
                      />
                    )}
                    {c.meta.stars > 0 && (
                      <Box sx={{ position: "absolute", top: -7, right: -12, display: "flex", gap: 0.25 }}>
                        {Array.from({ length: c.meta.stars }).map((_, k) => (
                          <StarRoundedIcon
                            key={k}
                            sx={{ fontSize: 13, color: "#ffd700", bgcolor: "background.paper", borderRadius: "50%" }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      fontSize: 11,
                      textAlign: "center",
                      px: 1,
                      lineHeight: 1.2,
                      color: c.isActive ? "#fff" : c.isAchieved ? "success.dark" : c.isNext ? "primary.main" : "text.secondary",
                    }}
                  >
                    {c.name.toLocaleUpperCase("tr-TR")}
                  </Typography>
                  {(c.isActive || c.isNext) && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: c.isActive ? "rgba(255,255,255,0.85)" : "primary.main",
                      }}
                    >
                      {c.isActive ? "GÜNCEL" : "SONRAKİ"}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
          </Box>
        </CardContent>
      </Card>

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
