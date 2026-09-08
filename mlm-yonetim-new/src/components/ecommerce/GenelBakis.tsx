"use client";
import { useEffect, useState } from "react";

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

type Period = "daily" | "weekly" | "monthly";

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

export default function GenelBakis() {
  const [dash, setDash] = useState<Dash | null>(null);
  const [err, setErr] = useState("");
  const [period, setPeriod] = useState<Period>("monthly");
  const [rev, setRev] = useState<Point[]>([]);
  const [com, setCom] = useState<Point[]>([]);
  const [ranks, setRanks] = useState<RankDist[]>([]);
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [fraud, setFraud] = useState<FraudDup[]>([]);
  const [earners, setEarners] = useState<TopEarner[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [busyW, setBusyW] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      adm<{ dashboard: Dash }>("/admin/dashboard"),
      adm<{ points: Point[] }>(`/admin/revenue?period=${period}&limit=12`),
      adm<{ points: Point[] }>(`/admin/commissions-series?period=${period}&limit=12`),
      adm<{ distribution: RankDist[] }>("/admin/rank-distribution"),
      adm<{ products: TopProduct[] }>("/admin/top-products?limit=5"),
      adm<{ groups: FraudDup[] }>("/admin/fraud/duplicates?limit=6"),
      adm<{ earners: TopEarner[] }>("/admin/top-earners?limit=5"),
      adm<{ withdrawals?: Withdrawal[]; withdraw_requests?: Withdrawal[] }>("/admin/withdrawals"),
    ])
      .then(([d, r, c, rk, p, f, e, w]) => {
        setDash(d.dashboard);
        setRev(r.points ?? []);
        setCom(c.points ?? []);
        setRanks(rk.distribution ?? []);
        setProducts(p.products ?? []);
        setFraud(f.groups ?? []);
        setEarners(e.earners ?? []);
        setWithdrawals(w.withdrawals ?? w.withdraw_requests ?? []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Veri alınamadı"));
  }, [period]);

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
    { label: "Toplam Ciro", value: tl(dash.total_revenue), sub: "Tüm zamanlar", cls: "text-gray-800" },
    { label: "Dağıtılan Komisyon", value: tl(dash.total_commissions_paid), sub: "Toplam ödenen", cls: "text-gray-800" },
    { label: "Net Kâr", value: tl(dash.net_profit), sub: `Payout: %${payout}`, cls: "text-green-600" },
    { label: "Bekleyen Çekim", value: String(pending.length), sub: `Tutar: ${tl(pendingAmount)}`, cls: "text-amber-600" },
    { label: "Aktif Üye", value: n(dash.active_users), sub: `%${activePct} aktif oranı`, cls: "text-gray-800" },
    { label: "Toplam Ağaç", value: n(dash.total_users), sub: "Tüm zamanlar", cls: "text-gray-800" },
  ];

  const chartMax = Math.max(1, ...rev.map((p) => p.revenue), ...com.map((p) => p.revenue));

  return (
    <div className="space-y-6">
      {err && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-[#1E293B]">
            <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`mt-1 text-xl font-semibold ${c.cls}`}>{c.value}</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Ciro & Komisyon karşılaştırma */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white/90">Ciro &amp; Komisyon Karşılaştırma</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Toplam Ciro {tl(dash.total_revenue)} · Komisyon {tl(dash.total_commissions_paid)} · Payout %{payout}</p>
          </div>
          <div className="flex gap-1">
            {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)}
                className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-bold ${period === p ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"}`}>
                {{ daily: "Günlük", weekly: "Haftalık", monthly: "Aylık" }[p]}
              </button>
            ))}
          </div>
        </div>
        {rev.length === 0 && com.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Bu dönem için henüz veri yok.</p>
        ) : (
          <div className="flex h-48 items-end gap-2">
            {rev.map((p, i) => {
              const c = com[i]?.revenue ?? 0;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end gap-1">
                    <div className="flex-1 rounded-t bg-brand-500" style={{ height: `${(p.revenue / chartMax) * 100}%` }} title={`Ciro ${tl(p.revenue)}`} />
                    <div className="flex-1 rounded-t bg-amber-400" style={{ height: `${(c / chartMax) * 100}%` }} title={`Komisyon ${tl(c)}`} />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{p.date?.slice(5) || p.date}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Risk alarmları */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
          <h3 className="mb-3 font-bold text-gray-800">Risk &amp; Güvenlik Alarmları</h3>
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

        {/* Kariyer dağılımı */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
          <h3 className="mb-3 font-bold text-gray-800">Kariyer Dağılımı</h3>
          {ranks.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Dağılım verisi yok.</p>
          ) : (
            <ul className="space-y-2">
              {ranks.map((r) => (
                <li key={r.rank_name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{(r.rank_name && r.rank_name !== "Ranksız") ? r.rank_name : "Girişimci"}</span>
                  <span className="font-bold text-gray-800 dark:text-white/90">{n(r.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hızlı ödeme onayı */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
          <h3 className="mb-3 font-bold text-gray-800">Hızlı Ödeme Onayı</h3>
          <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">{pending.length} bekliyor</p>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Onay bekleyen çekim yok.</p>
          ) : (
            <ul className="space-y-2">
              {pending.slice(0, 5).map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-700">#{w.id} · {tl(w.amount)}</span>
                  <div className="flex gap-1">
                    <button type="button" disabled={busyW === w.id} onClick={() => act(w.id, "approve")} className="cursor-pointer rounded bg-green-600 px-2 py-1 text-xs font-bold text-white">Onayla</button>
                    <button type="button" disabled={busyW === w.id} onClick={() => act(w.id, "reject")} className="cursor-pointer rounded bg-red-500 px-2 py-1 text-xs font-bold text-white">Reddet</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Son kayıtlar & liderler */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
          <h3 className="mb-3 font-bold text-gray-800">Son Kayıtlar &amp; Liderler</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 dark:text-gray-500">
                <th className="pb-2">Üye</th><th className="pb-2">Üye No</th><th className="pb-2">Rol</th><th className="pb-2 text-right">Toplam Kazanç</th>
              </tr>
            </thead>
            <tbody>
              {earners.slice(0, 5).map((e) => (
                <tr key={e.user_id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 text-gray-800">{e.name}</td>
                  <td className="py-2 font-mono text-gray-500 dark:text-gray-400">{e.member_code}</td>
                  <td className="py-2 text-gray-500 dark:text-gray-400">Girişimci</td>
                  <td className="py-2 text-right font-bold text-gray-800 dark:text-white/90">{tl(e.total_earned)}</td>
                </tr>
              ))}
              {earners.length === 0 && dash.recent_users.slice(0, 5).map((u) => (
                <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-2 text-gray-800">{u.name}</td>
                  <td className="py-2 font-mono text-gray-500 dark:text-gray-400">{u.member_code}</td>
                  <td className="py-2 text-gray-500 dark:text-gray-400">{(u.role === "admin" || u.role === "super_admin") ? "Admin" : u.role === "customer" ? "Müşteri" : "Girişimci"}</td>
                  <td className="py-2 text-right text-gray-400 dark:text-gray-500">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* En çok satanlar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
          <h3 className="mb-3 font-bold text-gray-800">En Çok Satan Ürünler</h3>
          {products.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Sipariş verisi yok.</p>
          ) : (
            <ul className="space-y-2">
              {products.map((p) => (
                <li key={p.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{p.name}</span>
                  <span className="text-gray-500">{n(p.quantity)} adet · <b className="text-gray-800">{tl(p.revenue)}</b></span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Coğrafi dağılım */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#1E293B]">
        <h3 className="mb-2 font-bold text-gray-800">Coğrafi &amp; Bölgesel Dağılım</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500">Üye kayıtlarında ülke/şehir bilgisi toplanmaya başlandığında ciro ve ağ büyümesinin ısı haritası burada görünecek.</p>
      </div>
    </div>
  );
}
