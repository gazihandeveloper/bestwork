"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Snackbar from "@mui/material/Snackbar";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import LinearProgress from "@mui/material/LinearProgress";
import MilitaryTechRoundedIcon from "@mui/icons-material/MilitaryTechRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
import SignalCellularAltRoundedIcon from "@mui/icons-material/SignalCellularAltRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import BalanceRoundedIcon from "@mui/icons-material/BalanceRounded";

import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { getDashboard, getRanks, getMe, listSponsored, listPendingUsers, getProfile, updateProfileImage, uploadFile, fileUrl, getErrorMessage } from "@/services/api";
import { BASE_PATH } from "@/lib/api";
import type { UserDashboard, Rank, User } from "@/services/api";

const fmt2 = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmt = (v: number) => v.toLocaleString("tr-TR");

interface StatBlockProps {
  label: string;
  value: string;
  kalan?: string;
  kalanBoxes?: { leftLabel?: string; rightLabel?: string; left: string; right: string };
  progress?: number;
  steps?: { filled: number; total: number };
  icon: React.ReactNode;
  highlight?: boolean;
  big?: boolean;
  info?: string;
  flipped?: boolean;
  onFlip?: () => void;
  onClick?: () => void;
}

function StatBlock({ label, value, kalan, kalanBoxes, progress, steps, icon, highlight = false, big, info, flipped, onFlip, onClick }: StatBlockProps) {
  return (
    <Card
      onClick={onClick}
      sx={{
        height: "100%",
        cursor: onClick ? "pointer" : "default",
        borderRadius: "20px",
        border: "1px solid",
        borderColor: "divider",
        background: highlight
          ? (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
          : "background.paper",
        color: highlight ? "common.white" : "text.primary",
        boxShadow: 2,
        transition: "box-shadow 250ms ease",
        perspective: 1000,
        "&:hover": { boxShadow: 6 },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 600ms cubic-bezier(0.2, 0, 0, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Ön yüz */}
        <Box
          sx={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            height: "100%",
          }}
        >
          <CardContent sx={{ p: 2, position: "relative", minHeight: 178, display: "flex", flexDirection: "column" }}>
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <Box
            component="button"
            type="button"
            aria-label={`${label} hakkında bilgi`}
            onClick={(e) => {
              e.stopPropagation();
              onFlip?.();
            }}
            sx={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <InfoRoundedIcon
              sx={{
                fontSize: 28,
                color: highlight ? "rgba(255,255,255,0.9)" : "primary.main",
                transition: "color 200ms ease, transform 200ms ease",
                "&:hover": { transform: "scale(1.15)" },
              }}
            />
          </Box>
        </Box>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: "12px",
            bgcolor: highlight ? "rgba(255,255,255,0.2)" : "secondary.main",
            color: highlight ? "common.white" : "primary.dark",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 1,
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: highlight ? "rgba(255,255,255,0.85)" : "text.secondary",
            fontWeight: 700,
            letterSpacing: 0.5,
            fontSize: 14,
          }}
        >
          {label.toLocaleUpperCase("tr-TR")}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            mt: 0.25,
            fontSize: big ? "2.4rem" : "1.7rem",
            lineHeight: 1.2,
            color: highlight ? "common.white" : "primary.dark",
          }}
        >
          {value}
        </Typography>
        {steps && (
          <Box sx={{ mt: "auto", pt: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
            {Array.from({ length: steps.total }, (_, i) => {
              const filled = i < steps.filled;
              return (
                <Box
                  key={i}
                  sx={{
                    flexGrow: 1,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: filled
                      ? highlight
                        ? "#D8F0DC"
                        : "primary.main"
                      : highlight
                        ? "rgba(255,255,255,0.25)"
                        : "secondary.light",
                    transition: "background-color 300ms ease",
                  }}
                />
              );
            })}
          </Box>
        )}
        {kalanBoxes && (
          <Box sx={{ mt: "auto", pt: 1, display: "flex", gap: 1 }}>
            {[
              { label: kalanBoxes.leftLabel ?? "Sol", value: kalanBoxes.left },
              { label: kalanBoxes.rightLabel ?? "Sağ", value: kalanBoxes.right },
            ].map((b) => (
              <Box
                key={b.label}
                sx={{
                  flexGrow: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.5,
                  border: "1px solid",
                  borderColor: "primary.main",
                  borderRadius: "8px",
                  px: 0.75,
                  py: 0.1,
                  textAlign: "center",
                  bgcolor: "primary.main",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 10.5,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  {b.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    fontSize: 12.5,
                    color: "common.white",
                    lineHeight: 1.3,
                  }}
                >
                  {b.value}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
        {kalan && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: "auto",
              pt: 1,
              color: highlight ? "rgba(255,255,255,0.85)" : "text.secondary",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Kalan: {kalan}
          </Typography>
        )}

        {progress !== undefined && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                borderRadius: 4,
                height: 7,
                bgcolor: highlight ? "rgba(255,255,255,0.25)" : "secondary.light",
                "& .MuiLinearProgress-bar": {
                  bgcolor: highlight ? "#D8F0DC" : "primary.main",
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        )}
      </CardContent>
        </Box>

        {/* Arka yüz (bilgi) */}
        {info && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              p: 2.5,
              gap: 1,
              borderRadius: "20px",
              background: highlight
                ? (theme) =>
                    `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.light})`
                : (theme) => theme.palette.secondary.light,
              color: "primary.dark",
            }}
          >
            <InfoRoundedIcon sx={{ fontSize: 30 }} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 220 }}>
              {info}
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFlip?.();
              }}
              sx={{
                mt: 1,
                border: "1px solid",
                borderColor: "primary.main",
                bgcolor: "background.paper",
                color: "primary.dark",
                borderRadius: "28px",
                px: 2,
                py: 0.75,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                "&:hover": { bgcolor: "secondary.main" },
              }}
            >
              Geri Dön
            </Box>
          </Box>
        )}
      </Box>
    </Card>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user: contextUser } = useAuth();
  const [me, setMe] = useState<User | null>(contextUser);
  const [data, setData] = useState<UserDashboard | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [sponsoredCount, setSponsoredCount] = useState(0);
  const [copied, setCopied] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const flip = (label: string) =>
    setFlippedCard((prev) => (prev === label ? null : label));

  const openPendingModal = () => {
    setPendingOpen(true);
    setPendingLoading(true);
    listPendingUsers()
      .then(setPendingUsers)
      .catch((err) => setMsg(getErrorMessage(err)))
      .finally(() => setPendingLoading(false));
  };

  const [error, setError] = useState("");

  const refresh = () => {
    Promise.all([getDashboard(), getMe(), listPendingUsers()])
      .then(([d, u, sp]) => {
        setData(d);
        setMe(u);
        setPendingCount(sp.length);
      })
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    Promise.all([getDashboard(), getRanks(), listSponsored(), listPendingUsers()])
      .then(([d, r, sp, pend]) => {
        setData(d);
        setRanks(r);
        setSponsoredCount(sp.length);
        setPendingCount(pend.length);
      })
      .catch((err) => setError(getErrorMessage(err)));

    getProfile()
      .then((p) => {
        const img = p.profile_image;
        if (typeof img === "string") setProfileImage(img);
      })
      .catch(() => {});

    // Anlık kazanç ve bakiyeler 5 sn'de bir + sayfa odaklanınca güncellenir.
    const id = setInterval(refresh, 5000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const d = data;


  const currentRankId = me?.current_rank_id;
  const rankIndex = currentRankId != null ? ranks.findIndex((r) => r.id === currentRankId) : -1;

  const currentRankName = (d.user.rank || "GİRİŞİMCİ").toLocaleUpperCase("tr-TR");

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadFile(file);
      await updateProfileImage(path);
      setProfileImage(path);
      setMsg("Profil fotoğrafı güncellendi.");
    } catch {
      setMsg("Fotoğraf yüklenemedi.");
    } finally {
      setUploading(false);
    }
  };

  const copyText = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  };

  const initials = (contextUser?.name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const referralLink =
    typeof window !== "undefined" && me
      ? `${window.location.origin}${BASE_PATH}/register?ref=${me.member_code}`
      : "";

  return (
    <Container maxWidth={false} sx={{ width: "100%", py: 3 }}>
      <Grid container spacing={2.5}>
        {/* Sol profil sidebar */}
        <Grid size={{ xs: 12, md: 3 }} sx={{ display: "flex" }}>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexGrow: 1,
              position: { md: "sticky" },
              top: 96,
            }}
          >
            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: "24px",
                overflow: "hidden",
                background: (theme) =>
                  `linear-gradient(165deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.secondary.dark} 100%)`,
                color: "common.white",
                boxShadow: 6,
              }}
            >
              {/* Profil görseli — çerçevesiz bant */}
              <Box sx={{ position: "relative", width: "100%", aspectRatio: "16/10", flexShrink: 0 }}>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(255,255,255,0.08)",
                  }}
                >
                  {profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fileUrl(profileImage) ?? ""}
                      alt={contextUser?.name ?? "Profil"}
                      style={{
                        width: 170,
                        height: 170,
                        objectFit: "cover",
                        objectPosition: "center",
                        display: "block",
                        borderRadius: "14px",
                      }}
                    />
                  ) : (
                    <Box sx={{ fontSize: 64, fontWeight: 800, color: "#D8F0DC" }}>{initials}</Box>
                  )}
                </Box>
                <Box
                  component="label"
                  aria-label="Profil fotoğrafı yükle"
                  sx={{ cursor: "pointer", position: "absolute", right: 12, bottom: 12 }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    hidden
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  />
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      bgcolor: "common.white",
                      color: "primary.dark",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: 3,
                      "&:hover": { bgcolor: "#D8F0DC" },
                    }}
                  >
                    {uploading ? <CircularProgress size={18} /> : <CameraAltRoundedIcon sx={{ fontSize: 20 }} />}
                  </Box>
                </Box>
              </Box>

              {/* İçerik */}
              <Box sx={{ p: 3, pt: 2, display: "flex", flexDirection: "column", gap: 1.25, alignItems: "center", textAlign: "center" }}>
                <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                  {contextUser?.name}
                </Typography>

                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: "common.white",
                    borderRadius: "28px",
                    px: 2,
                    py: 0.75,
                    boxShadow: 2,
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      bgcolor: me?.is_active ? "success.main" : "error.main",
                      animation: "blink 1.2s ease-in-out infinite",
                      "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 800, color: me?.is_active ? "success.main" : "error.main" }}>
                    Aktif
                  </Typography>
                </Box>

                <Chip
                  label={`Üye ID: ${me?.member_code}`}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "common.white",
                    cursor: "pointer",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.28)" },
                  }}
                  onClick={() => copyText(me?.member_code ?? "", "üye-id")}
                  deleteIcon={<ContentCopyRoundedIcon sx={{ color: "common.white", fontSize: 16 }} />}
                  onDelete={() => copyText(me?.member_code ?? "", "üye-id")}
                />
                {d.user.rank && (
                  <Chip
                    label={`Rütbe: ${d.user.rank}`}
                    sx={{
                      bgcolor: "rgba(255,255,255,0.15)",
                      color: "common.white",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.28)" },
                    }}
                    onClick={() => router.push("/career")}
                  />
                )}
              </Box>

              {/* Üye kayıt linki — alt */}
              <Box sx={{ px: 3, pb: 3, mt: "auto" }}>
                <Typography
                  variant="overline"
                  sx={{ display: "block", textAlign: "center", color: "rgba(255,255,255,0.75)", fontWeight: 700, letterSpacing: 1.5, mb: 0.75, fontSize: 10.5 }}
                >
                  Üye Kayıt Linkiniz
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 3,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <LinkRoundedIcon sx={{ color: "common.white", fontSize: 18, flexShrink: 0 }} />
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ color: "common.white", fontFamily: "monospace", fontSize: 12, flexGrow: 1 }}
                  >
                    {referralLink}
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<ContentCopyRoundedIcon sx={{ fontSize: 16 }} />}
                    onClick={() => copyText(referralLink, "link")}
                    sx={{ flexShrink: 0, fontSize: 11, py: 0.5 }}
                  >
                    {copied === "link" ? "Kopyalandı!" : "Kopyala"}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* İstatistik blokları */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatBlock
            label="Ünvan"
            value={currentRankName}
            steps={{ filled: rankIndex + 1, total: 12 }}
            icon={<MilitaryTechRoundedIcon />}
            highlight
            info={`${currentRankName} — Sistemdeki en yüksek kariyer unvanınız.`}
            flipped={flippedCard === "Ünvan"}
            onFlip={() => flip("Ünvan")}
            onClick={() => router.push("/career")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatBlock
            label="Güncel Kariyeriniz"
            value={currentRankName}
            icon={<WorkspacePremiumRoundedIcon />}
            info="Bu ayki güncel kariyeriniz."
            flipped={flippedCard === "Güncel Kariyeriniz"}
            onFlip={() => flip("Güncel Kariyeriniz")}
            onClick={() => router.push("/career")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatBlock
            label="Seviyeniz"
            value={d.user.package ? d.user.package.toLocaleUpperCase("tr-TR") : "BRONZ"}
            icon={<SignalCellularAltRoundedIcon />}
            info="Kazanç oranlarınızı belirleyen paketiniz."
            flipped={flippedCard === "Seviyeniz"}
            onFlip={() => flip("Seviyeniz")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatBlock
            label="Sponsor Olduklarım"
            value={String(sponsoredCount)}
            icon={<GroupAddRoundedIcon />}
            info="Doğrudan kaydettiğiniz 1. hat üyeleriniz."
            flipped={flippedCard === "Sponsor Olduklarım"}
            onFlip={() => flip("Sponsor Olduklarım")}
            onClick={() => router.push("/sponsor-tree")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatBlock
            label="Ekibim"
            value={`${fmt(d.left_team_count)} / ${fmt(d.right_team_count)}`}
            kalanBoxes={{
              leftLabel: "Sol Kol",
              rightLabel: "Sağ Kol",
              left: fmt(d.left_team_count),
              right: fmt(d.right_team_count),
            }}
            icon={<GroupRoundedIcon />}
            info="Binary ağacınızdaki toplam üye sayısı."
            flipped={flippedCard === "Ekibim"}
            onFlip={() => flip("Ekibim")}
            onClick={() => router.push("/tree")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatBlock
            label="Anlık Eşleşme"
            value={`${fmt(d.monthly_matched_cv)} CV`}
            kalanBoxes={{
              left: fmt(d.leg_cv_left_total),
              right: fmt(d.leg_cv_right_total),
            }}
            icon={<BalanceRoundedIcon />}
            info="Kısa kol ile eşleşen puanınız."
            flipped={flippedCard === "Anlık Eşleşme"}
            onFlip={() => flip("Anlık Eşleşme")}
            onClick={() => router.push("/binary-transactions")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatBlock
            label="Kişisel Toplam Kazanç"
            value={`${fmt2(d.wallet.total_earned)} ₺`}
            icon={<ShowChartRoundedIcon />}
            info="Sisteme katılımınızdan beri toplam kazancınız."
            flipped={flippedCard === "Kişisel Toplam Kazanç"}
            onFlip={() => flip("Kişisel Toplam Kazanç")}
            onClick={() => router.push("/commissions")}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatBlock
            label="Yerleşim Bekleyen"
            value={String(pendingCount)}
            icon={<PendingActionsRoundedIcon />}
            info="Ağaca yerleştirilmeyi bekleyen üyeler."
            flipped={flippedCard === "Yerleşim Bekleyen"}
            onFlip={() => flip("Yerleşim Bekleyen")}
            onClick={openPendingModal}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatBlock
            label="Anlık Kazanç"
            value={`${fmt2(d.monthly_earned)} ₺`}
            icon={<AccountBalanceWalletRoundedIcon />}
            info="Bu cari dönemde oluşan güncel hakedişiniz."
            flipped={flippedCard === "Anlık Kazanç"}
            onFlip={() => flip("Anlık Kazanç")}
            onClick={() => router.push("/commissions?type=binary")}
          />
        </Grid>
        </Grid>
      </Grid>
      </Grid>
      {/* Yerleşim bekleyenler modalı */}
      <Dialog open={pendingOpen} onClose={() => setPendingOpen(false)} maxWidth="md" fullWidth>
        <DialogContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.dark" }}>
              Yerleşim Bekleyen Üyeler
            </Typography>
            <IconButton aria-label="Kapat" onClick={() => setPendingOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          {pendingLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : pendingUsers.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              Yerleşim bekleyen üye yok.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: (theme) => theme.palette.primary.main, "& th": { color: "common.white", fontWeight: 700 } }}>
                    <TableCell>Üye No</TableCell>
                    <TableCell>Ad Soyad</TableCell>
                    <TableCell>Kayıt Tarihi</TableCell>
                    <TableCell>Aktiflik Tarihi</TableCell>
                    <TableCell align="center">Ağaca Yerleştir</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingUsers.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{u.member_code}</TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {u.pending_since
                          ? new Date(u.pending_since).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
                          : "—"}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            setPendingOpen(false);
                            router.push("/tree");
                          }}
                        >
                          Ağaca Yerleştir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!msg}
        autoHideDuration={3000}
        onClose={() => setMsg("")}
        message={msg}
      />
    </Container>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
