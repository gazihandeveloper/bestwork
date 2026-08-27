"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { listPendingUsers, placePendingUser, getErrorMessage } from "@/services/api";
import type { User } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function PendingContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const load = () => {
    listPendingUsers()
      .then(setUsers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const place = async (userId: number, position: "L" | "R", name: string) => {
    setPlacing(userId);
    setError("");
    try {
      await placePendingUser(userId, position);
      setSnackbar(`${name}, ${position === "L" ? "sol" : "sağ"} bacağa yerleştirildi.`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPlacing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="text-primary size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-4">
      <h1 className="text-primary-dark text-2xl font-extrabold">Bekleyenler Havuzu</h1>
      <p className="text-muted-foreground mb-3 text-sm">
        Sponsorluğunuzu yaptığınız ve henüz ağaca yerleştirmediğiniz üyeler. Sol veya sağ bacağa yerleştirin.
      </p>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mb-2 rounded border px-3 py-2 text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="border-border bg-card rounded border p-4">
          <p className="text-muted-foreground text-sm">Bekleyen üyeniz yok.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {users.map((u) => {
          const pendingMs = u.pending_since && now > 0 ? now - new Date(u.pending_since).getTime() : 0;
          const days = Math.floor(pendingMs / DAY_MS);
          const overdue = days > 10;

          return (
            <div
              key={u.id}
              className="border-border bg-card flex flex-wrap items-center justify-between gap-1 rounded border p-3"
            >
              <div>
                <div className="flex items-center gap-1">
                  <h3 className="text-base font-bold">{u.name}</h3>
                  {overdue && <AlertTriangle className="text-destructive size-4" />}
                </div>
                <p className="text-muted-foreground text-sm">{u.email} · {u.member_code}</p>
                <div className="mt-0.5 flex flex-wrap gap-0.5">
                  <Badge variant="outline" className="border-primary/40 text-primary font-semibold">
                    {u.total_pv_accumulated} PV
                  </Badge>
                  <Badge variant="outline" className="border-secondary-dark/40 text-secondary-foreground font-semibold">
                    {u.total_cv_accumulated} CV
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-semibold",
                      overdue ? "border-destructive/50 text-destructive" : "border-border text-muted-foreground"
                    )}
                  >
                    {days} gündür bekliyor
                  </Badge>
                </div>
                {overdue && (
                  <p className="text-destructive mt-0.5 text-xs font-bold">10 günden fazladır bekliyor!</p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="default"
                  className="bg-[#2E7D32] hover:bg-[#256a2a]"
                  disabled={placing === u.id}
                  onClick={() => place(u.id, "L", u.name)}
                >
                  Sola Yerleştir
                </Button>
                <Button disabled={placing === u.id} onClick={() => place(u.id, "R", u.name)}>
                  Sağa Yerleştir
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bildirim */}
      {snackbar && (
        <div className="fixed bottom-5 left-1/2 z-[1400] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="bg-foreground text-background flex items-center gap-2 rounded px-4 py-3 text-sm font-semibold shadow-lg">
            <CheckCircle2 className="size-5 shrink-0" />
            <span className="flex-1">{snackbar}</span>
            <button
              aria-label="Kapat"
              className="cursor-pointer text-lg leading-none opacity-70 hover:opacity-100"
              onClick={() => setSnackbar("")}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PendingPage() {
  return (
    <RequireAuth>
      <PendingContent />
    </RequireAuth>
  );
}
