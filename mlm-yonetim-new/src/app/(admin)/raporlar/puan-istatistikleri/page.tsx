"use client";

// ============================================
// PUAN İSTATİSTİKLERİ — PV ve CV puanları
// AYRI grafiklerde. Dönemler: Saatlik → 20 Yıllık.
// ============================================

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  AdminHeader,
  AdminCard,
  AdminAlert,
  AdminSpinner,
} from "@/components/admin/AdminUI";
import {
  useStats,
  StatsPeriodPicker,
  KpiCard,
  TrendPill,
  makeOptions,
  useDarkMode,
  slotTrends,
  nf,
  pctChange,
} from "@/components/admin/StatsUI";
import { getStatsSummary, getErrorMessage, type StatsSummaryData } from "@/lib/api";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function PuanIstatistikleriPage() {
  const s = useStats("aylik");
  const dark = useDarkMode();
  const [summary, setSummary] = useState<StatsSummaryData | null>(null);
  const [sideError, setSideError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sum = await getStatsSummary();
        if (alive) setSummary(sum);
      } catch (e) {
        if (alive) setSideError(getErrorMessage(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const pvCur = s.alignCur("pv");
  const pvPrev = s.alignPrev("pv");
  const cvCur = s.alignCur("cv");
  const cvPrev = s.alignPrev("cv");

  const pvToplam = s.sumCur("pv");
  const pvOnceki = s.sumPrev("pv");
  const cvToplam = s.sumCur("cv");
  const cvOnceki = s.sumPrev("cv");

  const pvChart = makeOptions(dark, s.info.cats, {
    colors: ["#8b5cf6", "#94a3b8"],
    stroke: { curve: "smooth", width: [3, 2], dashArray: [0, 6] },
    fill: { type: "solid", opacity: 1 },
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 3 } },
    yaxis: { labels: { formatter: (v: number) => nf(v) } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
    tooltip: { y: { formatter: (v: number) => `${nf(v)} PV` } },
  });

  const cvChart = makeOptions(dark, s.info.cats, {
    colors: ["#3bb77e", "#94a3b8"],
    stroke: { curve: "smooth", width: [3, 2], dashArray: [0, 6] },
    fill: { type: "solid", opacity: 1 },
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 3 } },
    yaxis: { labels: { formatter: (v: number) => nf(v) } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
    tooltip: { y: { formatter: (v: number) => `${nf(v)} CV` } },
  });

  return (
    <div>
      <AdminHeader
        title="PV ve CV İstatistikleri"
      />

      {s.error && <AdminAlert kind="error">{s.error}</AdminAlert>}
      {sideError && <AdminAlert kind="error">{sideError}</AdminAlert>}

      <AdminCard title="Dönem Seçimi" subtitle="Granülerlik ve dönem belirleyin">
        <StatsPeriodPicker s={s} />
      </AdminCard>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Tüm Zamanlar PV" value={nf(summary?.total_pv)} sub="toplam puan" color="#8b5cf6" />
        <KpiCard label="Tüm Zamanlar CV" value={nf(summary?.total_cv)} sub="toplam puan" color="#3bb77e" />
        <KpiCard
          label={`PV (${s.info.label})`}
          value={nf(pvToplam)}
          sub={`önceki: ${nf(pvOnceki)}`}
          trend={pctChange(pvToplam, pvOnceki)}
          color="#8b5cf6"
        />
        <KpiCard
          label={`CV (${s.info.label})`}
          value={nf(cvToplam)}
          sub={`önceki: ${nf(cvOnceki)}`}
          trend={pctChange(cvToplam, cvOnceki)}
          color="#3bb77e"
        />
        <KpiCard
          label="PV / CV Oranı"
          value={cvToplam > 0 ? `${nf(Math.round((pvToplam / cvToplam) * 100) / 100)}` : "—"}
          sub="dönem PV'sinin CV'ye oranı"
          color="#06aeds"
        />
      </div>

      {/* PV — ayrı grafik */}
      <div className="mt-4">
        <AdminCard
          title={`🟣 PV Puanları — ${s.info.label}`}
          subtitle={`Seçilen dönem vs ${s.info.prevLabel} (kesikli çizgi)`}
        >
          {s.loading ? (
            <AdminSpinner label="Veriler yükleniyor…" />
          ) : (
            <ApexChart
              options={pvChart}
              series={[
                { name: `PV (${s.info.label})`, type: "bar", data: pvCur },
                { name: `PV (${s.info.prevLabel})`, type: "line", data: pvPrev },
              ]}
              type="line"
              height={320}
            />
          )}
        </AdminCard>
      </div>

      {/* CV — ayrı grafik */}
      <div className="mt-4">
        <AdminCard
          title={`🟢 CV Puanları — ${s.info.label}`}
          subtitle={`Seçilen dönem vs ${s.info.prevLabel} (kesikli çizgi)`}
        >
          {s.loading ? (
            <AdminSpinner label="Veriler yükleniyor…" />
          ) : (
            <ApexChart
              options={cvChart}
              series={[
                { name: `CV (${s.info.label})`, type: "bar", data: cvCur },
                { name: `CV (${s.info.prevLabel})`, type: "line", data: cvPrev },
              ]}
              type="line"
              height={320}
            />
          )}
        </AdminCard>
      </div>

      <div className="mt-4">
        <AdminCard title="Dönem Detayları" subtitle="Her kovanın PV ve CV puanları">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Dönem</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">PV</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">PV Değişim</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">CV</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">CV Değişim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {s.info.cats.map((cat, i) => {
                  const tp = slotTrends(pvCur, pvPrev)[i];
                  const tc = slotTrends(cvCur, cvPrev)[i];
                  return (
                    <tr key={cat} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-white/90">{cat}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-purple-600 dark:text-purple-400">{nf(pvCur[i])}</td>
                      <td className="px-4 py-2.5 text-right">
                        {tp === null ? <span className="text-xs text-gray-400">—</span> : <TrendPill pct={tp} />}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{nf(cvCur[i])}</td>
                      <td className="px-4 py-2.5 text-right">
                        {tc === null ? <span className="text-xs text-gray-400">—</span> : <TrendPill pct={tc} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
