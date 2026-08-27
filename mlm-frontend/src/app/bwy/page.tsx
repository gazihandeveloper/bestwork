"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Loader2,
  TrendingUp,
  Users,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Coins,
  Activity,
  ShieldAlert,
  UserPlus,
  LayoutDashboard,
  UserCheck,
  Package as PackageIcon,
  Image as ImageIcon,
  Gift,
  Building2,
  Receipt,
  Landmark,
  Shield,
} from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { getAdminDashboard, getErrorMessage, monthlyClose } from "@/services/api";
import type { AdminDashboard } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

// İzole yönetim paneli menüsü
const ADMIN_MENU = [
  { href: "/bwy", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  { href: "/admin/pending", label: "Bekleyenler", icon: UserCheck },
  { href: "/admin/products", label: "Ürünler", icon: PackageIcon },
  { href: "/admin/hero-slides", label: "Hero Slider", icon: ImageIcon },
  { href: "/admin/benefits", label: "Avantajlar", icon: Gift },
  { href: "/admin/corporate", label: "Kurumsal", icon: Building2 },
  { href: "/admin/withdrawals", label: "Çekimler", icon: Receipt },
  { href: "/admin/payment-notifications", label: "Ödeme Bildirimleri", icon: Landmark },
];

function Overview() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [closeMsg, setCloseMsg] = useState("");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const handleMonthlyClose = async () => {
    setCloseMsg("");
    setClosing(true);
    try {
      await monthlyClose();
      setCloseMsg("Aylık kapanış tamamlandı.");
      const d = await getAdminDashboard();
      setData(d);
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
      <div className="flex justify-center py-10">
        <Loader2 className="text-primary size-10 animate-spin" />
      </div>
    );
  }

  const activePct = data.total_users > 0 ? Math.round((data.active_users / data.total_users) * 100) : 0;

  const financial = [
    { label: "Toplam Ciro", value: tl(data.total_revenue), icon: <Wallet className="size-5" />, tone: "green" },
    { label: "Bu Ay Komisyon", value: tl(data.monthly_commissions), icon: <Coins className="size-5" />, tone: "blue" },
    { label: "Bekleyen Hakediş", value: tl(data.pending_commissions), icon: <Clock className="size-5" />, tone: "amber" },
    { label: "Net Kâr", value: tl(data.net_profit), icon: <TrendingUp className="size-5" />, tone: "violet" },
  ];

  const members = [
    { label: "Toplam Üye", value: data.total_users, icon: <Users className="size-5" /> },
    { label: "Aktif", value: data.active_users, icon: <CheckCircle2 className="size-5" /> },
    { label: "Bekleyen Havuz", value: data.pending_users, icon: <Clock className="size-5" /> },
    { label: "Sipariş", value: data.total_orders, icon: <Package className="size-5" /> },
  ];

  const alerts: { icon: React.ReactNode; title: string; desc: string; tone: string; href?: string }[] = [];
  if (data.pending_users > 0)
    alerts.push({
      icon: <UserPlus className="size-4" />,
      title: `${data.pending_users} üye yerleştirmeyi bekliyor`,
      desc: "Bekleyenler havuzunda ağaca yerleştirilmeyi bekleyen üyeler var.",
      tone: "amber",
      href: "/admin/pending",
    });
  if (data.pending_commissions > 0)
    alerts.push({
      icon: <Clock className="size-4" />,
      title: `${tl(data.pending_commissions)} bekleyen hakediş`,
      desc: "Onaylanmış ancak ödenmeyi bekleyen çekim talepleri var.",
      tone: "blue",
      href: "/admin/withdrawals",
    });
  if (data.recent_withdraw_requests.some((w) => w.status === "pending"))
    alerts.push({
      icon: <ShieldAlert className="size-4" />,
      title: "Ödeme talebi onay bekliyor",
      desc: "Onay bekleyen çekim talepleri mevcut — inceleyin.",
      tone: "violet",
      href: "/admin/withdrawals",
    });
  if (alerts.length === 0)
    alerts.push({
      icon: <CheckCircle2 className="size-4" />,
      title: "Sistem sağlıklı",
      desc: "Şu anda dikkat gerektiren bir uyarı yok.",
      tone: "green",
    });

  const growth = data.registration_growth ?? [];
  const maxCount = Math.max(1, ...growth.map((g) => g.count));

  const toneCls: Record<string, string> = {
    green: "bg-[#2E7D32]/10 text-[#2E7D32]",
    blue: "bg-[#0288D1]/10 text-[#0277BD]",
    amber: "bg-amber-500/10 text-amber-600",
    violet: "bg-[#7B1FA2]/10 text-[#7B1FA2]",
    red: "bg-destructive/10 text-destructive",
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-primary-dark text-2xl font-extrabold">Genel Bakış</h1>
          <p className="text-muted-foreground text-sm">Tüm organizasyonun sağlığını tek bakışta görün.</p>
        </div>
        <Button variant="outline" className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10" onClick={handleMonthlyClose} disabled={closing}>
          {closing && <Loader2 className="size-4 animate-spin" />}
          {closing ? "Çalışıyor..." : "Aylık Kapanış"}
        </Button>
      </div>

      {closeMsg && (
        <div className="border-[#0288D1]/50 bg-[#0288D1]/10 text-[#0277BD] mb-3 rounded border px-3 py-2 text-sm font-medium">
          {closeMsg}
        </div>
      )}

      {/* Finansal özet */}
      <div className="mb-3">
        <h2 className="text-muted-foreground mb-2 text-xs font-extrabold tracking-wide uppercase">Finansal Özet</h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {financial.map((f) => (
            <div key={f.label} className="border-border bg-card rounded border p-3">
              <div className={cn("mb-1.5 flex size-9 items-center justify-center rounded", toneCls[f.tone])}>
                {f.icon}
              </div>
              <p className="text-muted-foreground text-[11px] font-bold uppercase">{f.label}</p>
              <p className="text-primary-dark text-lg font-extrabold">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Üye büyüme grafiği + üye özeti */}
      <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-12">
        <div className="border-border bg-card rounded border p-4 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-muted-foreground flex items-center gap-1.5 text-xs font-extrabold tracking-wide uppercase">
              <Activity className="size-4" />
              Üye Büyüme (Son 14 Gün)
            </h2>
            <Badge variant="outline" className="border-[#2E7D32]/50 text-[#2E7D32]">
              Aktif %{activePct}
            </Badge>
          </div>
          {growth.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">Henüz kayıt verisi yok.</p>
          ) : (
            <div className="flex h-[150px] items-end gap-1">
              {growth.map((g) => (
                <div key={g.date} className="group relative flex-1">
                  <div
                    className="bg-primary mx-auto w-full rounded-t transition-all duration-300 group-hover:bg-primary-dark"
                    style={{ height: `${Math.max(4, (g.count / maxCount) * 130)}px` }}
                  />
                  <div className="text-muted-foreground mt-1 truncate text-center text-[8px]" title={g.date}>
                    {g.date.slice(8)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <h2 className="text-muted-foreground mb-2 text-xs font-extrabold tracking-wide uppercase">Üyeler</h2>
          <div className="grid grid-cols-2 gap-2">
            {members.map((m) => (
              <div key={m.label} className="border-border bg-card rounded border p-3">
                <div className="text-primary mb-1.5 flex size-8 items-center justify-center rounded bg-secondary/60">
                  {m.icon}
                </div>
                <p className="text-primary-dark text-lg font-extrabold">{m.value.toLocaleString("tr-TR")}</p>
                <p className="text-muted-foreground text-[11px] font-semibold">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sistem uyarıları */}
      <div className="mb-3">
        <h2 className="text-muted-foreground mb-2 text-xs font-extrabold tracking-wide uppercase">Sistem Uyarıları</h2>
        <div className="flex flex-col gap-1.5">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={cn(
                "border-border bg-card flex items-center gap-2.5 rounded border px-3 py-2.5",
                a.href && "cursor-pointer transition-colors hover:bg-accent/40"
              )}
            >
              {a.href ? (
                <Link href={a.href} className="flex w-full items-center gap-2.5">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded", toneCls[a.tone])}>
                    {a.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{a.title}</span>
                    <span className="text-muted-foreground block truncate text-xs">{a.desc}</span>
                  </span>
                </Link>
              ) : (
                <>
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded", toneCls[a.tone])}>
                    {a.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{a.title}</span>
                    <span className="text-muted-foreground block truncate text-xs">{a.desc}</span>
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Son kayıtlar + çekimler */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <div className="border-border bg-card rounded border p-4 lg:col-span-6">
          <h2 className="text-muted-foreground mb-2 text-xs font-extrabold tracking-wide uppercase">Son Kayıtlar</h2>
          {data.recent_users.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">Kayıt yok.</p>
          ) : (
            <div className="flex flex-col">
              {data.recent_users.slice(0, 6).map((u) => (
                <div key={u.id} className="border-border flex items-center justify-between border-b py-1.5 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{u.name}</p>
                    <p className="text-muted-foreground text-xs">{u.member_code} · {u.email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      u.role === "admin" ? "border-amber-500/60 text-amber-600" : "border-[#0288D1]/50 text-[#0277BD]"
                    )}
                  >
                    {u.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-border bg-card rounded border p-4 lg:col-span-6">
          <h2 className="text-muted-foreground mb-2 text-xs font-extrabold tracking-wide uppercase">Son Çekim Talepleri</h2>
          {data.recent_withdraw_requests.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">Çekim talebi yok.</p>
          ) : (
            <div className="flex flex-col">
              {data.recent_withdraw_requests.slice(0, 6).map((w) => (
                <div key={w.id} className="border-border flex items-center justify-between border-b py-1.5 last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">#{w.id} · {tl(w.amount)}</p>
                    <p className="text-muted-foreground text-xs">Kullanıcı #{w.user_id}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      w.status === "approved" ? "border-[#2E7D32]/50 text-[#2E7D32]"
                      : w.status === "rejected" ? "border-destructive/50 text-destructive"
                      : "border-amber-500/50 text-amber-600"
                    )}
                  >
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

export default function BwyPanel() {
  const pathname = usePathname();

  return (
    <RequireAuth adminOnly>
      <div className="mx-auto w-full px-4 py-4 md:w-[90%]">
        {/* Üst bar */}
        <div className="border-border bg-card mb-4 flex flex-wrap items-center justify-between gap-2 rounded border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary flex size-10 items-center justify-center rounded">
              <Shield className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-primary-dark text-lg leading-tight font-extrabold">BestWork Yönetim</h1>
              <p className="text-muted-foreground text-xs">İzole yönetim paneli</p>
            </div>
          </div>
          <Button asChild variant="outline" className="rounded">
            <Link href="/">← Siteye Dön</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Sol sidebar */}
          <aside className="md:col-span-2">
            <nav className="border-border bg-card rounded border p-2 md:sticky md:top-24">
              {ADMIN_MENU.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded px-3 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-primary text-white"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* İçerik */}
          <div className="md:col-span-10">
            {pathname === "/bwy" ? <Overview /> : (
              <div className="border-border bg-card rounded border p-10 text-center">
                <p className="text-muted-foreground">Yönetim sayfası seçin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
