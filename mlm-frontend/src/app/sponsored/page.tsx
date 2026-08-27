"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { listSponsored, getErrorMessage } from "@/services/api";
import type { User } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function SponsoredContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSponsored()
      .then(setUsers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="text-primary size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-4">
      <h1 className="text-primary-dark text-2xl font-extrabold">Sponsor Olduklarım</h1>
      <p className="text-muted-foreground mb-3 text-sm">
        Sponsorluğunuzu yaptığınız üyeler ({users.length} kişi).
      </p>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mb-3 rounded border px-3 py-2 text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="border-border bg-card rounded border p-4">
          <p className="text-muted-foreground text-sm">Henüz sponsor olduğunuz üye yok.</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {users.map((u) => (
          <div
            key={u.id}
            className="border-border bg-card flex flex-wrap items-center justify-between gap-1 rounded border p-3"
          >
            <div>
              <p className="text-sm font-semibold">{u.name}</p>
              <p className="text-muted-foreground text-xs">{u.email} · {u.member_code}</p>
            </div>
            <div className="flex flex-wrap gap-0.5">
              <Badge
                variant="outline"
                className={cn(
                  u.is_in_pending_pool
                    ? "border-amber-500/50 text-amber-600"
                    : "border-[#2E7D32]/50 text-[#2E7D32]"
                )}
              >
                {u.is_in_pending_pool ? "Bekliyor" : "Ağaçta"}
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground">
                {u.total_pv_accumulated} PV
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SponsoredPage() {
  return (
    <RequireAuth>
      <SponsoredContent />
    </RequireAuth>
  );
}
