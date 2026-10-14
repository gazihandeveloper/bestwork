"use client";

// ============================================
// ÜYE PRİM İSTATİSTİĞİ — ödenen primler,
// ödeme sayısı, prim alan üye sayısı ve en
// çok prim alan üyeler. Dönemler: Saatlik → 20 Yıllık.
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
import {
  getStatsSummary,
  getStatsLeaders,
  getErrorMessage,
  type StatsSummaryData,
  type StatsLeaderRow,
} from "@/lib/api";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function PrimIstatistikleriPage() {
  const s = useStats("aylik");
  const dark = useDarkMode();
  const [summary, setSummary] = useState<StatsSummaryData | null>(null);
  const [earners, setEarners] = useState<StatsLeaderRow[]>([]);
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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getStatsLeaders("earners", s.info.from, s.info.to, 10);
        if (alive) setEarners(list);
      } catch (e) {
        if (alive) setSideError(getErrorMessage(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [s.info.from, s.info.to]);

  const primCur = s.alignCur("commission");
  const primPrev = s.alignPrev("commission");
  const odemeCur = s.alignCur("commission_count");
  const alanCur = s.alignCur("commission_members");

  const primToplam = s.sumCur("commission");
  const primOnceki = s.sumPrev("commission");
  const odemeToplam = s.sumCur("commission_count");
  const odemeOnceki = s.sumPrev("commission_count");
  const alanToplam = s.sumCur("commission_members");
  const alanOnceki = s.sumPrev("commission_members");
  const ortPrim = alanToplam > 0 ? primToplam / alanToplam : 0;
  const ortPrimOnceki = alanOnceki > 0 ? primOnceki / alanOnceki : 0;

  const primChart = makeOptions(dark, s.info.cats, {
    colors: ["#f59e0b", "#94a3b8"],
    stroke: { curve: "smooth", width: [3, 2], dashArray: [0, 6] },
    fill: { type: "solid", opacity: 1 },
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 3 } },
    yaxis: { labels: { formatter: (v: number) => nf(v) } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
    tooltip: { y: { formatter: (v: number) => money(v) } },
  });

  const odemeChart = makeOptions(dark, s.info.cats, {
    colors: ["#7a5af8", "#12b76a"],
    stroke: { curve: "smooth", width: [0, 3] },
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 3 } },
    yaxis: [
      { labels: { formatter: (v: number) => nf(v) } },
      { opposite: true, labels: { formatter: (v: number) => `${nf(v)} kişi` } },
    ],
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
    tooltip: { y: { formatter: (v: number, { seriesIndex }: { seriesIndex: number }) => (seriesIndex === 0 ? `${nf(v)} ödeme` : `${nf(v)} üye`) } },
  });

  return (
    <div>
      <AdminHeader
        title="Üye Prim İstatistiği"
        subtitle="Ödenen primler, ödeme sayısı ve prim alan üyeler — saatlikten 20 yıllığa kadar."
      />

      {s.error && <AdminAlert kind="error">{s.error}</AdminAlert>}
      {sideError && <AdminAlert kind="error">{sideError}</AdminAlert>}

      <AdminCard title="Dönem Seçimi" subtitle="Granülerlik ve dönem belirleyin">
        <StatsPeriodPicker s={s} />
      </AdminCard>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Tüm Zamanlar Prim" value={money(summary?.total_commission)} sub="toplam ödenen" color="#f59e0b" />
        <KpiCard
          label={`Prim (${s.info.label})`}
          value={money(primToplam)}
          sub={`önceki: ${money(primOnceki)}`}
          trend={pctChange(primToplam, primOnceki)}
          color="#f59e0b"
        />
        <KpiCard
          label={`Ödeme Sayısı (${s.info.label})`}
          value={nf(odemeToplam)}
          sub={`önceki: ${nf(odemeOnceki)}`}
          trend={pctChange(odemeToplam, odemeOnceki)}
          color="#7a5af8"
        />
        <KpiCard
          label={`Prim Alan Üye (${s.info.label})`}
          value={nf(alanToplam)}
          sub={`önceki: ${nf(alanOnceki)}`}
          trend={pctChange(alanToplam, alanOnceki)}
          color="#12b76a"
        />
        <KpiCard
          label="Üye Başı Ort. Prim"
          value={money(ortPrim)}
          sub={`önceki: ${money(ortPrimOnceki)}`}
          trend={pctChange(ortPrim, ortPrimOnceki)}
          color="#06aeds"
        />
      </div>

      <div className="mt-4">
        <AdminCard
          title={`Ödenen Prim — ${s.info.label}`}
          subtitle={`Seçilen dönem vs ${s.info.prevLabel} (kesikli çizgi)`}
        >
          {s.loading ? (
            <AdminSpinner label="Veriler yükleniyor…" />
          ) : (
            <ApexChart
              options={primChart}
              series={[
                { name: s.info.label, type: "bar", data: primCur },
                { name: s.info.prevLabel, type: "line", data: primPrev },
              ]}
              type="line"
              height={340}
            />
          )}
        </AdminCard>
      </div>

      <div className="mt-4">
        <AdminCard
          title={`Ödemeler ve Prim Alan Üyeler — ${s.info.label}`}
          subtitle="Bar: ödeme sayısı · Çizgi: prim alan üye sayısı"
        >
          {s.loading ? (
            <AdminSpinner label="Veriler yükleniyor…" />
          ) : (
            <ApexChart
              options={odemeChart}
              series={[
                { name: "Ödeme Sayısı", type: "bar", data: odemeCur },
                { name: "Prim Alan Üye", type: "line", data: alanCur },
              ]}
              type="line"
              height={300}
            />
          )}
        </AdminCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AdminCard title="Dönem Detayları" subtitle="Her kovanın primi, ödemesi ve alan üyesi">
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Dönem</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Prim</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Ödeme</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Alan Üye</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Ort. Prim</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Değişim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {s.info.cats.map((cat, i) => {
                    const t = slotTrends(primCur, primPrev)[i];
                    const ort = alanCur[i] > 0 ? primCur[i] / alanCur[i] : 0;
                    return (
                      <tr key={cat} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-white/90">{cat}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-800 dark:text-white/90">{money(primCur[i])}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{nf(odemeCur[i])}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{nf(alanCur[i])}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{ort > 0 ? money(ort) : "—"}</td>
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

        <AdminCard title="En Çok Prim Alan Üyeler" subtitle={`${s.info.label} dönemi`}>
          {earners.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">#</th>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Üye</th>
                    <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Prim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {earners.map((l, i) => (
                    <tr key={l.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 font-bold text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-white/90">{l.name || `#${l.id}`}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">{money(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">Bu dönemde prim ödemesi yok.</p>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
