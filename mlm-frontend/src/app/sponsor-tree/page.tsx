"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, ShoppingBag, Shield } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { listSponsored, getErrorMessage } from "@/services/api";
import type { User } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function roleMeta(role: string): { label: string; badge: string; icon: React.ReactNode } {
  if (role === "admin" || role === "super_admin")
    return { label: "Admin", badge: "border-amber-500/60 text-amber-600", icon: <Shield className="size-3.5" /> };
  if (role === "customer")
    return { label: "Müşteri", badge: "border-[#2E7D32]/50 text-[#2E7D32]", icon: <ShoppingBag className="size-3.5" /> };
  return { label: "Üye", badge: "border-[#0288D1]/50 text-[#0277BD]", icon: <Users className="size-3.5" /> };
}

// Sponsor ve ekip listesi — tek sorgu (hızlı, 524 zaman aşımı yok).
function SponsorTreeContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSponsored()
      .then(setUsers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="py-4">
      <h1 className="text-primary-dark text-2xl font-extrabold">Referans ve Ekip Listesi</h1>
      <p className="text-muted-foreground mb-3 text-sm">
        Sponsorluğunuzla gelen üyeler ve onların referansları ({users.length} kişi). Müşteriler de zincirde görünür.
      </p>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mb-2 rounded border px-3 py-2 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="text-primary size-10 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="border-border bg-card rounded border p-4">
          <p className="text-muted-foreground text-sm">Henüz üye yok.</p>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded border">
          <div className="flex flex-col">
            {users.map((u) => {
              const meta = roleMeta(u.role);
              return (
                <div
                  key={u.id}
                  className="border-border flex flex-wrap items-center justify-between gap-1 border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-accent/40"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        {u.name}
                        <Badge variant="outline" className={cn("gap-1 py-0 text-[10px]", meta.badge)}>
                          {meta.icon}
                          {meta.label}
                        </Badge>
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {u.member_code}
                        {u.email ? ` · ${u.email}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {u.package_id != null && (
                      <Badge variant="outline" className="border-border text-muted-foreground py-0 text-[10px] font-semibold">
                        Paketli
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        "py-0 text-[10px] font-semibold",
                        u.is_active
                          ? "border-[#2E7D32]/50 text-[#2E7D32]"
                          : "border-destructive/50 text-destructive"
                      )}
                    >
                      {u.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                    <Badge variant="outline" className="border-primary/40 text-primary py-0 text-[10px] font-semibold">
                      {u.total_pv_accumulated} PV
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SponsorTreePage() {
  return (
    <RequireAuth>
      <SponsorTreeContent />
    </RequireAuth>
  );
}
