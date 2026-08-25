"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  listBinaryTransactions,
  listCareer,
  getRanks,
  getErrorMessage,
} from "@/services/api";
import type { Commission, CareerProgress, Rank } from "@/services/api";
import * as d3 from "d3";

const fmt = (v: number) => v.toLocaleString("tr-TR");
const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " TL";
const compact = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}Mn`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}B`;
  return String(Math.round(v));
};
const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (k: string) => {
  const [y, m] = k.split("-");
  return `${Number(m)}.${y.slice(2)}`;
};

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/* ---------- Aylık kazanç grafiği (d3 alan/çizgi) ---------- */
function EarningsChart({ data }: { data: { m: string; v: number }[] }) {
  const W = 660;
  const H = 250;
  const pad = { l: 48, r: 14, t: 20, b: 30 };
  const x = d3.scalePoint<string>().domain(data.map((d) => d.m)).range([pad.l, W - pad.r]);
  const max = d3.max(data, (d) => d.v) ?? 1;
  const y = d3.scaleLinear().domain([0, max * 1.15]).range([H - pad.b, pad.t]);
  const line = d3
    .line<{ m: string; v: number }>()
    .x((d) => x(d.m) ?? 0)
    .y((d) => y(d.v))
    .curve(d3.curveMonotoneX);
  const area = d3
    .area<{ m: string; v: number }>()
    .x((d) => x(d.m) ?? 0)
    .y0(H - pad.b)
    .y1((d) => y(d.v))
    .curve(d3.curveMonotoneX);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E7D32" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2E7D32" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {y.ticks(4).map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#EDEDED" strokeDasharray="3 3" />
          <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="#9AA0A6">
            {compact(t)}
          </text>
        </g>
      ))}
      <path d={area(data) ?? ""} fill="url(#earnGrad)" />
      <path d={line(data) ?? ""} fill="none" stroke="#2E7D32" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d) => (
        <g key={d.m}>
          <circle cx={x(d.m) ?? 0} cy={y(d.v)} r={4.5} fill="#fff" stroke="#2E7D32" strokeWidth={2.5} />
          {d.v > 0 && (
            <text x={x(d.m) ?? 0} y={y(d.v) - 9} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#2E7D32">
              {compact(d.v)}
            </text>
          )}
          <text x={x(d.m) ?? 0} y={H - pad.b + 17} textAnchor="middle" fontSize={10.5} fill="#6B7280">
            {monthLabel(d.m)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ---------- CV & PV grafiği (d3 gruplu çubuk) ---------- */
function PVCVChart({ data }: { data: { m: string; pv: number; cv: number }[] }) {
  const W = 660;
  const H = 250;
  const pad = { l: 48, r: 14, t: 20, b: 30 };
  const x = d3
    .scaleBand<string>()
    .domain(data.map((d) => d.m))
    .range([pad.l, W - pad.r])
    .paddingInner(0.45)
    .paddingOuter(0.12);
  const x1 = d3.scaleBand<string>().domain(["pv", "cv"]).range([0, x.bandwidth()]).padding(0.12);
  const max = d3.max(data, (d) => Math.max(d.pv, d.cv)) ?? 1;
  const y = d3.scaleLinear().domain([0, max * 1.15]).range([H - pad.b, pad.t]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {y.ticks(4).map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#EDEDED" strokeDasharray="3 3" />
          <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="#9AA0A6">
            {compact(t)}
          </text>
        </g>
      ))}
      {data.map((d) => (
        <g key={d.m}>
          <rect x={(x(d.m) ?? 0) + (x1("pv") ?? 0)} y={y(d.pv)} width={x1.bandwidth()} height={H - pad.b - y(d.pv)} rx={4} fill="#1565C0" />
          <rect x={(x(d.m) ?? 0) + (x1("cv") ?? 0)} y={y(d.cv)} width={x1.bandwidth()} height={H - pad.b - y(d.cv)} rx={4} fill="#8A2BE2" />
          <text x={x(d.m) ?? 0} y={H - pad.b + 17} textAnchor="middle" fontSize={10.5} fill="#6B7280">
            {monthLabel(d.m)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ---------- Kıyaslama kartı (bu ay vs geçen ay) ---------- */
function CompareCard({
  title,
  icon,
  now,
  prev,
  unit,
}: {
  title: string;
  icon: React.ReactNode;
  now: number;
  prev: number;
  unit?: string;
}) {
  const delta = prev > 0 ? ((now - prev) / prev) * 100 : now > 0 ? 100 : 0;
  const up = delta >= 0;
  return (
    <Card sx={{ height: "100%", borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: up ? "success.main" : "error.main",
              color: "#fff",
            }}
          >
            {icon}
          </Box>
          <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 900, color: "primary.dark" }}>
          {fmt(now)}
          {unit && <Box component="span" sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary" }}> {unit}</Box>}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          Geçen ay: {fmt(prev)}
          {unit ? ` ${unit}` : ""}
        </Typography>
        <Chip
          size="small"
          icon={up ? <TrendingUpRoundedIcon /> : <TrendingDownRoundedIcon />}
          label={`${up ? "+" : ""}${delta.toFixed(0)}%`}
          color={up ? "success" : "error"}
          variant="filled"
          sx={{ mt: 1, fontWeight: 800 }}
        />
      </CardContent>
    </Card>
  );
}

/* ---------- Kariyer grafiği (kilometre taşları) ---------- */
function CareerTimeline({ ranks, career }: { ranks: Rank[]; career: CareerProgress[] }) {
  const achieved = new Map(career.map((c) => [c.rank_id, c]));
  const activeID = career.find((c) => c.is_active)?.rank_id ?? null;
  const cards = [
    { id: "g0", name: "Girişimci", achieved: true, active: activeID == null, next: false },
    ...ranks.map((r, i) => ({
      id: r.id,
      name: r.name,
      achieved: achieved.has(r.id),
      active: r.id === activeID,
      next: !achieved.has(r.id) && (i === 0 || achieved.has(ranks[i - 1].id)),
    })),
  ];
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, overflowX: "auto", py: 1, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
      {cards.map((c, i) => (
        <Box key={c.id} sx={{ display: "flex", alignItems: "flex-start", minWidth: 0 }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: 86 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: c.active ? "primary.main" : c.achieved ? "success.main" : "secondary.light",
                color: c.active || c.achieved ? "#fff" : "text.disabled",
                border: c.next ? "2.5px solid" : "none",
                borderColor: "primary.main",
              }}
            >
              {c.achieved ? (
                <CheckCircleRoundedIcon sx={{ fontSize: 22 }} />
              ) : c.active ? (
                <EmojiEventsRoundedIcon sx={{ fontSize: 20 }} />
              ) : (
                <LockRoundedIcon sx={{ fontSize: 18 }} />
              )}
            </Box>
            <Typography
              variant="caption"
              sx={{
                mt: 0.5,
                fontSize: 9.5,
                fontWeight: 800,
                textAlign: "center",
                lineHeight: 1.1,
                color: c.active ? "primary.main" : c.achieved ? "success.dark" : c.next ? "primary.main" : "text.secondary",
              }}
            >
              {c.name === "Girişimci" ? "GİRİŞİMCİ" : c.name.toLocaleUpperCase("tr-TR")}
            </Typography>
            {achieved.get(Number(c.id)) && (
              <Typography variant="caption" sx={{ fontSize: 8.5, color: "text.secondary", mt: 0.25 }}>
                {new Date(achieved.get(Number(c.id))!.achieved_at).toLocaleDateString("tr-TR")}
              </Typography>
            )}
          </Box>
          {i < cards.length - 1 && (
            <Box
              sx={{
                width: 14,
                height: 2.5,
                borderRadius: 2,
                mt: 2.6,
                bgcolor: (cards[i + 1].achieved || cards[i + 1].active) ? "success.main" : "divider",
                flexShrink: 0,
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}

function ReportContent() {
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<Record<string, number>>({});
  const [pvByMonth, setPvByMonth] = useState<Record<string, number>>({});
  const [cvByMonth, setCvByMonth] = useState<Record<string, number>>({});
  const [career, setCareer] = useState<CareerProgress[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<{ commissions: Commission[]; total: number }>("/commissions", {
        params: { limit: 1000, offset: 0 },
      }),
      listBinaryTransactions({ limit: 1000 }),
      listCareer(),
      getRanks(),
    ])
      .then(([cRes, bRes, careerData, rankData]) => {
        if (!active) return;
        const e: Record<string, number> = {};
        cRes.data.commissions.forEach((c) => {
          if (c.status === "paid") {
            const k = monthKey(c.created_at);
            e[k] = (e[k] ?? 0) + c.amount;
          }
        });
        const pv: Record<string, number> = {};
        const cv: Record<string, number> = {};
        bRes.transactions.forEach((t) => {
          if (t.transaction_type === "add") {
            const k = monthKey(t.created_at);
            pv[k] = (pv[k] ?? 0) + t.pv;
            cv[k] = (cv[k] ?? 0) + t.cv;
          }
        });
        setEarnings(e);
        setPvByMonth(pv);
        setCvByMonth(cv);
        setCareer(careerData);
        setRanks(rankData);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const months = useMemo(() => lastMonths(6), []);
  const earnSeries = useMemo(
    () => months.map((m) => ({ m, v: earnings[m] ?? 0 })),
    [months, earnings],
  );
  const pvcvSeries = useMemo(
    () => months.map((m) => ({ m, pv: pvByMonth[m] ?? 0, cv: cvByMonth[m] ?? 0 })),
    [months, pvByMonth, cvByMonth],
  );
  const cmp = useMemo(() => {
    const cur = months[months.length - 1];
    const prev = months[months.length - 2];
    return {
      earn: { now: earnings[cur] ?? 0, prev: earnings[prev] ?? 0 },
      pv: { now: pvByMonth[cur] ?? 0, prev: pvByMonth[prev] ?? 0 },
      cv: { now: cvByMonth[cur] ?? 0, prev: cvByMonth[prev] ?? 0 },
    };
  }, [months, earnings, pvByMonth, cvByMonth]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Button component={Link} href="/profile" startIcon={<ArrowBackRoundedIcon />} size="small" sx={{ mb: 1 }}>
        Profilime Dön
      </Button>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "primary.main",
            color: "#fff",
            boxShadow: 3,
          }}
        >
          <EmojiEventsRoundedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "primary.dark" }}>
            Başarı Raporu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.name} · {user?.member_code}
          </Typography>
        </Box>
      </Box>

      {/* Geçen aya göre kıyaslama */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CompareCard title="AYLIK KAZANÇ" icon={<TrendingUpRoundedIcon />} now={cmp.earn.now} prev={cmp.earn.prev} unit="TL" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CompareCard title="TOPLAM PV" icon={<DiamondRoundedIcon />} now={cmp.pv.now} prev={cmp.pv.prev} unit="PV" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <CompareCard title="TOPLAM CV" icon={<DiamondRoundedIcon />} now={cmp.cv.now} prev={cmp.cv.prev} unit="CV" />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ borderRadius: "20px", border: "1px solid", borderColor: "divider", height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                📈 Aylık Kazanç Grafiği
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Son 6 ay · ödenmiş komisyonlar (referans + binary + matching)
              </Typography>
              <EarningsChart data={earnSeries} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ borderRadius: "20px", border: "1px solid", borderColor: "divider", height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                📊 CV & PV Grafiği
              </Typography>
              <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: "4px", bgcolor: "#1565C0" }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>PV</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: "4px", bgcolor: "#8A2BE2" }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>CV</Typography>
                </Box>
              </Box>
              <PVCVChart data={pvcvSeries} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                🏆 Kariyer Grafiği
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                Kazandığınız rütbeler ve tarihleri
              </Typography>
              <CareerTimeline ranks={ranks} career={career} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default function SuccessReportPage() {
  return (
    <RequireAuth>
      <ReportContent />
    </RequireAuth>
  );
}
