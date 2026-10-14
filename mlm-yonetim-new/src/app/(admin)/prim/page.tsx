"use client";

// ============================================
// PRİM — prim/komisyon dağıtımının özet ve
// istatistik görünümü. Dönem serisi (aylık),
// en çok prim alanlar ve tüm zamanlar KPI'ları.
// Yönetim işlemi bu sayfada değildir.
// ============================================

import { useEffect, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  inputCls,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import {
  getStatsSummary,
  getStatsSeries,
  getStatsLeaders,
  getErrorMessage,
  type StatsSummaryData,
  type StatsPoint,
  type StatsLeaderRow,
} from "@/lib/api";

// Para biçimi: "1.234,56 ₺"
const money = (v: number | undefined | null) =>
  (v ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";

// Sayı biçimi: "1.234"
const nf = (v: number | undefined | null) => (v ?? 0).toLocaleString("tr-TR");

// Tarih → "YYYY-MM-DD"
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

// Varsayılan aralık: son 12 ay (aylık kova)
function defaultFrom(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return fmt(d);
}

const AYLAR = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

// "YYYY-MM" / "YYYY-MM-DD" → "Oca 2026"
function donemEtiketi(date: string): string {
  const [y, m] = date.split("-");
  const ay = Number(m);
  return y && ay >= 1 && ay <= 12 ? `${AYLAR[ay - 1]} ${y}` : date;
}

// KPI kartı — AdminCard görsel diliyle uyumlu yerel bileşen
function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-[#1E293B]">
      <div className="flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </p>
      </div>
      <p className="mt-3 text-xl font-bold text-gray-800 dark:text-white/90">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

export default function PrimPage() {
  const [summary, setSummary] = useState<StatsSummaryData | null>(null);
  const [series, setSeries] = useState<StatsPoint[]>([]);
  const [earners, setEarners] = useState<StatsLeaderRow[]>([]);
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(fmt(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");

  const rangeInvalid = from > to;

  // Tüm zamanların özeti (bir kez)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sum = await getStatsSummary();
        if (alive) setSummary(sum);
      } catch (e) {
        if (alive) setSummaryError(getErrorMessage(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Dönem verisi: aylık seri + en çok prim alanlar (aralık değişince)
  useEffect(() => {
    if (!from || !to) return;
    if (from > to) {
      setLoading(false);
      setSeries([]);
      setEarners([]);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [pts, leaders] = await Promise.all([
          getStatsSeries("month", from, to),
          getStatsLeaders("earners", from, to, 10),
        ]);
        if (!alive) return;
        setSeries(pts);
        setEarners(leaders);
        setError("");
      } catch (e) {
        if (alive) setError(getErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [from, to]);

  const primCiroOrani =
    summary && summary.total_revenue > 0
      ? `${(
          (summary.total_commission / summary.total_revenue) *
          100
        ).toLocaleString("tr-TR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}%`
      : "—";

  const toplamPrim = series.reduce((a, p) => a + p.commission, 0);
  const toplamIslem = series.reduce((a, p) => a + p.commission_count, 0);
  const toplamUye = series.reduce((a, p) => a + p.commission_members, 0);
  const toplamPv = series.reduce((a, p) => a + p.pv, 0);
  const toplamCv = series.reduce((a, p) => a + p.cv, 0);

  return (
    <div>
      <AdminHeader
        title="Prim"
        subtitle="Prim/komisyon dağıtımının özeti ve istatistikleri — dönem bazında prim, işlem ve puan hacmi."
      />

      <AdminAlert kind="warning">
        Prim hesaplama ve manuel müdahale Ayarlar/Denetim ekranlarından; bu sayfa
        dağıtım görünümüdür.
      </AdminAlert>

      {summaryError && <AdminAlert kind="error">{summaryError}</AdminAlert>}
      {error && <AdminAlert kind="error">{error}</AdminAlert>}
      {rangeInvalid && (
        <AdminAlert kind="warning">
          Başlangıç tarihi bitiş tarihinden sonra olamaz.
        </AdminAlert>
      )}

      {/* KPI kartları */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Toplam Prim"
          value={money(summary?.total_commission)}
          sub="tüm zamanlar"
          color="#f59e0b"
        />
        <KpiCard
          label="Toplam Ciro"
          value={money(summary?.total_revenue)}
          sub="tüm zamanlar"
          color="#465fff"
        />
        <KpiCard
          label="Prim / Ciro Oranı"
          value={primCiroOrani}
          sub="dağıtılan primin ciroya oranı"
          color="#7a5af8"
        />
        <KpiCard
          label="Toplam PV"
          value={nf(summary?.total_pv)}
          sub="puan değeri"
          color="#12b76a"
        />
        <KpiCard
          label="Toplam CV"
          value={nf(summary?.total_cv)}
          sub="karşılık değeri"
          color="#06aeds"
        />
      </div>

      {/* Dönem seçimi */}
      <div className="mt-4">
        <AdminCard
          title="Dönem Seçimi"
          subtitle="Aylık granülerlik ile tarih aralığı belirleyin"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-xl">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Başlangıç
              </label>
              <input
                type="date"
                className={inputCls}
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bitiş
              </label>
              <input
                type="date"
                className={inputCls}
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Seri tablosu + liderler */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AdminCard
            title="Dönem Prim Serisi"
            subtitle={`${from} → ${to} · aylık kova`}
            actions={<AdminBadge color="amber">Aylık</AdminBadge>}
          >
            {loading ? (
              <AdminSpinner label="Veriler yükleniyor…" />
            ) : series.length === 0 ? (
              <AdminEmpty>Bu dönemde prim dağıtımı yok.</AdminEmpty>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th className={thCls}>Tarih</th>
                      <th className={`${thCls} text-right`}>Prim Tutarı</th>
                      <th className={`${thCls} text-right`}>Prim İşlem Sayısı</th>
                      <th className={`${thCls} text-right`}>Prim Alan Üye</th>
                      <th className={`${thCls} text-right`}>PV</th>
                      <th className={`${thCls} text-right`}>CV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {series.map((p) => (
                      <tr
                        key={p.date}
                        className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                      >
                        <td className={`${tdCls} font-semibold text-gray-800 dark:text-white/90`}>
                          {donemEtiketi(p.date)}
                        </td>
                        <td className={`${tdCls} text-right font-bold text-amber-600 dark:text-amber-400`}>
                          {money(p.commission)}
                        </td>
                        <td className={`${tdCls} text-right text-gray-600 dark:text-gray-300`}>
                          {nf(p.commission_count)}
                        </td>
                        <td className={`${tdCls} text-right text-gray-600 dark:text-gray-300`}>
                          {nf(p.commission_members)}
                        </td>
                        <td className={`${tdCls} text-right text-gray-600 dark:text-gray-300`}>
                          {nf(p.pv)}
                        </td>
                        <td className={`${tdCls} text-right text-gray-600 dark:text-gray-300`}>
                          {nf(p.cv)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <td className={`${tdCls} font-bold text-gray-800 dark:text-white/90`}>
                        Dönem Toplamı
                      </td>
                      <td className={`${tdCls} text-right font-bold text-amber-600 dark:text-amber-400`}>
                        {money(toplamPrim)}
                      </td>
                      <td className={`${tdCls} text-right font-bold text-gray-600 dark:text-gray-300`}>
                        {nf(toplamIslem)}
                      </td>
                      <td className={`${tdCls} text-right font-bold text-gray-600 dark:text-gray-300`}>
                        {nf(toplamUye)}
                      </td>
                      <td className={`${tdCls} text-right font-bold text-gray-600 dark:text-gray-300`}>
                        {nf(toplamPv)}
                      </td>
                      <td className={`${tdCls} text-right font-bold text-gray-600 dark:text-gray-300`}>
                        {nf(toplamCv)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </AdminCard>
        </div>

        <AdminCard
          title="En Çok Prim Alanlar"
          subtitle={`${from} → ${to} dönemi`}
          actions={<AdminBadge color="blue">Top 10</AdminBadge>}
        >
          {loading ? (
            <AdminSpinner label="Veriler yükleniyor…" />
          ) : earners.length === 0 ? (
            <AdminEmpty>Bu dönemde prim alan üye yok.</AdminEmpty>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className={thCls}>Üye</th>
                    <th className={`${thCls} text-right`}>İşlem</th>
                    <th className={`${thCls} text-right`}>Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {earners.map((l) => (
                    <tr
                      key={l.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                    >
                      <td className={`${tdCls} font-semibold text-gray-800 dark:text-white/90`}>
                        {l.name || `#${l.id}`}
                      </td>
                      <td className={`${tdCls} text-right text-gray-600 dark:text-gray-300`}>
                        {nf(l.count)}
                      </td>
                      <td className={`${tdCls} text-right font-bold text-amber-600 dark:text-amber-400`}>
                        {money(l.total)}
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
