"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import {
  listCareerMonthly,
  listCareerEarnings,
  listCareerPvTop,
  listCareerCvTop,
  getErrorMessage,
  formatPV,
  type CareerMonthlyGroup,
  type CareerEarningUser,
  type CareerPvUser,
  type CareerCvUser,
} from "@/lib/api";

const pad = (n: number) => String(n).padStart(2, "0");

const fmtDate = (s: string) => {
  const p = s.split("-");
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : s;
};

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const printTh: CSSProperties = {
  border: "1px solid #999",
  padding: "6px 8px",
  textAlign: "left",
  background: "#eee",
  fontWeight: 700,
};
const printTd: CSSProperties = { border: "1px solid #bbb", padding: "6px 8px" };

export default function AylikKariyerPage() {
  const simdi = new Date();

  const [year, setYear] = useState(simdi.getFullYear());
  const [month, setMonth] = useState(simdi.getMonth() + 1);
  const [view, setView] = useState<"careers" | "top" | "pv" | "cv">("careers");
  const [topN, setTopN] = useState(100);
  const [topYaz, setTopYaz] = useState("100");
  const [filtreAcik, setFiltreAcik] = useState(false);

  const ayStr = `${year}-${pad(month)}`;
  const start = `${ayStr}-01`;
  const end = `${ayStr}-${pad(new Date(year, month, 0).getDate())}`;

  const YIL_SECENEKLERI: number[] = [];
  for (let y = simdi.getFullYear() - 4; y <= simdi.getFullYear() + 1; y++) {
    YIL_SECENEKLERI.push(y);
  }

  const [monthly, setMonthly] = useState<CareerMonthlyGroup[] | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [earnings, setEarnings] = useState<CareerEarningUser[] | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [pvRows, setPvRows] = useState<CareerPvUser[] | null>(null);
  const [pvLoading, setPvLoading] = useState(false);
  const [cvRows, setCvRows] = useState<CareerCvUser[] | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    setMonthlyLoading(true);
    listCareerMonthly(start, end)
      .then(setMonthly)
      .catch(() => setMonthly([]))
      .finally(() => setMonthlyLoading(false));
  }, [start, end]);

  useEffect(() => {
    if (view !== "top") return;
    setEarningsLoading(true);
    listCareerEarnings(start, end, "top", topN)
      .then(setEarnings)
      .catch((e) => {
        setEarnings([]);
        setError(getErrorMessage(e));
      })
      .finally(() => setEarningsLoading(false));
  }, [view, start, end, topN]);

  useEffect(() => {
    if (view !== "pv") return;
    setPvLoading(true);
    listCareerPvTop(start, end, topN)
      .then(setPvRows)
      .catch((e) => {
        setPvRows([]);
        setError(getErrorMessage(e));
      })
      .finally(() => setPvLoading(false));
  }, [view, start, end, topN]);

  useEffect(() => {
    if (view !== "cv") return;
    setCvLoading(true);
    listCareerCvTop(start, end, topN)
      .then(setCvRows)
      .catch((e) => {
        setCvRows([]);
        setError(getErrorMessage(e));
      })
      .finally(() => setCvLoading(false));
  }, [view, start, end, topN]);


  const uygulaElle = () => {
    const n = parseInt(topYaz, 10);
    if (!Number.isFinite(n) || n < 1) {
      setTopYaz(String(topN));
      return;
    }
    const t = Math.min(n, 10000);
    setTopN(t);
    setTopYaz(String(t));
  };

  const printRows = (monthly ?? []).flatMap((g) => g.users.map((u) => ({ rank: g.rank_name, ...u })));
  const earningsRows = earnings ?? [];
  const pvList = pvRows ?? [];
  const cvList = cvRows ?? [];
  const rangeLabel = `${fmtDate(start)} – ${fmtDate(end)}`;
  const canPrint =
    view === "careers"
      ? printRows.length > 0
      : view === "pv"
        ? pvList.length > 0
        : view === "cv"
          ? cvList.length > 0
          : earningsRows.length > 0;

  return (
    <div>
      <AdminHeader
        title="TOP100"
        subtitle="Tek Filtreler butonundan ay, liste ve sıralamayı seçin — kariyer kazanımları, KAZANÇ, PV ve CV listeleri."
      />

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <AdminCard title="Rapor" subtitle="Ay ve yıl sağda seçilir — liste, sıralama ve yazdırma Filtreler butonunda">
        {/* Ay ve yıl sağda (select); liste, sıralama ve yazdırma Filtreler panelinde */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {view === "careers" ? "Kariyer Kazanımları" : view === "top" ? "KAZANÇ" : view === "pv" ? "PV" : "CV"}
            {view !== "careers" ? " · TOP" + topN : ""}
          </span>
          <span className="ml-auto text-xs font-semibold text-gray-500 dark:text-gray-400">Ay:</span>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {pad(m)}
              </option>
            ))}
          </select>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Yıl:</span>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            {YIL_SECENEKLERI.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="relative bw-no-print">
            <AdminBtn
              size="xs"
              variant={filtreAcik ? "primary" : "outline"}
              onClick={() => setFiltreAcik((v) => !v)}
            >
              ⚙️ Filtreler ▾
            </AdminBtn>
            {filtreAcik && (
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setFiltreAcik(false)} />
                <div className="absolute right-0 z-[9999] mt-2 w-[21rem] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">

                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    📋 Liste
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      ["careers", "🎖️ Kariyer"],
                      ["top", "🏆 KAZANÇ"],
                      ["pv", "📈 PV"],
                      ["cv", "💰 CV"],
                    ] as const).map(([v, label]) => {
                      const secili = view === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setView(v)}
                          className={
                            "rounded-lg px-2 py-1.5 text-[11px] font-semibold transition " +
                            (secili
                              ? "bg-brand-500 text-white shadow-theme-xs"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10")
                          }
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="my-3 border-t border-gray-100 dark:border-gray-800" />

                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    🔢 Sıralama (KAZANÇ / PV / CV / TOP)
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={topYaz}
                      onChange={(e) => setTopYaz(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") uygulaElle();
                      }}
                      onBlur={uygulaElle}
                      placeholder="Elle kişi sayısı gir"
                      className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    />
                    <button
                      type="button"
                      onClick={uygulaElle}
                      className="h-8 shrink-0 rounded-lg bg-brand-500 px-3 text-[11px] font-bold text-white hover:bg-brand-600"
                    >
                      Uygula
                    </button>
                  </div>

                  <div className="my-3 border-t border-gray-100 dark:border-gray-800" />

                  <AdminBtn
                    size="xs"
                    variant="outline"
                    disabled={!canPrint}
                    onClick={() => window.print()}
                    className="w-full"
                  >
                    🖨️ Yazdır / PDF
                  </AdminBtn>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Aktif liste */}
        {view === "cv" ? (
          cvLoading ? (
            <AdminSpinner label="CV listesi yükleniyor…" />
          ) : cvList.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className={thCls}>#</th>
                    <th className={thCls}>Üye</th>
                    <th className={thCls}>Üye Kodu</th>
                    <th className={`${thCls} text-right`}>CV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {cvList.map((u, i) => (
                    <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className={tdCls}>{i + 1}</td>
                      <td className={tdCls}>
                        <span className="font-medium text-gray-800 dark:text-white/90">{u.name}</span>
                      </td>
                      <td className={tdCls}>
                        <span className="font-mono text-xs text-gray-500">{u.member_code}</span>
                      </td>
                      <td className={`${tdCls} text-right font-semibold`}>{formatPV(u.total_cv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmpty>Seçilen tarih aralığında CV biriktiren üye yok.</AdminEmpty>
          )
        ) : view === "pv" ? (
          pvLoading ? (
            <AdminSpinner label="PV listesi yükleniyor…" />
          ) : pvList.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className={thCls}>#</th>
                    <th className={thCls}>Üye</th>
                    <th className={thCls}>Üye Kodu</th>
                    <th className={`${thCls} text-right`}>PV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {pvList.map((u, i) => (
                    <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className={tdCls}>{i + 1}</td>
                      <td className={tdCls}>
                        <span className="font-medium text-gray-800 dark:text-white/90">{u.name}</span>
                      </td>
                      <td className={tdCls}>
                        <span className="font-mono text-xs text-gray-500">{u.member_code}</span>
                      </td>
                      <td className={`${tdCls} text-right font-semibold`}>{formatPV(u.total_pv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmpty>Seçilen tarih aralığında PV biriktiren üye yok.</AdminEmpty>
          )
        ) : view === "top" ? (
          earningsLoading ? (
            <AdminSpinner label="Kazanç listesi yükleniyor…" />
          ) : earningsRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className={thCls}>#</th>
                    <th className={thCls}>Üye</th>
                    <th className={thCls}>Üye Kodu</th>
                    <th className={`${thCls} text-right`}>Kazanç</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {earningsRows.map((u, i) => (
                    <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className={tdCls}>{i + 1}</td>
                      <td className={tdCls}>
                        <span className="font-medium text-gray-800 dark:text-white/90">{u.name}</span>
                      </td>
                      <td className={tdCls}>
                        <span className="font-mono text-xs text-gray-500">{u.member_code}</span>
                      </td>
                      <td className={`${tdCls} text-right font-semibold`}>{tl(u.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmpty>Seçilen tarih aralığında kazancı olan üye yok.</AdminEmpty>
          )
        ) : monthlyLoading ? (
          <AdminSpinner label="Kariyer kayıtları yükleniyor…" />
        ) : monthly && monthly.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {monthly.map((g) => (
              <div
                key={g.rank_id}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800 dark:text-white/90">
                    {g.rank_name}
                  </span>
                  <AdminBadge color="green">{g.users.length} kişi</AdminBadge>
                </div>
                <ul className="space-y-1.5">
                  {g.users.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-300"
                    >
                      <span className="truncate font-medium">{u.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-gray-400">
                        {u.member_code} · {fmtDate(u.achieved_at.slice(0, 10))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmpty>Seçilen tarih aralığında kariyer kazanan üye yok.</AdminEmpty>
        )}
      </AdminCard>

      {/* Yazdırma alanı — yalnızca yazdır/PDF çıktısında görünür */}
      <style>{`
        #bw-print-area { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          #bw-print-area, #bw-print-area * { visibility: visible !important; }
          #bw-print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 28px;
            background: #fff;
            color: #000;
          }
          .bw-no-print { display: none !important; }
        }
      `}</style>
      <div id="bw-print-area">
        {view === "cv" ? (
          <>
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "0.02em" }}>
                BESTWORK — TOP{topN} CV
              </div>
              <div style={{ fontSize: "13px", marginTop: "6px" }}>
                {rangeLabel} · Toplam {cvList.length} kişi
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={printTh}>#</th>
                  <th style={printTh}>Üye</th>
                  <th style={printTh}>Üye Kodu</th>
                  <th style={printTh}>CV</th>
                </tr>
              </thead>
              <tbody>
                {cvList.map((u, i) => (
                  <tr key={u.id + "-" + i}>
                    <td style={printTd}>{i + 1}</td>
                    <td style={printTd}>{u.name}</td>
                    <td style={printTd}>{u.member_code}</td>
                    <td style={printTd}>{formatPV(u.total_cv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : view === "careers" ? (
          <>
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "0.02em" }}>
                BESTWORK — Kariyer Kazanımları
              </div>
              <div style={{ fontSize: "13px", marginTop: "6px" }}>
                {rangeLabel} · Toplam {printRows.length} kişi
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={printTh}>#</th>
                  <th style={printTh}>Kariyer</th>
                  <th style={printTh}>Ad Soyad</th>
                  <th style={printTh}>Üye Kodu</th>
                  <th style={printTh}>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {printRows.map((u, i) => (
                  <tr key={u.id + "-" + i}>
                    <td style={printTd}>{i + 1}</td>
                    <td style={printTd}>{u.rank}</td>
                    <td style={printTd}>{u.name}</td>
                    <td style={printTd}>{u.member_code}</td>
                    <td style={printTd}>{fmtDate(u.achieved_at.slice(0, 10))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : view === "pv" ? (
          <>
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "0.02em" }}>
                BESTWORK — TOP{topN} PV
              </div>
              <div style={{ fontSize: "13px", marginTop: "6px" }}>
                {rangeLabel} · Toplam {pvList.length} kişi
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={printTh}>#</th>
                  <th style={printTh}>Üye</th>
                  <th style={printTh}>Üye Kodu</th>
                  <th style={printTh}>PV</th>
                </tr>
              </thead>
              <tbody>
                {pvList.map((u, i) => (
                  <tr key={u.id + "-" + i}>
                    <td style={printTd}>{i + 1}</td>
                    <td style={printTd}>{u.name}</td>
                    <td style={printTd}>{u.member_code}</td>
                    <td style={printTd}>{formatPV(u.total_pv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "0.02em" }}>
                BESTWORK — TOP{topN} KAZANÇ
              </div>
              <div style={{ fontSize: "13px", marginTop: "6px" }}>
                {rangeLabel} · Toplam {earningsRows.length} kişi
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={printTh}>#</th>
                  <th style={printTh}>Üye</th>
                  <th style={printTh}>Üye Kodu</th>
                  <th style={printTh}>Kazanç</th>
                </tr>
              </thead>
              <tbody>
                {earningsRows.map((u, i) => (
                  <tr key={u.id + "-" + i}>
                    <td style={printTd}>{i + 1}</td>
                    <td style={printTd}>{u.name}</td>
                    <td style={printTd}>{u.member_code}</td>
                    <td style={printTd}>{tl(u.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
