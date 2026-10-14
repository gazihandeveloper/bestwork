"use client";

// ============================================
// CİRO İSTATİSTİKLERİ — sipariş bazlı genel
// ciro, sipariş sayısı ve ortalama sepet.
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

export default function CiroIstatistikleriPage() {
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
  const ciroPrev = s.alignPrev("revenue");
  const siparisCur = s.alignCur("orders");
  const sepetCur = ciroCur.map((v, i) => (siparisCur[i] > 0 ? Math.round((v / siparisCur[i]) * 100) / 100 : 0));

  const ciroToplam = s.sumCur("revenue");
  const ciroOnceki = s.sumPrev("revenue");
  const siparisToplam = s.sumCur("orders");
  const siparisOnceki = s.sumPrev("orders");
  const sepetToplam = siparisToplam > 0 ? ciroToplam / siparisToplam : 0;
  const sepetOnceki = siparisOnceki > 0 ? ciroOnceki / siparisOnceki : 0;

  const ciroChart = makeOptions(dark, s.info.cats, {
    colors: ["#ef4444", "#94a3b8"],
    stroke: { curve: "smooth", width: [3, 2], dashArray: [0, 6] },
    fill: { type: "solid", opacity: 1 },
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 3 } },
    yaxis: { labels: { formatter: (v: number) => nf(v) } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
    tooltip: { y: { formatter: (v: number) => money(v) } },
  });

  const siparisChart = makeOptions(dark, s.info.cats, {
    colors: ["#465fff", "#12b76a"],
    stroke: { curve: "smooth", width: [0, 3] },
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 3 } },
    yaxis: [
      { labels: { formatter: (v: number) => nf(v) } },
      {
        opposite: true,
        labels: { formatter: (v: number) => money(v) },
      },
    ],
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
    tooltip: { y: { formatter: (v: number, { seriesIndex }: { seriesIndex: number }) => (seriesIndex === 0 ? `${nf(v)} sipariş` : money(v)) } },
  });

  return (
    <div>
      <AdminHeader
        title="Ciro İstatistikleri"
        subtitle="Genel ciro, sipariş sayısı ve ortalama sepet tutarı — saatlikten 20 yıllığa kadar."
      />

      {s.error && <AdminAlert kind="error">{s.error}</AdminAlert>}
      {sideError && <AdminAlert kind="error">{sideError}</AdminAlert>}

      <AdminCard title="Dönem Seçimi" subtitle="Granülerlik ve dönem belirleyin">
        <StatsPeriodPicker s={s} />
      </AdminCard>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Toplam Ciro" value={money(summary?.total_revenue)} sub="tüm zamanlar" color="#ef4444" />
        <KpiCard
          label={`Ciro (${s.info.label})`}
          value={money(ciroToplam)}
          sub={`önceki: ${money(ciroOnceki)}`}
          trend={pctChange(ciroToplam, ciroOnceki)}
          color="#ef4444"
        />
        <KpiCard
          label={`Sipariş (${s.info.label})`}
          value={nf(siparisToplam)}
          sub={`önceki: ${nf(siparisOnceki)}`}
          trend={pctChange(siparisToplam, siparisOnceki)}
          color="#465fff"
        />
        <KpiCard
          label="Ortalama Sepet"
          value={money(sepetToplam)}
          sub={`önceki: ${money(sepetOnceki)}`}
          trend={pctChange(sepetToplam, sepetOnceki)}
          color="#12b76a"
        />
        <KpiCard
          label="Günlük Ort. Ciro"
          value={money(s.info.cats.length > 0 ? ciroToplam / s.info.cats.length : 0)}
          sub={`${nf(s.info.cats.length)} kova ortalaması`}
          color="#f59e0b"
        />
      </div>

      <div className="mt-4">
        <AdminCard
          title={`Genel Ciro — ${s.info.label}`}
          subtitle={`Seçilen dönem vs ${s.info.prevLabel} (kesikli çizgi)`}
        >
          {s.loading ? (
            <AdminSpinner label="Veriler yükleniyor…" />
          ) : (
            <ApexChart
              options={ciroChart}
              series={[
                { name: s.info.label, type: "bar", data: ciroCur },
                { name: s.info.prevLabel, type: "line", data: ciroPrev },
              ]}
              type="line"
              height={340}
            />
          )}
        </AdminCard>
      </div>

      <div className="mt-4">
        <AdminCard
          title={`Sipariş Sayısı ve Ortalama Sepet — ${s.info.label}`}
          subtitle="Bar: sipariş sayısı · Çizgi: ortalama sepet tutarı"
        >
          {s.loading ? (
            <AdminSpinner label="Veriler yükleniyor…" />
          ) : (
            <ApexChart
              options={siparisChart}
              series={[
                { name: "Sipariş", type: "bar", data: siparisCur },
                { name: "Ort. Sepet", type: "line", data: sepetCur },
              ]}
              type="line"
              height={320}
            />
          )}
        </AdminCard>
      </div>

      <div className="mt-4">
        <AdminCard title="Dönem Detayları" subtitle="Her kovanın ciro, sipariş ve sepet tutarı">
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Dönem</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Ciro</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Sipariş</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Ort. Sepet</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Değişim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {s.info.cats.map((cat, i) => {
                  const t = slotTrends(ciroCur, ciroPrev)[i];
                  return (
                    <tr key={cat} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-white/90">{cat}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-800 dark:text-white/90">{money(ciroCur[i])}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{nf(siparisCur[i])}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{sepetCur[i] > 0 ? money(sepetCur[i]) : "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        {t === null ? <span className="text-xs text-gray-400">—</span> : <TrendPill pct={t} />}
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
