"use client";

// ============================================
// ÜYE İSTATİSTİKLERİ — yeni kayıtlar, aktif/
// pasif üye, büyüme ve en çok üye getirenler.
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
  pctChange,
} from "@/components/admin/StatsUI";
import {
  getStatsSummary,
  getStatsSeries,
  getStatsLeaders,
  getErrorMessage,
  type StatsSummaryData,
  type StatsLeaderRow,
} from "@/lib/api";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function UyeIstatistikleriPage() {
  const s = useStats("aylik");
  const dark = useDarkMode();

  const [summary, setSummary] = useState<StatsSummaryData | null>(null);
  const [growth, setGrowth] = useState<{ year: string; total: number }[]>([]);
  const [sponsors, setSponsors] = useState<StatsLeaderRow[]>([]);
  const [sideError, setSideError] = useState("");

  // Özet + tüm yılların büyüme verisi (bir kez)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [sum, yearly] = await Promise.all([
          getStatsSummary(),
          getStatsSeries("year", "2006-01-01", `${new Date().getFullYear()}-12-31`),
        ]);
        if (!alive) return;
        setSummary(sum);
        let run = 0;
        setGrowth(
          yearly
            .filter((r) => r.new_members > 0)
            .map((r) => ({ year: r.date.slice(0, 4), total: (run += r.new_members) }))
        );
      } catch (e) {
        if (alive) setSideError(getErrorMessage(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // En çok üye getirenler (dönem bazlı)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getStatsLeaders("sponsors", s.info.from, s.info.to, 10);
        if (alive) setSponsors(list);
      } catch (e) {
        if (alive) setSideError(getErrorMessage(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [s.info.from, s.info.to]);

  const yeniCur = s.alignCur("new_members");
  const yeniPrev = s.alignPrev("new_members");
  const aktifCur = s.alignCur("active_members");
  let run = 0;
  const kumulatif = yeniCur.map((v) => (run += v));

  const yeniChart = makeOptions(dark, s.info.cats, {
    colors: ["#465fff", "#94a3b8"],
    stroke: { curve: "smooth", width: [3, 2], dashArray: [0, 6] },
    fill: { type: "solid", opacity: 1 },
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 3 } },
    yaxis: { labels: { formatter: (v: number) => nf(v) } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
    tooltip: { y: { formatter: (v: number) => `${nf(v)} kişi` } },
  });

  const growthChart = makeOptions(dark, growth.map((g) => g.year), {
    colors: ["#12b76a", "#465fff"],
    stroke: { curve: "smooth", width: [3, 0] },
    fill: { type: "solid", opacity: 1 },
    plotOptions: { bar: { columnWidth: "50%", borderRadius: 3 } },
    yaxis: { labels: { formatter: (v: number) => nf(v) } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "11px" },
    tooltip: { y: { formatter: (v: number) => `${nf(v)} üye` } },
  });

  const durumChart = summary
    ? makeOptions(dark, ["Aktif", "Pasif"], {
        labels: ["Aktif", "Pasif"],
        colors: ["#12b76a", "#f04438"],
        stroke: { width: 0 },
        legend: { position: "bottom", fontSize: "12px" },
        plotOptions: {
          pie: { donut: { size: "68%", labels: { show: true, total: { show: true, label: "Toplam" } } } },
        },
        dataLabels: { enabled: true, formatter: (v: number) => `${nf(v)}%` },
      })
    : null;

  const yeniToplam = s.sumCur("new_members");
  const yeniOnceki = s.sumPrev("new_members");
  const aktifToplam = s.sumCur("active_members");
  const aktifOnceki = s.sumPrev("active_members");

  return (
    <div>
      <AdminHeader
        title="Üye İstatistikleri"
        subtitle="Yeni kayıtlar, aktif/pasif üye durumları ve büyüme — saatlikten 20 yıllığa kadar."
      />

      {s.error && <AdminAlert kind="error">{s.error}</AdminAlert>}
      {sideError && <AdminAlert kind="error">{sideError}</AdminAlert>}

      <AdminCard title="Dönem Seçimi" subtitle="Granülerlik ve dönem belirleyin">
        <StatsPeriodPicker s={s} />
      </AdminCard>

      {/* KPI kartları */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Toplam Üye" value={nf(summary?.total_members)} sub="tüm zamanlar" color="#465fff" />
        <KpiCard label="Aktif Üye" value={nf(summary?.active_members)} sub="üyelik durumu aktif" color="#12b76a" />
        <KpiCard label="Pasif Üye" value={nf(summary?.passive_members)} sub="üyelik durumu pasif" color="#f04438" />
        <KpiCard
          label={`Yeni Kayıt (${s.info.label})`}
          value={nf(yeniToplam)}
          sub={`önceki: ${nf(yeniOnceki)}`}
          trend={pctChange(yeniToplam, yeniOnceki)}
          color="#8b5cf6"
        />
        <KpiCard
          label={`İşlem Yapan Üye (${s.info.label})`}
          value={nf(aktifToplam)}
          sub={`önceki: ${nf(aktifOnceki)}`}
          trend={pctChange(aktifToplam, aktifOnceki)}
          color="#f59e0b"
        />
        <KpiCard
          label="Bugün Yeni"
          value={nf(summary?.new_today)}
          sub={`bu ay: ${nf(summary?.new_this_month)} · bu yıl: ${nf(summary?.new_this_year)}`}
          color="#06aeds"
        />
      </div>

      {/* Ana grafikler */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AdminCard
            title={`Yeni Kayıtlar — ${s.info.label}`}
            subtitle={`Seçilen dönem vs ${s.info.prevLabel} (kesikli çizgi)`}
          >
            {s.loading ? (
              <AdminSpinner label="Veriler yükleniyor…" />
            ) : (
              <ApexChart
                options={yeniChart}
                series={[
                  { name: s.info.label, type: "bar", data: yeniCur },
                  { name: s.info.prevLabel, type: "line", data: yeniPrev },
                ]}
                type="line"
                height={330}
              />
            )}
          </AdminCard>
        </div>
        <AdminCard title="Üye Durumu" subtitle="Aktif / pasif dağılımı (bugün)">
          {summary && durumChart ? (
            <ApexChart
              options={durumChart}
              series={[summary.active_members, summary.passive_members]}
              type="donut"
              height={330}
            />
          ) : (
            <AdminSpinner label="Yükleniyor…" />
          )}
        </AdminCard>
      </div>

      <div className="mt-4">
        <AdminCard
          title="Üye Büyümesi (Tüm Yıllar)"
          subtitle="Kümülatif üye sayısı ve yıllık yeni kayıtlar"
        >
          {growth.length > 0 ? (
            <ApexChart
              options={growthChart}
              series={[
                { name: "Toplam Üye", type: "line", data: growth.map((g) => g.total) },
                {
                  name: "Yeni Kayıt",
                  type: "bar",
                  data: growth.map((g, i, arr) => (i === 0 ? g.total : g.total - arr[i - 1].total)),
                },
              ]}
              type="line"
              height={320}
            />
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">Kayıt verisi yok.</p>
          )}
        </AdminCard>
      </div>

      {/* Tablo + liderler */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AdminCard title="Dönem Detayları" subtitle="Her kovanın yeni kayıt, işlem yapan üye ve kümülatif üye sayısı">
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Dönem</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Yeni Kayıt</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">İşlem Yapan</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Toplam Üye</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Değişim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {s.info.cats.map((cat, i) => {
                    const t = slotTrends(yeniCur, yeniPrev)[i];
                    return (
                      <tr key={cat} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-white/90">{cat}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-gray-800 dark:text-white/90">{nf(yeniCur[i])}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{nf(aktifCur[i])}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{nf(kumulatif[i])}</td>
                        <td className="px-4 py-2.5 text-right">
                          {t === null ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            <TrendPill pct={t} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>

        <AdminCard
          title="En Çok Üye Getirenler"
          subtitle={`${s.info.label} döneminde getirdiği yeni kayıtlar`}
        >
          {sponsors.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">#</th>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Üye</th>
                    <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-400">Kayıt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {sponsors.map((l, i) => (
                    <tr key={l.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 font-bold text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-white/90">{l.name || `#${l.id}`}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-brand-600 dark:text-brand-400">{nf(l.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">Bu dönemde kayıt yok.</p>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
