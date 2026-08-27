"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Lock,
  Star,
  Trophy,
  Pentagon,
  Circle,
  Hexagon,
  Diamond,
  Square,
  User,
  Loader2,
} from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { listCareer, getRanks, getErrorMessage } from "@/services/api";
import type { CareerProgress, Rank } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("tr-TR");

// Girişimci dışındaki seviyeler İngilizce gösterilir
const RANK_DISPLAY: Record<string, string> = {
  safir: "Sapphire",
  zümrüt: "Emerald",
};

// Stitch panelindeki gibi her rütbeye özel ikon + renk (+ elmas yıldızları)
function rankMeta(name: string): { icon: typeof Diamond; color: string; stars: number } {
  const n = name.toLocaleLowerCase("tr-TR");
  const map: Record<string, { icon: typeof Diamond; color: string; stars: number }> = {
    jade: { icon: Pentagon, color: "#2e7d32", stars: 0 },
    pearl: { icon: Circle, color: "#9e9e9e", stars: 0 },
    safir: { icon: Hexagon, color: "#1565c0", stars: 0 },
    ruby: { icon: Diamond, color: "#c62828", stars: 0 },
    zümrüt: { icon: Square, color: "#43a047", stars: 0 },
    diamond: { icon: Diamond, color: "#90caf9", stars: 0 },
    "blue diamond": { icon: Diamond, color: "#1e88e5", stars: 0 },
    "green diamond": { icon: Diamond, color: "#43a047", stars: 0 },
    "red diamond": { icon: Diamond, color: "#e53935", stars: 0 },
    "black diamond": { icon: Diamond, color: "#212121", stars: 0 },
    president: { icon: Diamond, color: "#ffd700", stars: 2 },
    ambassador: { icon: Diamond, color: "#ffd700", stars: 3 },
  };
  return map[n] ?? { icon: Diamond, color: "#90caf9", stars: 0 };
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
      <div className="flex justify-center py-10">
        <Loader2 className="text-primary size-10 animate-spin" />
      </div>
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

  const rankCards = [
    // Başlangıç seviyesi: GİRİŞİMCİ
    {
      id: "girisimci",
      name: "Girişimci",
      isActive: activeID == null,
      isAchieved: true,
      isNext: false,
      meta: { icon: User, color: "#004786", stars: 0 },
    },
    ...steps.map((s) => ({
      id: s.rank.id,
      name: RANK_DISPLAY[s.rank.name.toLocaleLowerCase("tr-TR")] ?? s.rank.name,
      isActive: s.isActive,
      isAchieved: s.isAchieved,
      isNext: s.next,
      meta: rankMeta(s.rank.name),
    })),
  ];

  return (
    <div className="py-3">
      <h1 className="text-primary-dark mb-1 text-2xl font-extrabold">Kariyer Takibi</h1>
      <p className="text-muted-foreground mb-3 text-sm">
        Rütbeler hat PV toplamlarına göre kazanılır ve kalıcıdır — adım adım ilerleyin.
      </p>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mb-2 rounded border px-3 py-2 text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && ranks.length === 0 && (
        <div className="border-border bg-card rounded border p-4">
          <p className="text-muted-foreground text-sm">Rütbe tanımları bulunamadı.</p>
        </div>
      )}

      {/* Kariyer seviyeleri — yatay kaydırılabilir rütbe kartları */}
      <div className="border-border bg-card mb-4 rounded border p-2.5">
        <div className="mb-2 flex items-center gap-1">
          <Trophy className="text-primary size-4" />
          <p className="text-muted-foreground text-[11px] font-extrabold tracking-[1.5px] uppercase">
            Kariyer Seviyeleri
          </p>
          <div className="flex-1" />
          <p className="text-muted-foreground text-xs font-bold">
            {currentStep ? `Sıradaki: ${currentStep.rank.name}` : "Tümü kazanıldı 🎉"}
          </p>
        </div>
        <div className="flex gap-1 overflow-x-auto py-1 md:gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rankCards.map((c) => {
            const Icon = c.meta.icon;
            return (
              <div
                key={c.id}
                className={cn(
                  "flex h-[100px] min-w-[120px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.75 rounded border-[1.5px] transition-transform duration-200 hover:-translate-y-[3px] md:min-w-[56px]",
                  c.isActive
                    ? "border-primary bg-primary shadow-md"
                    : c.isNext
                      ? "border-primary bg-primary/10 shadow-md"
                      : c.isAchieved
                        ? "border-[#2E7D32] bg-[#2E7D32]/10"
                        : "border-border bg-secondary/5"
                )}
              >
                <div className="relative">
                  <Icon className="size-10 md:size-8" color={c.isActive ? "#fff" : c.meta.color} />
                  {c.isAchieved && (
                    <CheckCircle2 className="bg-background text-[#2E7D32] absolute -top-0.5 -left-[18px] size-[18px] rounded-full" />
                  )}
                  {c.meta.stars > 0 && (
                    <div className="absolute -top-[7px] -right-[12px] flex gap-0.25">
                      {Array.from({ length: c.meta.stars }).map((_, k) => (
                        <Star
                          key={k}
                          className="bg-background text-[#ffd700] size-[13px] rounded-full"
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p
                  className={cn(
                    "px-0.5 text-center text-[11px] leading-snug font-extrabold md:text-[10px]",
                    c.isActive
                      ? "text-white"
                      : c.isAchieved
                        ? "text-[#2E7D32]"
                        : c.isNext
                          ? "text-primary"
                          : "text-muted-foreground"
                  )}
                >
                  {c.name.toLocaleUpperCase("tr-TR")}
                </p>
                {(c.isActive || c.isNext) && (
                  <p
                    className={cn(
                      "text-[9px] font-bold",
                      c.isActive ? "text-white/85" : "text-primary"
                    )}
                  >
                    {c.isActive ? "GÜNCEL" : "SONRAKİ"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rütbe kutuları — satırda 3 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {steps.map((s) => {
          const achievedAt = achievedByRank.get(s.rank.id)?.achieved_at;
          const leftPct = Math.min(100, Math.round((leftPV / s.rank.required_left_pv) * 100));
          const rightPct = Math.min(100, Math.round((rightPV / s.rank.required_right_pv) * 100));
          const pct = Math.round((leftPct + rightPct) / 2);
          const emphasized = s.isAchieved || s.next;

          return (
            <div
              key={s.rank.id}
              className={cn(
                "border-border bg-card relative flex h-full flex-col overflow-hidden rounded border-2 p-2.5 transition-transform duration-250",
                s.isAchieved
                  ? "border-amber-500"
                  : s.next
                    ? "border-primary bg-secondary/15"
                    : "opacity-75",
                emphasized && "hover:-translate-y-1 hover:shadow-md"
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded",
                    s.isAchieved
                      ? "bg-amber-500 text-white"
                      : s.next
                        ? "bg-primary text-white"
                        : "bg-secondary-light text-muted-foreground/50"
                  )}
                >
                  {s.isAchieved ? (
                    <CheckCircle2 className="size-[26px]" />
                  ) : s.next ? (
                    <Star className="size-6" />
                  ) : (
                    <Lock className="size-[22px]" />
                  )}
                </div>
                <div className="flex gap-0.5">
                  {s.isActive && (
                    <Badge className="border-[#2E7D32]/50 text-[#2E7D32] gap-1 font-bold">
                      <Trophy className="size-3.5" />
                      Güncel Rütbeniz
                    </Badge>
                  )}
                  {s.next && (
                    <Badge className="gap-1 font-bold">
                      <Star className="size-3.5" />
                      Sonraki
                    </Badge>
                  )}
                </div>
              </div>

              <h3 className="text-primary-dark text-lg font-extrabold">{s.rank.name}</h3>

              <p className="text-muted-foreground mt-0.5 text-sm">
                Sol {fmt(s.rank.required_left_pv)} PV · Sağ {fmt(s.rank.required_right_pv)} PV
              </p>

              {achievedAt ? (
                <p className="text-amber-600 mt-0.5 text-xs font-bold">
                  Kazanıldı: {new Date(achievedAt).toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              ) : (
                <p className="text-muted-foreground/60 mt-0.5 text-xs font-semibold">
                  {s.next ? "Yaklaşıyorsunuz..." : "Kilitli"}
                </p>
              )}

              <div className="mt-auto pt-1.5">
                <div className="bg-secondary-light h-2 w-full overflow-hidden rounded">
                  <div
                    className={cn(
                      "h-full rounded transition-[width] duration-300",
                      s.isAchieved ? "bg-amber-500" : s.next ? "bg-primary" : "bg-border"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-muted-foreground mt-0.5 flex justify-between text-xs">
                  <span>Sol: %{leftPct}</span>
                  <span>Sağ: %{rightPct}</span>
                </div>
              </div>

              {/* Geçilen seviyeler: blur + ortada yuvarlak tik */}
              {s.isAchieved && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/45 backdrop-blur-[2.5px]">
                  <div className="bg-amber-500 flex size-[60px] items-center justify-center rounded-full text-white shadow-md">
                    <CheckCircle2 className="size-[38px]" />
                  </div>
                  <p className="text-amber-600 text-xs font-extrabold">GEÇİLDİ</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CareerPage() {
  return (
    <RequireAuth>
      <CareerContent />
    </RequireAuth>
  );
}
