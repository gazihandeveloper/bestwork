"use client";

// ============================================
// Karşılaştırma Sayfası — PV / CV / Komisyon / Genel Ciro / Şirket Kârlılığı
// Modlar: Gün Bazında (ay içi) · Ay Bazında (yıl içi) · Yıllık (10 yıl) · 20 Yıllık
// Her modda dönemler karşılaştırılır: ▲/▼ yön, fark ve yüzde değişim.
// ============================================

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import {
  AdminHeader,
  AdminCard,
  AdminAlert,
  AdminSpinner,
} from "@/components/admin/AdminUI";
import {
  getActivitySeriesRange,
  getErrorMessage,
  type ActivityPoint,
} from "@/lib/api";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const KISA_AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

type Mode = "gun" | "ay" | "yil" | "y20";
type MetricKey = "pv" | "cv" | "commission" | "revenue" | "profit";

const METRICS: { key: MetricKey; label: string; color: string; money?: boolean }[] = [
  { key: "pv", label: "PV", color: "#8b5cf6" },
  { key: "cv", label: "CV", color: "#3bb77e" },
  { key: "commission", label: "Komisyon", color: "#f59e0b", money: true },
  { key: "revenue", label: "Genel Ciro", color: "#ef4444", money: true },
  { key: "profit", label: "Şirket Kârlılığı", color: "#0ea5e9", money: true },
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();
const nf = (v?: number) =>
  (Number(v) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
const fmtVal = (v: number, money?: boolean) => (money ? nf(v) + " ₺" : nf(v));

function sumOf(rows: ActivityPoint[], key: MetricKey): number {
  return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
}

function pctChange(cur: number, prev: number): number {
  if (prev <= 0) return 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function Trend({ pct }: { pct: number }) {
  const up = pct > 0.0001;
  const down = pct < -0.0001;
  return (
    <span className={`font-bold ${up ? "text-emerald-600 dark:text-emerald-400" : down ? "text-red-500 dark:text-red-400" : "text-gray-400"}`}>
      {up ? "▲" : down ? "▼" : "•"} {up ? "+" : ""}
      {nf(pct)}%
    </span>
  );
}

/** Satırları gün indeksine göre hizalar (1..days) — eksik günler 0. */
function byDay(rows: ActivityPoint[], key: MetricKey, days: number): number[] {
  const arr = Array(days).fill(0);
  for (const r of rows) {
    const d = Number(r.date.slice(8, 10));
    if (d >= 1 && d <= days) arr[d - 1] = Number(r[key]) || 0;
  }
  return arr;
}

/** Satırları ay indeksine göre hizalar (1..12). */
function byMonth(rows: ActivityPoint[], key: MetricKey): number[] {
  const arr = Array(12).fill(0);
  for (const r of rows) {
    const m = Number(r.date.slice(5, 7));
    if (m >= 1 && m <= 12) arr[m - 1] = Number(r[key]) || 0;
  }
  return arr;
}

export default function KarsilastirmaPage() {
  const now = new Date();
  const [mode, setMode] = useState<Mode>("gun");
  const [metric, setMetric] = useState<MetricKey>("revenue");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sel, setSel] = useState<ActivityPoint[]>([]);
  const [prev, setPrev] = useState<ActivityPoint[]>([]);
  const [lastYear, setLastYear] = useState<ActivityPoint[]>([]);
  const [years, setYears] = useState<ActivityPoint[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const jobs: Promise<ActivityPoint[]>[] = [];
        if (mode === "gun") {
          const pm = month === 1 ? 12 : month - 1;
          const py = month === 1 ? year - 1 : year;
          jobs.push(getActivitySeriesRange("day", iso(year, month, 1), iso(year, month, lastDay(year, month))));
          jobs.push(getActivitySeriesRange("day", iso(py, pm, 1), iso(py, pm, lastDay(py, pm))));
          jobs.push(getActivitySeriesRange("day", iso(year - 1, month, 1), iso(year - 1, month, lastDay(year - 1, month))));
        } else if (mode === "ay") {
          jobs.push(getActivitySeriesRange("month", iso(year, 1, 1), iso(year, 12, 31)));
          jobs.push(getActivitySeriesRange("month", iso(year - 1, 1, 1), iso(year - 1, 12, 31)));
        } else {
          const span = mode === "y20" ? 20 : 10;
          jobs.push(getActivitySeriesRange("year", iso(year - span + 1, 1, 1), iso(year, 12, 31)));
        }
        const res = await Promise.all(jobs);
        if (!alive) return;
        if (mode === "gun") {
          setSel(res[0]);
          setPrev(res[1]);
          setLastYear(res[2]);
        } else if (mode === "ay") {
          setSel(res[0]);
          setPrev(res[1]);
          setLastYear([]);
        } else {
          setYears(res[0]);
          setSel([]);
          setPrev([]);
          setLastYear([]);
        }
      } catch (e) {
        if (alive) setError(getErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, year, month]);

  const metricMeta = METRICS.find((m) => m.key === metric)!;

  // ── Grafik verisi ──
  const chart = useMemo(() => {
    const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const mColor = metricMeta.color;
    let series: { name: string; data: number[] }[] = [];
    let categories: string[] = [];
    let type: "line" | "bar" = "line";
    let colors: string[] = [mColor];

    if (mode === "gun") {
      const days = lastDay(year, month);
      categories = Array.from({ length: days }, (_, i) => String(i + 1));
      series = [
        { name: `${KISA_AY[month - 1]} ${year}`, data: byDay(sel, metric, days) },
        { name: "Geçen Ay", data: byDay(prev, metric, days) },
        { name: "Geçen Yıl Aynı Ay", data: byDay(lastYear, metric, days) },
      ];
      colors = [mColor, "#94a3b8", "#f59e0b"];
    } else if (mode === "ay") {
      categories = KISA_AY;
      type = "bar";
      series = [
        { name: String(year), data: byMonth(sel, metric) },
        { name: String(year - 1), data: byMonth(prev, metric) },
      ];
      colors = [mColor, "#cbd5e1"];
    } else {
      const list = [...years].sort((a, b) => a.date.localeCompare(b.date));
      categories = list.map((r) => r.date.slice(0, 4));
      type = "bar";
      series = [{ name: metricMeta.label, data: list.map((r) => Number(r[metric]) || 0) }];
      colors = [mColor];
    }

    const options: ApexOptions = {
      chart: {
        type,
        toolbar: { show: false },
        fontFamily: "inherit",
        foreColor: dark ? "#94a3b8" : "#64748b",
        animations: { enabled: true, speed: 400 },
      },
      theme: { mode: dark ? "dark" : "light" },
      colors,
      stroke: { curve: "smooth", width: mode === "gun" ? [3, 2, 2] : 1, dashArray: mode === "gun" ? [0, 6, 6] : 0 },
      fill: { type: mode === "gun" ? "gradient" : "solid", gradient: { opacityFrom: 0.25, opacityTo: 0.03 } },
      plotOptions: { bar: { columnWidth: mode === "ay" ? "55%" : "45%", borderRadius: 3 } },
      dataLabels: { enabled: false },
      grid: { borderColor: dark ? "#1f2a37" : "#eef2f6", strokeDashArray: 4 },
      xaxis: {
        categories,
        labels: { rotate: mode === "gun" ? -35 : 0, style: { fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { formatter: (v: number) => nf(v) } },
      legend: { position: "top", horizontalAlign: "right", markers: { size: 5 }, fontSize: "11px" },
      tooltip: { y: { formatter: (v: number) => fmtVal(v, metricMeta.money) } },
    };
    return { options, series };
  }, [mode, metric, year, month, sel, prev, lastYear, years, metricMeta]);

  const modeButtons: { key: Mode; label: string }[] = [
    { key: "gun", label: "Gün Bazında" },
    { key: "ay", label: "Ay Bazında" },
    { key: "yil", label: "Yıllık (10 Yıl)" },
    { key: "y20", label: "20 Yıllık" },
  ];

  const selLabel =
    mode === "gun"
      ? `${KISA_AY[month - 1]} ${year}`
      : mode === "ay"
        ? String(year)
        : `${year - (mode === "y20" ? 19 : 9)} – ${year}`;
  const prevLabel =
    mode === "gun"
      ? `Geçen Ay (${KISA_AY[(month === 1 ? 12 : month - 1) - 1]} ${month === 1 ? year - 1 : year})`
      : mode === "ay"
        ? String(year - 1)
        : "—";

  // Tablo: yıl listesi (yil/y20) ya da 4 metrik karşılaştırması (gun/ay)
  const yearRows = useMemo(() => {
    const list = [...years].sort((a, b) => a.date.localeCompare(b.date));
    return list.map((r, i) => {
      const prevRow = i > 0 ? list[i - 1] : null;
      const cur = Number(r[metric]) || 0;
      const pv = prevRow ? Number(prevRow[metric]) || 0 : 0;
      return { date: r.date, row: r, change: prevRow ? pctChange(cur, pv) : 0 };
    });
  }, [years, metric]);

  return (
    <div>
      <AdminHeader
        title="Karşılaştırma"
        subtitle="Dönemleri karşılaştırın — gün gün, ay ay, yıl yıl; 20 yıla kadar. ▲/▼ yön ve yüzde değişim."
      />

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <AdminCard title="Karşılaştırma Ayarları" subtitle="Mod, metrik ve dönem seçin">
        <div className="space-y-3">
          {/* Mod */}
          <div className="flex flex-wrap items-center gap-1.5">
            {modeButtons.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  mode === m.key
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Metrik */}
          <div className="flex flex-wrap items-center gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetric(m.key)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                  metric === m.key
                    ? "border-transparent text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
                }`}
                style={metric === m.key ? { backgroundColor: m.color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: metric === m.key ? "#fff" : m.color }} />
                {m.label}
              </button>
            ))}
          </div>

          {/* Dönem */}
          <div className="flex flex-wrap items-center gap-2">
            {mode === "gun" && (
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Ay:
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
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
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {Array.from({ length: 21 }, (_, i) => now.getFullYear() + 1 - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </AdminCard>

      <div className="mt-4">
        <AdminCard
          title={
            mode === "gun" || mode === "ay"
              ? `${metricMeta.label} — ${selLabel} vs ${prevLabel}`
              : `${metricMeta.label} — Yıl Bazında (${selLabel})`
          }
          subtitle={
            mode === "gun"
              ? "Gün gün karşılaştırma: seçilen ay · geçen ay · geçen yıl aynı ay"
              : mode === "ay"
                ? "Ay ay karşılaştırma: bu yıl vs geçen yıl"
                : "Yıl yıl toplamlar"
          }
        >
          {loading ? (
            <AdminSpinner label="Veriler yükleniyor…" />
          ) : mode !== "gun" && mode !== "ay" && years.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Bu aralık için veri yok.</p>
          ) : (
            <ApexChart options={chart.options} series={chart.series} type={mode === "gun" ? "line" : "bar"} height={360} />
          )}
        </AdminCard>
      </div>

      {/* Tablo */}
      <div className="mt-4">
        <AdminCard title="Karşılaştırma Tablosu" subtitle="Fark ve yüzde değişim (▲ yükseliş · ▼ düşüş)">
          {mode === "gun" || mode === "ay" ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Metrik</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">{selLabel}</th>
                    {mode === "gun" && (
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Geçen Yıl Aynı Ay</th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">{mode === "gun" ? "Geçen Ay" : String(year - 1)}</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Fark</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Değişim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {METRICS.map((m) => {
                    const cur = sumOf(sel, m.key);
                    const before = sumOf(prev, m.key);
                    const ly = sumOf(lastYear, m.key);
                    const diff = cur - before;
                    return (
                      <tr key={m.key} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800 dark:text-white/90">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                            {m.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white/90">{fmtVal(cur, m.money)}</td>
                        {mode === "gun" && (
                          <td className="px-4 py-3 text-right text-gray-500">{fmtVal(ly, m.money)}</td>
                        )}
                        <td className="px-4 py-3 text-right text-gray-500">{fmtVal(before, m.money)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-500" : "text-gray-400"}`}>
                          {diff > 0 ? "+" : ""}
                          {fmtVal(diff, m.money)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Trend pct={pctChange(cur, before)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Yıl</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">PV</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">CV</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Komisyon</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Genel Ciro</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Şirket Kârlılığı</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">{metricMeta.label} Değişim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {yearRows.map(({ date, row, change }) => (
                    <tr key={date} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-bold text-gray-800 dark:text-white/90">{date.slice(0, 4)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{nf(row.pv)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{nf(row.cv)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{nf(row.commission)} ₺</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-white/90">{nf(row.revenue)} ₺</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-white/90">{nf(row.profit)} ₺</td>
                      <td className="px-4 py-3 text-right">
                        <Trend pct={change} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
