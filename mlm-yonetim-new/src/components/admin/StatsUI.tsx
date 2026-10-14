"use client";

// ============================================
// İSTATİSTİK SAYFALARI — ortak bileşenler
// Üye / Ciro / Karlılık / Prim / Puan sayfaları
// bu bileşenleri paylaşır: dönem seçici, veri
// hook'u, KPI kartı, trend rozeti, grafik ve
// hizalama yardımcıları.
// ============================================

import { useEffect, useMemo, useState } from "react";
import type { ApexOptions } from "apexcharts";
import {
  getStatsSeries,
  getErrorMessage,
  type StatsBucket,
  type StatsPoint,
} from "@/lib/api";

export const KISA_AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();

export const nf = (v?: number) =>
  (Number(v) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
export const money = (v?: number) => nf(v) + " ₺";

export function pctChange(cur: number, prev: number): number {
  if (prev <= 0) return 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

// ── Dönem modları ─────────────────────────────────────────────────────

export type StatsMode = "saatlik" | "gunluk" | "haftalik" | "aylik" | "yillik" | "y20";

export const STATS_MODES: { key: StatsMode; label: string }[] = [
  { key: "saatlik", label: "Saatlik" },
  { key: "gunluk", label: "Günlük" },
  { key: "haftalik", label: "Haftalık" },
  { key: "aylik", label: "Aylık" },
  { key: "yillik", label: "Yıllık" },
  { key: "y20", label: "20 Yıllık" },
];

const MODE_BUCKET: Record<StatsMode, StatsBucket> = {
  saatlik: "hour",
  gunluk: "day",
  haftalik: "week",
  aylik: "month",
  yillik: "year",
  y20: "year",
};

export interface StatsRangeInfo {
  bucket: StatsBucket;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  label: string;
  prevLabel: string;
  cats: string[];
}

/** Mod + yıl/ay/gün seçimine göre aralıkları ve kategori etiketlerini üretir. */
export function statsRanges(mode: StatsMode, year: number, month: number, day: number): StatsRangeInfo {
  const bucket = MODE_BUCKET[mode];
  let from = "";
  let to = "";
  let prevFrom = "";
  let prevTo = "";
  let label = "";
  let prevLabel = "";
  let cats: string[] = [];

  switch (mode) {
    case "saatlik": {
      from = iso(year, month, day);
      to = from;
      const p = new Date(Date.UTC(year, month - 1, day) - 864e5);
      prevFrom = `${p.getUTCFullYear()}-${pad(p.getUTCMonth() + 1)}-${pad(p.getUTCDate())}`;
      prevTo = prevFrom;
      label = `${day} ${KISA_AY[month - 1]} ${year}`;
      prevLabel = `${p.getUTCDate()} ${KISA_AY[p.getUTCMonth()]} ${p.getUTCFullYear()}`;
      cats = Array.from({ length: 24 }, (_, i) => `${pad(i)}:00`);
      break;
    }
    case "gunluk": {
      const pm = month === 1 ? 12 : month - 1;
      const py = month === 1 ? year - 1 : year;
      from = iso(year, month, 1);
      to = iso(year, month, lastDay(year, month));
      prevFrom = iso(py, pm, 1);
      prevTo = iso(py, pm, lastDay(py, pm));
      label = `${KISA_AY[month - 1]} ${year}`;
      prevLabel = `${KISA_AY[pm - 1]} ${py}`;
      cats = Array.from({ length: lastDay(year, month) }, (_, i) => String(i + 1));
      break;
    }
    case "haftalik": {
      from = iso(year, 1, 1);
      to = iso(year, 12, 31);
      prevFrom = iso(year - 1, 1, 1);
      prevTo = iso(year - 1, 12, 31);
      label = String(year);
      prevLabel = String(year - 1);
      cats = weekLabels(year);
      break;
    }
    case "aylik": {
      from = iso(year, 1, 1);
      to = iso(year, 12, 31);
      prevFrom = iso(year - 1, 1, 1);
      prevTo = iso(year - 1, 12, 31);
      label = String(year);
      prevLabel = String(year - 1);
      cats = KISA_AY;
      break;
    }
    case "yillik":
    case "y20": {
      const span = mode === "y20" ? 20 : 10;
      from = iso(year - span + 1, 1, 1);
      to = iso(year, 12, 31);
      prevFrom = iso(year - 2 * span + 1, 1, 1);
      prevTo = iso(year - span, 12, 31);
      label = `${year - span + 1} – ${year}`;
      prevLabel = `${year - 2 * span + 1} – ${year - span}`;
      cats = Array.from({ length: span }, (_, i) => String(year - span + 1 + i));
      break;
    }
  }
  return { bucket, from, to, prevFrom, prevTo, label, prevLabel, cats };
}

/** Bir yılın Pazartesi günlerini etiket olarak üretir (haftalık mod). */
function weekLabels(year: number): string[] {
  const jan = new Date(Date.UTC(year, 0, 1));
  const dow = (jan.getUTCDay() + 6) % 7;
  let t = Date.UTC(year, 0, 1 - dow);
  const end = Date.UTC(year, 11, 31);
  const cats: string[] = [];
  while (t <= end) {
    const d = new Date(t);
    cats.push(`${d.getUTCDate()} ${KISA_AY[d.getUTCMonth()]}`);
    t += 7 * 864e5;
  }
  return cats;
}

/** Seriyi kategori yuvalarına hizalar (eksik yuvalar 0). */
export function alignStats(
  rows: StatsPoint[],
  field: keyof StatsPoint,
  mode: StatsMode,
  cats: string[],
  year: number
): number[] {
  const arr = Array(cats.length).fill(0);
  const bucket = MODE_BUCKET[mode];
  for (const r of rows) {
    const d = r.date;
    let idx = -1;
    if (bucket === "hour") idx = Number(d.slice(11, 13));
    else if (bucket === "day") idx = Number(d.slice(8, 10)) - 1;
    else if (bucket === "month") idx = Number(d.slice(5, 7)) - 1;
    else if (bucket === "year") idx = Number(d.slice(0, 4)) - (year - cats.length + 1);
    else if (bucket === "week") {
      const t = Date.parse(d + "T00:00:00Z");
      const jan = new Date(Date.UTC(year, 0, 1));
      const dow = (jan.getUTCDay() + 6) % 7;
      const firstMon = Date.UTC(year, 0, 1 - dow);
      idx = Math.floor((t - firstMon) / (7 * 864e5));
    }
    if (idx >= 0 && idx < cats.length) {
      arr[idx] += Number(r[field]) || 0;
    }
  }
  return arr;
}

// ── Veri hook'u ───────────────────────────────────────────────────────

export function useStats(initialMode: StatsMode = "aylik") {
  const now = new Date();
  const [mode, setMode] = useState<StatsMode>(initialMode);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const [cur, setCur] = useState<StatsPoint[]>([]);
  const [prev, setPrev] = useState<StatsPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const info = useMemo(
    () => statsRanges(mode, year, month, day),
    [mode, year, month, day]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [a, b] = await Promise.all([
          getStatsSeries(info.bucket, info.from, info.to),
          getStatsSeries(info.bucket, info.prevFrom, info.prevTo),
        ]);
        if (!alive) return;
        setCur(a);
        setPrev(b);
      } catch (e) {
        if (alive) setError(getErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [info]);

  const sum = (rows: StatsPoint[], field: keyof StatsPoint) =>
    rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
  const sumCur = (field: keyof StatsPoint) => sum(cur, field);
  const sumPrev = (field: keyof StatsPoint) => sum(prev, field);
  const alignCur = (field: keyof StatsPoint) => alignStats(cur, field, mode, info.cats, year);
  const alignPrev = (field: keyof StatsPoint) => alignStats(prev, field, mode, info.cats, year);

  return {
    mode, setMode, year, setYear, month, setMonth, day, setDay,
    info, cur, prev, loading, error,
    sumCur, sumPrev, alignCur, alignPrev,
  };
}

export type StatsHook = ReturnType<typeof useStats>;

// ── Dönem seçici ──────────────────────────────────────────────────────

export function StatsPeriodPicker({ s }: { s: StatsHook }) {
  const yearOptions = Array.from({ length: 21 }, (_, i) => s.year + 10 - i).filter(
    (y) => y <= new Date().getFullYear() + 1
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {STATS_MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => s.setMode(m.key)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              s.mode === m.key
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {s.mode === "saatlik" && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
            Gün:
            <select
              value={s.day}
              onChange={(e) => s.setDay(Number(e.target.value))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {Array.from({ length: lastDay(s.year, s.month) }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
        {(s.mode === "saatlik" || s.mode === "gunluk") && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
            Ay:
            <select
              value={s.month}
              onChange={(e) => s.setMonth(Number(e.target.value))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {KISA_AY.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
          Yıl:
          <select
            value={s.year}
            onChange={(e) => s.setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <span className="ml-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          {s.info.label}
          <span className="ml-1.5 font-medium text-gray-400 dark:text-gray-500">
            (önceki: {s.info.prevLabel})
          </span>
        </span>
      </div>
    </div>
  );
}

// ── Kartlar ve rozetler ───────────────────────────────────────────────

export function TrendPill({ pct }: { pct: number }) {
  const up = pct > 0.0001;
  const down = pct < -0.0001;
  if (!up && !down) {
    return <span className="text-[11px] font-semibold text-gray-400">— sabit</span>;
  }
  return (
    <span
      className={`text-[11px] font-bold ${
        up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
      }`}
    >
      {up ? "▲" : "▼"} {up ? "+" : ""}
      {nf(pct)}%
    </span>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  trend,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#1E293B]">
      <div className="flex items-center gap-2">
        {color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {label}
        </p>
      </div>
      <p className="mt-2 truncate text-xl font-extrabold text-gray-800 dark:text-white" title={value}>
        {value}
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        {sub ? <span className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</span> : <span />}
        {trend !== undefined && <TrendPill pct={trend} />}
      </div>
    </div>
  );
}

// ── Grafik yardımcıları ───────────────────────────────────────────────

export function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  return dark;
}

export function makeOptions(
  dark: boolean,
  categories: string[],
  extra: Partial<ApexOptions>
): ApexOptions {
  return {
    chart: {
      toolbar: { show: false },
      fontFamily: "inherit",
      foreColor: dark ? "#94a3b8" : "#64748b",
      animations: { enabled: true, speed: 400 },
    },
    theme: { mode: dark ? "dark" : "light" },
    dataLabels: { enabled: false },
    grid: { borderColor: dark ? "#1f2a37" : "#eef2f6", strokeDashArray: 4 },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "10px" }, rotate: -35 },
    },
    ...extra,
  };
}

/** Tablo için yuva bazlı değişim yüzdesi (null = karşılaştırma yok). */
export function slotTrends(cur: number[], prev: number[]): (number | null)[] {
  return cur.map((v, i) => (prev[i] > 0 ? pctChange(v, prev[i]) : null));
}
