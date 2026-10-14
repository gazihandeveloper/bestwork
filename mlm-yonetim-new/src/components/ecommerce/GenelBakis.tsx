"use client";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import {
  getMyMenuPermissions,
  getMyPreferences,
  setMyPreference,
  getActivitySeries,
  getActivitySeriesRange,
  type ActivityPeriod,
  type ActivityPoint,
} from "@/lib/api";
import { NAV_PATHS } from "@/lib/nav";

// ApexCharts yalnızca istemcide yüklenir (SSR'da window yok)
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://mahmutgazihanarslan.com.tr/api";

const tl = (v?: number) =>
  (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
const n = (v?: number) => (Number(v) || 0).toLocaleString("tr-TR");

async function adm<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "X-Admin-Scope": "1", ...(opts?.method ? { "X-CSRF-Protection": "1" } : {}) },
    ...opts,
  });
  if (!res.ok) {
    let msg = "Bir sorun oluştu";
    try {
      const d = (await res.json()) as { error?: string };
      if (d?.error) msg = d.error;
    } catch {
      /* yoksay */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

const KISA_AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const pad2 = (n: number) => String(n).padStart(2, "0");
const lastDayOf = (y: number, m: number) => new Date(y, m, 0).getDate();

/** Dashboard tek grafik dönem seçenekleri. */
const ACT_PERIODS: { key: ActivityPeriod; label: string }[] = [
  { key: "daily", label: "Günlük" },
  { key: "weekly", label: "Haftalık" },
  { key: "monthly", label: "Aylık" },
  { key: "yearly", label: "Yıllık" },
  { key: "2y", label: "2 Yıl" },
  { key: "5y", label: "5 Yıl" },
  { key: "10y", label: "10 Yıl" },
];

/** Grafik x ekseni etiketi: 05.10 · Eki 26 · 2026 */
function bucketLabel(date: string, period: ActivityPeriod): string {
  const [y, m, d] = date.split("-");
  if (period === "daily" || period === "weekly") return `${d}.${m}`;
  if (period === "5y" || period === "10y") return y;
  return `${KISA_AY[Number(m) - 1]} ${y.slice(2)}`;
}

/** Dizi ortalaması (verilen alan). */
function avgOf(rows: ActivityPoint[], key: "pv" | "cv" | "commission" | "revenue" | "profit"): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  return sum / rows.length;
}

/** Yüzde değişim: (yeni − eski) ÷ eski · % — eski 0 ise 0 döner. */
function trendPct(last: number, prev: number): number {
  if (prev <= 0) return 0;
  return Math.round(((last - prev) / prev) * 1000) / 10;
}

/** Düşüş / yükseliş rozeti. */
function TrendChip({ label, pct }: { label: string; pct: number }) {
  const up = pct > 0;
  const down = pct < 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        up
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : down
            ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
            : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
      }`}
      title={`${label} — önceki döneme göre değişim`}
    >
      {up ? "▲" : down ? "▼" : "•"} {label} {up ? "+" : ""}
      {n(pct)}%
    </span>
  );
}

/** Borsa tarzı büyük yön rozeti: ▲ YÜKSELİŞ · ▼ DÜŞÜŞ · • SABİT. */
function OverallTrend({ pct }: { pct: number }) {
  const up = pct > 0;
  const down = pct < 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${
        up
          ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          : down
            ? "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400"
            : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
      }`}
      title="Genel yön — son dönem, bir önceki döneme göre"
    >
      {up ? "▲" : down ? "▼" : "•"} {up ? "+" : ""}
      {n(pct)}% {up ? "YÜKSELİŞ" : down ? "DÜŞÜŞ" : "SABİT"}
    </span>
  );
}

/** Dönem grafiği: PV/CV/Komisyon/Ciro/Şirket Kârlılığı toplamları — dairesel (donut). */
function buildPeriodChart(rows: ActivityPoint[], dark: boolean) {
  const sumOf = (key: "pv" | "cv" | "commission" | "revenue" | "profit") =>
    rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  const items = [
    { label: "PV", value: sumOf("pv"), color: "#8b5cf6" },
    { label: "CV", value: sumOf("cv"), color: "#3bb77e" },
  ];
  const options: ApexOptions = {
    chart: {
      type: "donut",
      toolbar: { show: false },
      fontFamily: "inherit",
      foreColor: dark ? "#94a3b8" : "#64748b",
      animations: { enabled: true, speed: 500 },
    },
    theme: { mode: dark ? "dark" : "light" },
    labels: items.map((i) => i.label),
    colors: items.map((i) => i.color),
    dataLabels: { enabled: true, formatter: (v: number) => `${Math.round(v)}%` },
    stroke: { width: 1, colors: [dark ? "#1E293B" : "#fff"] },
    legend: { position: "bottom", horizontalAlign: "center", markers: { size: 6 }, fontSize: "12px" },
    tooltip: { y: { formatter: (v: number) => n(v) } },
    plotOptions: {
      pie: {
        donut: {
          size: "62%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Toplam",
              formatter: () => n(items.reduce((s, i) => s + i.value, 0)),
            },
          },
        },
      },
    },
  };
  return { options, series: items.map((i) => i.value) };
}

/** Sağdaki doğrusal grafik: Genel Ciro · Şirket Kârlılığı. */
function buildCiroLineChart(rows: ActivityPoint[], period: ActivityPeriod, dark: boolean) {
  const categories = rows.map((p) => bucketLabel(p.date, period));
  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: "inherit",
      foreColor: dark ? "#94a3b8" : "#64748b",
      animations: { enabled: true, speed: 500 },
    },
    theme: { mode: dark ? "dark" : "light" },
    colors: ["#ef4444", "#0ea5e9"],
    stroke: { curve: "smooth", width: 2.5 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 0.6, opacityFrom: 0.3, opacityTo: 0.03, stops: [0, 90, 100] },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: dark ? "#1f2a37" : "#eef2f6", strokeDashArray: 4 },
    xaxis: {
      categories,
      labels: { rotate: -35, style: { fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v: number) => n(v) } },
    legend: { position: "top", horizontalAlign: "right", markers: { size: 5 }, fontSize: "11px" },
    tooltip: { y: { formatter: (v: number) => n(v) } },
  };
  return {
    options,
    series: [
      { name: "Genel Ciro (₺)", data: rows.map((p) => Number(p.revenue) || 0) },
      { name: "Şirket Kârlılığı (₺)", data: rows.map((p) => Number(p.profit) || 0) },
    ],
  };
}

/** Üçüncü doğrusal grafik: Dağıtılan Komisyon Oranı (%) = komisyon / ciro × 100. */
function buildCommissionRatioChart(rows: ActivityPoint[], period: ActivityPeriod, dark: boolean) {
  const categories = rows.map((p) => bucketLabel(p.date, period));
  const ratio = (p: ActivityPoint) => {
    const rev = Number(p.revenue) || 0;
    return rev > 0 ? Math.round(((Number(p.commission) || 0) / rev) * 1000) / 10 : 0;
  };
  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: "inherit",
      foreColor: dark ? "#94a3b8" : "#64748b",
      animations: { enabled: true, speed: 500 },
    },
    theme: { mode: dark ? "dark" : "light" },
    colors: ["#f59e0b"],
    stroke: { curve: "smooth", width: 2.5 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 0.6, opacityFrom: 0.3, opacityTo: 0.03, stops: [0, 90, 100] },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: dark ? "#1f2a37" : "#eef2f6", strokeDashArray: 4 },
    xaxis: {
      categories,
      labels: { rotate: -35, style: { fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v: number) => `${n(v)}%` } },
    legend: { position: "top", horizontalAlign: "right", markers: { size: 5 }, fontSize: "11px" },
    tooltip: { y: { formatter: (v: number) => `${n(v)}%` } },
  };
  return {
    options,
    series: [{ name: "Dağıtılan Komisyon Oranı (%)", data: rows.map(ratio) }],
  };
}

interface Dash {
  total_users: number;
  active_users: number;
  pending_users: number;
  total_orders: number;
  total_revenue: number;
  total_commissions_paid: number;
  total_withdrawals: number;
  monthly_commissions: number;
  pending_commissions: number;
  net_profit: number;
  registration_growth: { date: string; count: number }[];
  recent_users: { id: number; name: string; member_code: string; role: string; is_active: boolean; created_at: string }[];
  recent_withdraw_requests: { id: number; user_id: number; amount: number; status: string; requested_at: string }[];
}

interface Point { date: string; revenue: number }
interface RankDist { rank_name: string; count: number }
interface TopProduct { name: string; quantity: number; revenue: number }
interface FraudDup { field: string; value: string; count: number; accounts: number[] }
interface TopEarner { user_id: number; name: string; member_code: string; total_earned: number }
interface Withdrawal { id: number; user_id: number; amount: number; status: string; requested_at: string }

// ── Widget sistemi ──────────────────────────────────────────────────────
// Dashboard bölümleri "widget"tır. Görünürlük + sıra tarayıcıda saklanır
// (localStorage). Düzenleme modunda widget kaldırılır/eklenir/sıralanır.
interface WidgetDef {
  id: string;
  title: string;
  /** 12 kolonlu ızgarada genişlik sınıfı. */
  span: string;
  element: ReactNode;
}

const WIDGET_STORAGE_KEY = "bw_dashboard_widgets_v1";
/** Sunucudaki (user_preferences) tercih anahtarı. */
const PREF_KEY = "dashboard_widgets";

const WIDGET_META: { id: string; title: string; span: string }[] = [
  { id: "kpi", title: "KPI Kartları", span: "xl:col-span-12" },
  { id: "ciro", title: "PV / CV / Komisyon / Genel Ciro / Şirket Kârlılığı", span: "xl:col-span-12" },
  { id: "risk", title: "Risk & Güvenlik Alarmları", span: "xl:col-span-4" },
  { id: "kariyer", title: "Kariyer Dağılımı", span: "xl:col-span-4" },
  { id: "odeme", title: "Hızlı Ödeme Onayı", span: "xl:col-span-4" },
  { id: "sonkayitlar", title: "Son Kayıtlar & Liderler", span: "xl:col-span-6" },
  { id: "urunler", title: "En Çok Satan Ürünler", span: "xl:col-span-6" },
  { id: "cografi", title: "Coğrafi & Bölgesel Dağılım", span: "xl:col-span-12" },
];

const ALL_WIDGET_IDS = WIDGET_META.map((w) => w.id);

// Kayıtlı düzeni çöz: eski format düz diziydi; yeni format { v, order, known }.
// "known": kayıt anında kodda var olan tüm widget id'leri — böylece kodda
// SONRADAN eklenen widget'lar otomatik listeye girer, kullanıcının SİLDİĞİ
// widget'lar ise (known içinde olduğu için) geri gelmez.
function parseLayout(raw: unknown): { order: string[]; known: string[] } | null {
  if (Array.isArray(raw)) {
    const order = raw.filter((id): id is string => typeof id === "string" && ALL_WIDGET_IDS.includes(id));
    return { order, known: ALL_WIDGET_IDS };
  }
  if (raw && typeof raw === "object") {
    const o = raw as { order?: unknown; known?: unknown };
    const order = Array.isArray(o.order)
      ? o.order.filter((id): id is string => typeof id === "string" && ALL_WIDGET_IDS.includes(id))
      : [];
    const known = Array.isArray(o.known)
      ? o.known.filter((id): id is string => typeof id === "string" && ALL_WIDGET_IDS.includes(id))
      : order;
    return { order, known };
  }
  return null;
}

/** Görünür sıraya, kodda yeni eklenmiş (known'da olmayan) widget'ları sona ekler. */
function finalizeOrder(layout: { order: string[]; known: string[] }): string[] {
  const newlyAdded = ALL_WIDGET_IDS.filter((id) => !layout.known.includes(id));
  const order = [...layout.order];
  for (const id of newlyAdded) {
    if (!order.includes(id)) order.push(id);
  }
  return order;
}

export default function GenelBakis() {
  const [dash, setDash] = useState<Dash | null>(null);
  const [err, setErr] = useState("");
  const [actPeriod, setActPeriod] = useState<ActivityPeriod>("monthly");
  const nowDate = new Date();
  const [selAy, setSelAy] = useState<number>(nowDate.getMonth() + 1);
  const [selYil, setSelYil] = useState<number>(nowDate.getFullYear());
  // true → grafik, seçilen belirli Ay/Yıl için gösterilir; false → dönem (period) modu.
  const [actCustom, setActCustom] = useState(false);
  const [activity, setActivity] = useState<ActivityPoint[] | null>(null);
  const [actLoading, setActLoading] = useState(false);
  const [ranks, setRanks] = useState<RankDist[]>([]);
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [fraud, setFraud] = useState<FraudDup[]>([]);
  const [earners, setEarners] = useState<TopEarner[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [busyW, setBusyW] = useState<number | null>(null);

  // Widget düzeni
  const [order, setOrder] = useState<string[]>(ALL_WIDGET_IDS);
  const [edit, setEdit] = useState(false);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sürükle-bırak durumu (fareyle widget taşıma)
  const [dragId, setDragId] = useState<string | null>(null);
  // Sunucu senkronu: kullanıcı değişikliği yoksa sunucu değeri üzerine yazmaz
  const [serverLoaded, setServerLoaded] = useState(false);
  const touchedRef = useRef(false);
  const orderRef = useRef<string[]>(ALL_WIDGET_IDS);

  const router = useRouter();
  const [access, setAccess] = useState<"checking" | "ok" | "denied">("checking");

  // 1) Hızlı yükleme: tarayıcı önbelleği (anında göster)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (raw) {
        const parsed = parseLayout(JSON.parse(raw) as unknown);
        if (parsed) setOrder(finalizeOrder(parsed));
      }
    } catch {
      /* yoksay */
    }
    setLayoutLoaded(true);
  }, []);

  // 2) Hesaba bağlı düzeni sunucudan (DB) yükle.
  // Kullanıcı bu Oturumda değişiklik yaptıysa sunucu değeri üzerine YAZILMAZ.
  useEffect(() => {
    let alive = true;
    getMyPreferences()
      .then((d) => {
        if (!alive) return;
        if (!touchedRef.current) {
          const parsed = parseLayout(d.preferences?.[PREF_KEY]);
          if (parsed) setOrder(finalizeOrder(parsed));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setServerLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 3) Kaydet: yalnızca kullanıcı değişikliğinden SONRA + sunucu yüklemesi
  // tamamlandığında (sayfa ilk açılışta boşuna kayıt yapmaz).
  useEffect(() => {
    orderRef.current = order;
    if (!layoutLoaded) return;
    try {
      localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify({ v: 1, order, known: ALL_WIDGET_IDS }));
    } catch {
      /* yoksay */
    }
    if (!touchedRef.current || !serverLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setMyPreference(PREF_KEY, { v: 1, order, known: ALL_WIDGET_IDS }).catch(() => undefined);
    }, 250);
  }, [order, layoutLoaded, serverLoaded]);

  // 4) Sayfa yenilenirken/kapanırken son düzeni hemen gönder (debounce kaybını önler)
  useEffect(() => {
    const flush = () => {
      if (!touchedRef.current) return;
      try {
        fetch(`${API_URL}/admin/me/preferences/${PREF_KEY}`, {
          method: "PUT",
          credentials: "include",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Scope": "1",
            "X-CSRF-Protection": "1",
          },
          body: JSON.stringify({ value: { v: 1, order: orderRef.current, known: ALL_WIDGET_IDS } }),
        }).catch(() => undefined);
      } catch {
        /* yoksay */
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const moveWidget = (id: string, dir: -1 | 1) => {
    touchedRef.current = true;
    setOrder((prev) => {
      const i = prev.indexOf(id);
      if (i === -1) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const removeWidget = (id: string) => {
    touchedRef.current = true;
    setOrder((prev) => prev.filter((x) => x !== id));
  };
  const addWidget = (id: string) => {
    touchedRef.current = true;
    setOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  const resetWidgets = () => {
    touchedRef.current = true;
    setOrder(ALL_WIDGET_IDS);
  };

  // ── Fareyle sürükle-bırak ─────────────────────────────────────────────
  // Sürüklenen widget, üzerine gelinen widget'ın konumuna canlı taşınır.
  const onDragStart = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {
      /* yoksay */
    }
  };

  const onDragOverItem = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragId || dragId === id) return;
    touchedRef.current = true;
    setOrder((prev) => {
      const from = prev.indexOf(dragId);
      const to = prev.indexOf(id);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      return next;
    });
  };

  const onDragEnd = () => {
    setDragId(null);
    // Bırakınca beklemeden kaydet (yenileme yarışını önler)
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (serverLoaded) {
      setMyPreference(PREF_KEY, { v: 1, order: orderRef.current, known: ALL_WIDGET_IDS }).catch(() => undefined);
    }
  };

  // Dashboard yalnızca yöneticilere açıktır; çalışanlar (staff) göremez.
  useEffect(() => {
    let alive = true;
    getMyMenuPermissions()
      .then((d) => {
        if (!alive) return;
        if (d.role === "admin" || d.role === "super_admin") {
          setAccess("ok");
          return;
        }
        const menus = d.menus || [];
        const first = NAV_PATHS.find((p) => p !== "/" && menus.includes(p));
        if (first) {
          router.replace(first);
        } else {
          setAccess("denied");
        }
      })
      .catch(() => setAccess("ok"));
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    if (access !== "ok") return;
    Promise.all([
      adm<{ dashboard: Dash }>("/admin/dashboard"),
      adm<{ distribution: RankDist[] }>("/admin/rank-distribution"),
      adm<{ products: TopProduct[] }>("/admin/top-products?limit=5"),
      adm<{ groups: FraudDup[] }>("/admin/fraud/duplicates?limit=6"),
      adm<{ earners: TopEarner[] }>("/admin/top-earners?limit=5"),
      adm<{ withdrawals?: Withdrawal[]; withdraw_requests?: Withdrawal[] }>("/admin/withdrawals"),
    ])
      .then(([d, rk, p, f, e, w]) => {
        setDash(d.dashboard);
        setRanks(rk.distribution ?? []);
        setProducts(p.products ?? []);
        setFraud(f.groups ?? []);
        setEarners(e.earners ?? []);
        setWithdrawals(w.withdrawals ?? w.withdraw_requests ?? []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Veri alınamadı"));
  }, [access]);

  // Grafik verisi: seçilen dönem (dönem değişince yenilenir)
  useEffect(() => {
    if (access !== "ok") return;
    let alive = true;
    setActLoading(true);
    const req = actCustom
      ? getActivitySeriesRange(
          "day",
          `${selYil}-${pad2(selAy)}-01`,
          `${selYil}-${pad2(selAy)}-${lastDayOf(selYil, selAy)}`
        )
      : getActivitySeries(actPeriod);
    req
      .then((p) => {
        if (alive) setActivity(p);
      })
      .catch(() => {
        if (alive) setActivity([]);
      })
      .finally(() => {
        if (alive) setActLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [actPeriod, access, actCustom, selAy, selYil]);

  const payout = dash && dash.total_revenue > 0 ? Math.round((dash.total_commissions_paid / dash.total_revenue) * 1000) / 10 : 0;
  const activePct = dash && dash.total_users > 0 ? Math.round((dash.active_users / dash.total_users) * 100) : 0;
  const pending = withdrawals.filter((w) => w.status === "pending");
  const pendingAmount = pending.reduce((s, w) => s + (Number(w.amount) || 0), 0);

  const act = async (id: number, a: "approve" | "reject") => {
    setBusyW(id);
    try {
      await adm(`/admin/withdrawals/${id}/${a}`, { method: "POST" });
      setWithdrawals((ws) => ws.filter((w) => w.id !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusyW(null);
    }
  };

  if (access === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }
  if (access === "denied") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-theme-xs dark:border-gray-800 dark:bg-[#1E293B]">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-error-50 text-xl dark:bg-error-500/10">🔒</div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Yetkiniz yok</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Genel bakış sayfası yalnızca yöneticilere açıktır. Menüden size atanmış sayfaları kullanabilirsiniz.
        </p>
      </div>
    );
  }

  if (err && !dash) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        BestWork API: {err}
      </div>
    );
  }

  if (!dash) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-200 dark:border-gray-800 bg-white" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Toplam Ciro", value: tl(dash.total_revenue), sub: "Tüm zamanlar", cls: "text-gray-800 dark:text-white/90 dark:text-white/90" },
    { label: "Dağıtılan Komisyon", value: tl(dash.total_commissions_paid), sub: "Toplam ödenen", cls: "text-gray-800 dark:text-white/90 dark:text-white/90" },
    { label: "Net Kâr", value: tl(dash.net_profit), sub: `Payout: %${payout}`, cls: "text-green-600" },
    { label: "Bekleyen Çekim", value: String(pending.length), sub: `Tutar: ${tl(pendingAmount)}`, cls: "text-amber-600" },
    { label: "Aktif Üye", value: n(dash.active_users), sub: `%${activePct} aktif oranı`, cls: "text-gray-800 dark:text-white/90 dark:text-white/90" },
    { label: "Toplam Üye", value: n(dash.total_users), sub: "Tüm zamanlar", cls: "text-gray-800 dark:text-white/90 dark:text-white/90" },
  ];

  // ── Tek grafik: seçilen dönem + ortalama çizgileri ────────────────────
  const darkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const actRows = activity ?? [];
  const donutChart = buildPeriodChart(actRows, darkMode);
  const lineChart = buildCiroLineChart(actRows, actCustom ? "daily" : actPeriod, darkMode);
  const ratioChart = buildCommissionRatioChart(actRows, actCustom ? "daily" : actPeriod, darkMode);

  // ── Widget içerikleri ─────────────────────────────────────────────────
  const widgetElements: Record<string, ReactNode> = {
    kpi: (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg dark:border-gray-800 dark:bg-[#1E293B] dark:hover:border-brand-500">
            <p className="text-[13px] font-medium text-gray-500 transition-transform duration-300 group-hover:translate-x-1 dark:text-gray-400">{c.label}</p>
            <p className={`mt-1 text-xl font-semibold transition-transform duration-300 group-hover:translate-x-1 ${c.cls}`}>{c.value}</p>
            <p className="mt-1 text-xs text-gray-400 transition-transform duration-300 group-hover:translate-x-1 dark:text-gray-500">{c.sub}</p>
          </div>
        ))}
      </div>
    ),

    ciro: (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-gray-800 dark:text-white/90">PV / CV / Komisyon / Genel Ciro / Şirket Kârlılığı</h3>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-1">
          {ACT_PERIODS.map((p) => (
            <button key={p.key} type="button" onClick={() => { setActPeriod(p.key); setActCustom(false); }}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${!actCustom && actPeriod === p.key ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
            Ay:
            <select
              value={selAy}
              onChange={(e) => { setSelAy(Number(e.target.value)); setActCustom(true); }}
              className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {KISA_AY.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
            Yıl:
            <select
              value={selYil}
              onChange={(e) => { setSelYil(Number(e.target.value)); setActCustom(true); }}
              className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {Array.from({ length: 11 }, (_, i) => nowDate.getFullYear() + 1 - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
        </div>
        {actLoading ? (
          <div className="flex h-80 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
          </div>
        ) : actRows.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div>
              <ApexChart options={donutChart.options} series={donutChart.series} type="donut" height={340} />
            </div>
            <div>
              <ApexChart options={lineChart.options} series={lineChart.series} type="area" height={340} />
            </div>
            <div>
              <ApexChart options={ratioChart.options} series={ratioChart.series} type="area" height={340} />
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Bu dönem için henüz veri yok.</p>
        )}
      </div>
    ),

    risk: (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
        <h3 className="mb-3 font-bold text-gray-800 dark:text-white/90 dark:text-white/90">Risk &amp; Güvenlik Alarmları</h3>
        {payout > 50 && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Payout %{payout} — %50 hedef aşıldı.</p>
        )}
        {fraud.length === 0 && payout <= 50 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Şu anda anormal durum yok.</p>
        ) : (
          <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            {fraud.map((f, i) => (
              <li key={i} className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
                {f.field === "tc" ? "TC" : f.field === "iban" ? "IBAN" : "Telefon"} · {f.value} → {f.count} hesap
              </li>
            ))}
          </ul>
        )}
      </div>
    ),

    kariyer: (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
        <h3 className="mb-3 font-bold text-gray-800 dark:text-white/90 dark:text-white/90">Kariyer Dağılımı</h3>
        {ranks.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Dağılım verisi yok.</p>
        ) : (
          <ul className="space-y-2">
            {ranks.map((r) => (
              <li key={r.rank_name} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{(r.rank_name && r.rank_name !== "Ranksız") ? r.rank_name : "Girişimci"}</span>
                <span className="font-bold text-gray-800 dark:text-white/90">{n(r.count)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    ),

    odeme: (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
        <h3 className="mb-3 font-bold text-gray-800 dark:text-white/90 dark:text-white/90">Hızlı Ödeme Onayı</h3>
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">{pending.length} bekliyor</p>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Onay bekleyen çekim yok.</p>
        ) : (
          <ul className="space-y-2">
            {pending.slice(0, 5).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-700 dark:text-gray-300">#{w.id} · {tl(w.amount)}</span>
                <div className="flex gap-1">
                  <button type="button" disabled={busyW === w.id} onClick={() => act(w.id, "approve")} className="cursor-pointer rounded bg-green-600 px-2 py-1 text-xs font-bold text-white">Onayla</button>
                  <button type="button" disabled={busyW === w.id} onClick={() => act(w.id, "reject")} className="cursor-pointer rounded bg-red-500 px-2 py-1 text-xs font-bold text-white">Reddet</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    ),

    sonkayitlar: (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
        <h3 className="mb-3 font-bold text-gray-800 dark:text-white/90 dark:text-white/90">Son Kayıtlar &amp; Liderler</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 dark:text-gray-500">
              <th className="pb-2">Üye</th><th className="pb-2">Üye No</th><th className="pb-2">Rol</th><th className="pb-2 text-right">Toplam Kazanç</th>
            </tr>
          </thead>
          <tbody>
            {earners.slice(0, 5).map((e) => (
              <tr key={e.user_id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="py-2 text-gray-800 dark:text-white/90">{e.name}</td>
                <td className="py-2 font-mono text-gray-500 dark:text-gray-400">{e.member_code}</td>
                <td className="py-2 text-gray-500 dark:text-gray-400">Girişimci</td>
                <td className="py-2 text-right font-bold text-gray-800 dark:text-white/90">{tl(e.total_earned)}</td>
              </tr>
            ))}
            {earners.length === 0 && dash.recent_users.slice(0, 5).map((u) => (
              <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="py-2 text-gray-800 dark:text-white/90">{u.name}</td>
                <td className="py-2 font-mono text-gray-500 dark:text-gray-400">{u.member_code}</td>
                <td className="py-2 text-gray-500 dark:text-gray-400">{(u.role === "admin" || u.role === "super_admin") ? "Admin" : u.role === "customer" ? "Müşteri" : "Girişimci"}</td>
                <td className="py-2 text-right text-gray-400 dark:text-gray-500">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),

    urunler: (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
        <h3 className="mb-3 font-bold text-gray-800 dark:text-white/90 dark:text-white/90">En Çok Satan Ürünler</h3>
        {products.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Sipariş verisi yok.</p>
        ) : (
          <ul className="space-y-2">
            {products.map((p) => (
              <li key={p.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                <span className="text-gray-500 dark:text-gray-400">{n(p.quantity)} adet · <b className="text-gray-800 dark:text-white/90">{tl(p.revenue)}</b></span>
              </li>
            ))}
          </ul>
        )}
      </div>
    ),

    cografi: (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
        <h3 className="mb-2 font-bold text-gray-800 dark:text-white/90 dark:text-white/90">Coğrafi &amp; Bölgesel Dağılım</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500">Üye kayıtlarında ülke/şehir bilgisi toplanmaya başlandığında ciro ve ağ büyümesinin ısı haritası burada görünecek.</p>
      </div>
    ),
  };

  const visibleWidgets: WidgetDef[] = order
    .map((id) => {
      const meta = WIDGET_META.find((w) => w.id === id);
      if (!meta) return null;
      return { ...meta, element: widgetElements[id] } as WidgetDef;
    })
    .filter((w): w is WidgetDef => w !== null);

  return (
    <div className="space-y-6">
      {/* Başlık + widget düzenleme araç çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">Genel Bakış</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {edit ? "Widget'ları fareyle tutup istediğiniz yere sürükleyin — ✕ ile kaldırın, üstteki panelden ekleyin." : "Panel widget'larınızı düzenleyebilirsiniz."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {edit && (
            <button
              type="button"
              onClick={resetWidgets}
              className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            >
              ↺ Sıfırla
            </button>
          )}
          <button
            type="button"
            onClick={() => setEdit((v) => !v)}
            className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              edit ? "bg-green-600 text-white hover:bg-green-700" : "bg-brand-600 text-white hover:bg-brand-700"
            }`}
          >
            {edit ? "✔ Bitti" : "⚙ Widget'ları Düzenle"}
          </button>
        </div>
      </div>

      {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

      {/* Düzenleme modu: widget yönetim paneli */}
      {edit && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
          <p className="mb-3 text-sm font-bold text-brand-800 dark:text-brand-300">
            Widget Yönetimi — {visibleWidgets.length}/{WIDGET_META.length} görünür
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {WIDGET_META.map((w) => {
              const visible = order.includes(w.id);
              const idx = order.indexOf(w.id);
              return (
                <div
                  key={w.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                    visible
                      ? "border-brand-200 bg-white dark:border-brand-500/30 dark:bg-[#1E293B]"
                      : "border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-white/[0.02]"
                  }`}
                >
                  <span className={`truncate text-xs font-semibold ${visible ? "text-gray-800 dark:text-white/90" : "text-gray-400"}`}>
                    {w.title}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    {visible ? (
                      <>
                        <button type="button" title="Yukarı taşı" disabled={idx <= 0} onClick={() => moveWidget(w.id, -1)}
                          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-xs text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5">↑</button>
                        <button type="button" title="Aşağı taşı" disabled={idx === order.length - 1} onClick={() => moveWidget(w.id, 1)}
                          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-xs text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5">↓</button>
                        <button type="button" onClick={() => removeWidget(w.id)}
                          className="cursor-pointer rounded-md px-1.5 py-1 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10">✕ Kaldır</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => addWidget(w.id)}
                        className="cursor-pointer rounded-md px-1.5 py-1 text-[10px] font-bold text-green-700 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10">+ Ekle</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Görünür widget'lar */}
      {visibleWidgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-[#1E293B]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tüm widget&apos;lar gizli. <b>⚙ Widget&apos;ları Düzenle</b> ile istediklerinizi ekleyin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {visibleWidgets.map((w) => (
            <div
              key={w.id}
              className={`${w.span} ${edit ? `cursor-grab select-none transition-opacity active:cursor-grabbing ${dragId === w.id ? "opacity-40" : ""}` : ""}`}
              draggable={edit}
              onDragStart={edit ? onDragStart(w.id) : undefined}
              onDragOver={edit ? onDragOverItem(w.id) : undefined}
              onDrop={edit ? (e) => e.preventDefault() : undefined}
              onDragEnd={edit ? onDragEnd : undefined}
            >
              {edit ? (
                <>
                  <div className="mb-1.5 flex items-center justify-between gap-2 rounded-xl border border-brand-200 bg-white px-3 py-1.5 dark:border-brand-500/30 dark:bg-[#1E293B]">
                    <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-brand-700 dark:text-brand-300">
                      <span className="shrink-0 text-sm leading-none text-gray-400">⠿</span>
                      <span className="truncate">🧩 {w.title}</span>
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" title="Yukarı taşı" disabled={order.indexOf(w.id) <= 0} onClick={() => moveWidget(w.id, -1)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-xs text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5">↑</button>
                      <button type="button" title="Aşağı taşı" disabled={order.indexOf(w.id) === order.length - 1} onClick={() => moveWidget(w.id, 1)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-xs text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5">↓</button>
                      <button type="button" onClick={() => removeWidget(w.id)}
                        className="cursor-pointer rounded-md px-1.5 py-1 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10">✕ Kaldır</button>
                    </div>
                  </div>
                  <div className="rounded-2xl border-2 border-dashed border-brand-300 p-1 dark:border-brand-500/30">{w.element}</div>
                </>
              ) : (
                w.element
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
