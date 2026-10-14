"use client";

// ============================================
// ŞİRKET KÂRLILIK İSTATİSTİĞİ — ciro, ödenen
// prim ve net kâr (ciro − prim) + kâr marjı.
// Dönemler: Saatlik → 20 Yıllık.
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
  money,
  pctChange,
} from "@/components/admin/StatsUI";
import { getStatsSummary, getErrorMessage, type StatsSummaryData } from "@/lib/api";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const karlilikYuzde = (ciro: number, prim: number) =>
  ciro > 0 ? Math.round(((ciro - prim) / ciro) * 1000) / 10 : 0;

export default function KarlilikPage() {
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

  const ciroCur = s.alignCur("revenue");
  const primCur = s.alignCur("commission");
  const netCur = ciroCur.map((v, i) => Math.round((v - primCur[i]) * 100) / 100);
  const marjCur = ciroCur.map((v, i) => karlilikYuzde(v, primCur[i]));

  const ciroToplam = s.sumCur("revenue");
  const ciroOnceki = s.sumPrev("revenue");
  const primToplam = s.sumCur("commission");
  const primOnceki = s.sumPrev("commission");
  const netToplam = ciroToplam - primToplam;
  const netOnceki = ciroOnceki - primOnceki;

  const anaChart = makeOptions(dark, s.info.cats, {
    colors: ["#ef4444", "#f59e0b", "#12b76a"],
    stroke: { curve: "smooth", width: [0, 0, 3] },
    plotOptions: { bar: { columnWidth: "40%", borderRadius: 3 } },
    yaxis: { labels: { formatter: (v: number) => nf(v) } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
    tooltip: { y: { formatter: (v: number) => money(v) } },
  });

  const marjChart = makeOptions(dark, s.info.cats, {
    colors: ["#06aeds"],
    stroke: { curve: "smooth", width: 3 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0.03 } },
    yaxis: { labels: { formatter: (v: number) => `${nf(v)}%` } },
    tooltip: { y: { formatter: (v: number) => `${nf(v)}%` } },
  });

  return (
    <div>
      <AdminHeader
        title="Şirket Kârlılık İstatistiği"
        subtitle="Ciro, ödenen primler ve net kâr (ciro − prim) — kâr marjıyla birlikte."
      />

      {s.error && <AdminAlert kind="error">{s.error}</AdminAlert>}
      {sideError && <AdminAlert kind="error">{sideError}</AdminAlert>}

      <AdminCard title="Dönem Seçimi" subtitle="Granülerlik ve dönem belirleyin">
        <StatsPeriodPicker s={s} />
      </AdminCard>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label={`Ciro (${s.info.label})`}
          value={money(ciroToplam)}
          sub={`önceki: ${money(ciroOnceki)}`}
          trend={pctChange(ciroToplam, ciroOnceki)}
          color="#ef4444"
        />
        <KpiCard
          label={`Ödenen Prim (${s.info.label})`}
          value={money(primToplam)}
          sub={`önceki: ${money(primOnceki)}`}
          trend={pctChange(primToplam, primOnceki)}
          color="#f59e0b"
        />
        <KpiCard
          label={`Net Kâr (${s.info.label})`}
          value={money(netToplam)}
          sub={`önceki: ${money(netOnceki)}`}
          trend={pctChange(netToplam, netOnceki)}
          color="#12b76a"
        />
        <KpiCard
          label="Kâr Marjı"
          value={`${nf(karlilikYuzde(ciroToplam, primToplam))}%`}
          sub={`önceki: ${nf(karlilikYuzde(ciroOnceki, primOnceki))}%`}
          trend={pctChange(karlilikYuzde(ciroToplam, primToplam), karlilikYuzde(ciroOnceki, primOnceki))}
          color="#06aeds"
        />
        <KpiCard
          label="Tüm Zamanlar"
          value={money((summary?.total_revenue ?? 0) - (summary?.total_commission ?? 0))}
          sub={`ciro ${money(summary?.total_revenue)} − prim ${money(summary?.total_commission)}`}
          color="#7a5af8"
        />
      </div>

      <div className="mt-4">
        <AdminCard
          title={`Ciro · Prim · Net Kâr — ${s.info.label}`}
          subtitle="Kırmızı bar: ciro · Sarı bar: ödenen prim · Yeşil çizgi: net kâr"
        >
          {s.loading ? (
            <AdminSpinner label="Veriler yükleniyor…" />
          ) : (
            <ApexChart
              options={anaChart}
              series={[
                { name: "Ciro", type: "bar", data: ciroCur },
                { name: "Ödenen Prim", type: "bar", data: primCur },
                { name: "Net Kâr", type: "line", data: netCur },
              ]}
              type="line"
              height={340}
            />
          )}
        </AdminCard>
      </div>

      <div className="mt-4">
        <AdminCard title={`Kâr Marjı % — ${s.info.label}`} subtitle="Net kârın ciroya oranı">
          {s.loading ? (
            <AdminSpinner label="Veriler yükleniyor…" />
          ) : (
            <ApexChart options={marjChart} series={[{ name: "Kâr Marjı %", data: marjCur }]} type="area" height={300} />
          )}
        </AdminCard>
      </div>

      <div className="mt-4">
        <AdminCard title="Dönem Detayları" subtitle="Her kovanın ciro, prim, net kâr ve marjı">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Dönem</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Ciro</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Ödenen Prim</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Net Kâr</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Marj</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Net Kâr Değişim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {(() => {
                  const ciroPrev = s.alignPrev("revenue");
                  const primPrev = s.alignPrev("commission");
                  const netPrev = ciroPrev.map((v, i) => v - primPrev[i]);
                  return s.info.cats.map((cat, i) => {
                    const t = slotTrends(netCur, netPrev)[i];
                    return (
                      <tr key={cat} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-white/90">{cat}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{money(ciroCur[i])}</td>
                        <td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400">{money(primCur[i])}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-800 dark:text-white/90">{money(netCur[i])}</td>
                        <td className="px-4 py-2.5 text-right text-sky-600 dark:text-sky-400">{marjCur[i] > 0 ? `${nf(marjCur[i])}%` : "—"}</td>
                        <td className="px-4 py-2.5 text-right">
                          {t === null ? <span className="text-xs text-gray-400">—</span> : <TrendPill pct={t} />}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
