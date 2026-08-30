"use client";

import { useEffect, useRef } from "react";
import type { RevenuePoint, RankDist } from "@/lib/api";

declare global {
  interface Window {
    ApexCharts?: {
      new (el: Element, opts: unknown): { render: () => void; destroy?: () => void };
    };
  }
}

type Variant = "comparison" | "growth" | "career";

// Tek grafik çizer (variant'a göre). Her kart kendi grafiğini üretir.
export default function DashboardCharts({
  variant,
  period,
  revenue,
  commissions,
  growth,
  rankDist,
}: {
  variant: Variant;
  period?: string;
  revenue?: RevenuePoint[];
  commissions?: RevenuePoint[];
  growth?: { date: string; count: number }[];
  rankDist?: RankDist[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<{ render: () => void; destroy?: () => void } | null>(null);

  useEffect(() => {
    const el = ref.current;
    const A = window.ApexCharts;
    if (!el || !A) return;

    chartRef.current?.destroy?.();
    chartRef.current = null;

    let options: unknown = null;
    if (variant === "comparison") {
      const rev = revenue ?? [];
      const com = commissions ?? [];
      if (rev.length === 0 && com.length === 0) return;
      const cats = Array.from(new Set([...rev, ...com].map((p) => p.date))).sort();
      const fmt = (pts: RevenuePoint[]) => cats.map((d) => pts.find((p) => p.date === d)?.revenue ?? 0);
      options = {
        series: [
          { name: "Ciro (TL)", data: fmt(rev) },
          { name: "Komisyon (TL)", data: fmt(com) },
        ],
        chart: { height: 280, type: "area", toolbar: { show: false } },
        colors: ["#2e7d32", "#4B49AC"],
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 2.5 },
        fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0.04 } },
        legend: { position: "top" },
        xaxis: { categories: cats, labels: { style: { fontSize: "10px" } } },
        yaxis: { labels: { formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)) } },
        tooltip: { y: { formatter: (v: number) => v.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL" } },
      };
    } else if (variant === "growth") {
      const g = growth ?? [];
      if (g.length === 0) return;
      options = {
        series: [{ name: "Yeni Üye", data: g.map((x) => x.count) }],
        chart: { height: 220, type: "area", toolbar: { show: false } },
        colors: ["#20c997"],
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 2 },
        fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
        xaxis: { categories: g.map((x) => x.date.slice(5)), labels: { style: { fontSize: "10px" } } },
      };
    } else if (variant === "career") {
      const rd = rankDist ?? [];
      if (rd.length === 0) return;
      options = {
        series: rd.map((r) => r.count),
        chart: { type: "donut", height: 240 },
        labels: rd.map((r) => r.rank_name),
        legend: { position: "bottom" },
        tooltip: { y: { formatter: (v: number) => `${v} üye` } },
      };
    }

    if (!options) return;
    const chart = new A(el, options);
    chart.render();
    chartRef.current = chart;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, period, revenue, commissions, growth, rankDist]);

  useEffect(
    () => () => {
      chartRef.current?.destroy?.();
    },
    []
  );

  return <div ref={ref} id={`chart-${variant}`} />;
}
