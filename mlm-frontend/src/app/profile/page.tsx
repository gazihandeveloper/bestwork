"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Copy } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import AppSnackbar from "@/components/AppSnackbar";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { getDashboard } from "@/services/api";
import type { Wallet, UserDashboard } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function ProfileContent() {
  const { user, logout } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [dash, setDash] = useState<UserDashboard | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  useEffect(() => {
    api
      .get<{ wallet: Wallet }>("/wallet")
      .then((res) => setWallet(res.data.wallet))
      .catch(() => setWallet(null));
    getDashboard()
      .then(setDash)
      .catch(() => setDash(null));
  }, []);

  const copyMemberCode = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.member_code);
      setSnackbar({ open: true, message: "Üye kodu kopyalandı" });
    } catch {
      setSnackbar({ open: true, message: "Kopyalama başarısız" });
    }
  };

  const infoItems = [
    { label: "Ad Soyad", value: user?.name || "-" },
    { label: "E-posta", value: user?.email || "-" },
    { label: "Paket", value: dash?.user.package || "-" },
    { label: "Rütbe", value: dash?.user.rank || "-" },
    { label: "Durum", value: user?.is_in_pending_pool ? "Yerleşim bekliyor" : "Aktif" },
  ];

  return (
    <div className="py-3">
      <h1 className="text-primary-dark mb-3 text-2xl font-extrabold">Profilim</h1>

      <div className="border-border bg-card max-w-2xl rounded border p-4">
        <h2 className="mb-2.5 text-lg font-bold">Hesap Bilgileri</h2>

        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="border-primary/40 text-primary cursor-pointer py-1"
            onClick={copyMemberCode}
          >
            Üye Numaranız: {user?.member_code}
            <Copy className="size-3.5" />
          </Badge>
          <Badge className="bg-secondary text-secondary-foreground">
            {user?.role === "admin" ? "Admin" : user?.role === "customer" ? "Müşteri" : "Üye"}
          </Badge>
        </div>

        {/* Başarı Raporu */}
        <Button asChild size="sm" className="text-primary-dark mb-2.5 rounded bg-white font-extrabold shadow-sm hover:bg-white/90">
          <Link href="/success-report">
            <BarChart3 className="size-4" />
            🏅 Başarı Raporu
          </Link>
        </Button>

        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {infoItems.map((item) => (
            <div key={item.label} className="bg-background rounded p-1.5">
              <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                {item.label}
              </p>
              <p className="text-sm font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="border-border my-2 h-px w-full" />

        <div className="space-y-0.5 text-sm">
          <p>
            <strong>Bakiye:</strong> {wallet?.balance.toFixed(2)} TL
          </p>
          <p>
            <strong>Chip:</strong> {wallet?.chip_balance.toFixed(2)} TL
          </p>
          <p>
            <strong>Toplam Kazanç:</strong> {wallet?.total_earned.toFixed(2)} TL
          </p>
        </div>
        <Button variant="outline" className="text-destructive border-destructive/50 mt-2 rounded" onClick={logout}>
          Çıkış Yap
        </Button>
      </div>

      <AppSnackbar open={snackbar.open} message={snackbar.message} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}
