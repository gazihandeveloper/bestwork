"use client";

import { useEffect, useState } from "react";
import { Wallet, Coins, TrendingUp, Clock, Users, AlertTriangle, Loader2, Activity } from "lucide-react";
import { getAdminDashboard, listWithdrawals, monthlyClose, getErrorMessage } from "@/services/api";
import type { AdminDashboard } from "@/services/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const shortTl = (v: number) => {
  if (Math.abs(v) >= 1000000) return `₺${(v / 1000000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(v) >= 1000) return `₺${(v / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}K`;
  return tl(v);
};

const PERIODS = [
  { key: "all", label: "Tümü" },
  { key: "daily", label: "Günlük" },
  { key: "weekly", label: "Haftalık" },
  { key: "monthly", label: "Aylık" },
] as const;
type Period = (typeof PERIODS)[number]["key"];

function KpiShell({
  label,
  icon,
  iconCls,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  iconCls: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card text-foreground flex flex-col rounded border p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn("flex size-[34px] items-center justify-center rounded", iconCls)}>{icon}</div>
        <p className="text-muted-foreground text-[11px] font-bold tracking-wide uppercase">{label}</p>
      </div>
      <div className="flex flex-1 flex-col justify-end">{children}</div>
    </div>
  );
}

// Yönetim (admin) ana sayfası — site tasarımıyla uyumlu KPI özeti.
export default function AdminHome() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [pending, setPending] = useState({ count: 0, amount: 0 });
  const [closing, setClosing] = useState(false);
  const [closeMsg, setCloseMsg] = useState("");

  const load = () => {
    getAdminDashboard()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    load();
    listWithdrawals()
      .then((ws) => {
        const p = ws.filter((w) => w.status === "pending");
        setPending({ count: p.length, amount: p.reduce((s, w) => s + (w.amount ?? 0), 0) });
      })
      .catch(() => {});
  }, []);

  const handleMonthlyClose = async () => {
    setCloseMsg("");
    setClosing(true);
    try {
      await monthlyClose();
      setCloseMsg("Aylık kapanış tamamlandı.");
      load();
    } catch (err) {
      setCloseMsg(getErrorMessage(err));
    } finally {
      setClosing(false);
    }
  };

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/10 text-destructive my-4 rounded border px-4 py-3 text-sm font-medium">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex justify-center py-14">
        <Loader2 className="text-primary size-10 animate-spin" />
      </div>
    );
  }

  const payoutPct =
    data.total_revenue > 0 ? Math.round((data.total_commissions_paid / data.total_revenue) * 1000) / 10 : 0;
  const payoutOver = payoutPct > 50;
  const activePct = data.total_users > 0 ? Math.round((data.active_users / data.total_users) * 100) : 0;
  const ciroValue = period === "all" ? shortTl(data.total_revenue) : "—";

  const alerts: { tone: string; text: string }[] = [];
  if (data.pending_users > 0) alerts.push({ tone: "amber", text: `${data.pending_users} üye yerleştirmeyi bekliyor.` });
  if (pending.count > 0) alerts.push({ tone: "red", text: `${pending.count} çekim talebi onay bekliyor (${shortTl(pending.amount)}).` });
  if (payoutOver) alerts.push({ tone: "red", text: `Payout oranı hedefin (%50) üzerinde: %${payoutPct} — marj kontrolü gerekli.` });
  if (alerts.length === 0) alerts.push({ tone: "green", text: "Sistem sağlıklı — dikkat gerektiren durum yok." });

  const toneCls: Record<string, string> = {
    green: "border-[#2E7D32]/40 bg-[#2E7D32]/10 text-[#2E7D32]",
    red: "border-red-500/40 bg-red-500/10 text-red-600",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-primary-dark text-[11px] font-extrabold tracking-[0.18em] uppercase">Yönetim</p>
          <h1 className="text-foreground mt-0.5 text-2xl font-extrabold tracking-tight">Genel Bakış</h1>
          <p className="text-muted-foreground text-sm">Organizasyonun finansal sağlığı ve kritik metrikler.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMonthlyClose}
          disabled={closing}
          className="text-amber-600 border-amber-500/50 hover:bg-amber-500/10"
        >
          {closing ? <Loader2 className="size-4 animate-spin" /> : <Activity className="size-4" />}
          {closing ? "Çalışıyor…" : "Aylık Kapanış"}
        </Button>
      </div>

      {closeMsg && (
        <div className="border-sky-500/40 bg-sky-500/10 text-sky-700 rounded border px-4 py-2 text-sm font-medium">
          {closeMsg}
        </div>
      )}

      {/* KPI kartları */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* 1) Toplam Ciro (Günlük/Haftalık/Aylık) */}
        <KpiShell label="Toplam Ciro" icon={<Wallet className="text-primary size-4.5" />} iconCls="bg-primary/10">
          <p className="text-primary-dark text-2xl font-black tracking-tight">{ciroValue}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "cursor-pointer rounded border px-1.5 py-0.5 text-[10px] font-bold transition-colors",
                  period === p.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period !== "all" && (
            <p className="text-muted-foreground mt-1.5 text-[10px]">
              Dönem dökümü için backend raporu bekleniyor.
            </p>
          )}
        </KpiShell>

        {/* 2) Dağıtılan Komisyon */}
        <KpiShell label="Dağıtılan Komisyon" icon={<Coins className="text-[#0288D1] size-4.5" />} iconCls="bg-[#0288D1]/10">
          <p className="text-primary-dark text-2xl font-black tracking-tight">{shortTl(data.total_commissions_paid)}</p>
          <p className="text-muted-foreground mt-1 text-[11px]">Üyelere hakediş olarak aktarılan toplam tutar</p>
        </KpiShell>

        {/* 3) Net Kâr + Payout Oranı */}
        <KpiShell label="Net Kâr / Payout" icon={<TrendingUp className="text-[#6A008A] size-4.5" />} iconCls="bg-[#6A008A]/10">
          <p className="text-primary-dark text-2xl font-black tracking-tight">{shortTl(data.net_profit)}</p>
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
              <span className="text-muted-foreground uppercase">Payout Oranı</span>
              <span className={cn(payoutOver ? "text-red-600" : "text-[#2E7D32]")}>%{payoutPct}</span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500",
                  payoutOver ? "bg-red-500" : "bg-[#2E7D32]"
                )}
                style={{ width: `${Math.min(100, payoutPct)}%` }}
              />
            </div>
            {payoutOver && (
              <p className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-red-600">
                <AlertTriangle className="size-3" /> Hedef ≤ %50 aşıldı!
              </p>
            )}
          </div>
        </KpiShell>

        {/* 4) Bekleyen Çekimler */}
        <KpiShell label="Bekleyen Çekimler" icon={<Clock className="text-amber-600 size-4.5" />} iconCls="bg-amber-500/10">
          <p className="text-primary-dark text-2xl font-black tracking-tight">{pending.count} adet</p>
          <p className="text-muted-foreground mt-1 text-[11px]">Tutar: {shortTl(pending.amount)}</p>
        </KpiShell>

        {/* 5) Aktif Üye */}
        <KpiShell label="Aktif Üye" icon={<Users className="text-[#2E7D32] size-4.5" />} iconCls="bg-[#2E7D32]/10">
          <p className="text-primary-dark text-2xl font-black tracking-tight">{data.active_users.toLocaleString("tr-TR")}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
              <div className="bg-[#2E7D32] h-full rounded-full" style={{ width: `${activePct}%` }} />
            </div>
            <span className="text-muted-foreground text-[10px] font-bold">%{activePct}</span>
          </div>
        </KpiShell>
      </div>

      {/* Uyarılar */}
      <div className="flex flex-col gap-1.5">
        {alerts.map((a, i) => (
          <div key={i} className={cn("flex items-center gap-2 rounded border px-3 py-2 text-sm font-semibold", toneCls[a.tone])}>
            <AlertTriangle className="size-4 shrink-0" />
            {a.text}
          </div>
        ))}
      </div>

      {/* Son kayıtlar + çekimler */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="border-border bg-card rounded border p-3">
          <p className="text-muted-foreground mb-2 text-[11px] font-extrabold tracking-wide uppercase">Son Kayıtlar</p>
          {data.recent_users.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">Kayıt yok.</p>
          ) : (
            <div className="flex flex-col">
              {data.recent_users.slice(0, 5).map((u) => (
                <div key={u.id} className="border-border flex items-center justify-between border-b py-2 text-sm last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-foreground truncate font-semibold">{u.name}</p>
                    <p className="text-muted-foreground truncate text-xs">{u.member_code} · {u.email}</p>
                  </div>
                  <Badge className={cn("rounded-full border-0 px-2 py-0.5 text-[10px]", u.role === "admin" || u.role === "super_admin" ? "bg-amber-500/20 text-amber-600" : "bg-sky-500/20 text-sky-700")}>
                    {u.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-border bg-card rounded border p-3">
          <p className="text-muted-foreground mb-2 text-[11px] font-extrabold tracking-wide uppercase">Son Çekim Talepleri</p>
          {data.recent_withdraw_requests.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">Çekim talebi yok.</p>
          ) : (
            <div className="flex flex-col">
              {data.recent_withdraw_requests.slice(0, 5).map((w) => (
                <div key={w.id} className="border-border flex items-center justify-between border-b py-2 text-sm last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-foreground font-semibold">#{w.id} · {tl(w.amount)}</p>
                    <p className="text-muted-foreground text-xs">Kullanıcı #{w.user_id}</p>
                  </div>
                  <Badge className={cn("rounded-full border-0 px-2 py-0.5 text-[10px]", w.status === "approved" ? "bg-[#2E7D32]/15 text-[#2E7D32]" : w.status === "rejected" ? "bg-red-500/15 text-red-600" : "bg-amber-500/15 text-amber-600")}>
                    {w.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
