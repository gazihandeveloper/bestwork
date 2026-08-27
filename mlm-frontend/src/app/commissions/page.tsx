"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Medal, Network, Receipt, Users, Loader2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { getDashboard } from "@/services/api";
import RequireAuth from "@/components/RequireAuth";
import EmptyState from "@/components/EmptyState";
import type { Commission } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const TYPE_META: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  referral: { label: "Referans", badge: "border-[#2E7D32]/50 text-[#2E7D32]", icon: <Users size={15} /> },
  binary: { label: "Binary", badge: "border-[#0288D1]/50 text-[#0277BD]", icon: <Network size={15} /> },
  matching: { label: "Matching", badge: "border-amber-500/50 text-amber-600", icon: <Medal size={15} /> },
};

function CommissionsContent() {
  const searchParams = useSearchParams();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ referral: 0, binary: 0, matching: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState(searchParams.get("type") || "");
  const [page, setPage] = useState(0);
  const limit = 10;

  useEffect(() => {
    Promise.all([
      api.get<{ commissions: Commission[]; total: number }>("/commissions", {
        params: { type: type || undefined, limit, offset: page * limit },
      }),
      getDashboard(),
    ])
      .then(([res, dash]) => {
        setCommissions(res.data.commissions);
        setTotal(res.data.total);
        setTotals({
          referral: dash.total_referral_earnings,
          binary: dash.total_binary_earnings,
          matching: dash.total_matching_earnings,
        });
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [type, page]);

  const summaryCards = [
    { label: "Toplam Prim", value: totals.referral + totals.binary + totals.matching, highlight: true },
    { label: "Referans", value: totals.referral },
    { label: "Binary", value: totals.binary },
    { label: "Matching", value: totals.matching },
  ];

  return (
    <div className="py-3">
      <h1 className="text-primary-dark mb-3 text-2xl font-extrabold">Prim Detayları</h1>

      {/* Özet kartları */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {summaryCards.map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded border p-2",
              s.highlight
                ? "border-transparent bg-gradient-to-br from-primary to-primary-dark text-white"
                : "border-border bg-card"
            )}
          >
            <p
              className={cn(
                "text-[11px] font-bold uppercase",
                s.highlight ? "text-white/85" : "text-muted-foreground"
              )}
            >
              {s.label.toLocaleUpperCase("tr-TR")}
            </p>
            <p
              className={cn(
                "text-lg font-extrabold",
                s.highlight ? "text-white" : "text-primary-dark"
              )}
            >
              {tl(s.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {[
          { value: "", label: "Tümü" },
          { value: "referral", label: "Referans" },
          { value: "binary", label: "Binary" },
          { value: "matching", label: "Matching" },
        ].map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setType(t.value);
              setPage(0);
            }}
            className={cn(
              "cursor-pointer rounded px-3 py-1.5 text-sm font-semibold transition-colors",
              type === t.value
                ? "bg-primary text-white"
                : "border-border bg-card text-foreground border hover:bg-accent"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mb-2 rounded border px-3 py-2 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="text-primary size-8 animate-spin" />
        </div>
      ) : commissions.length === 0 ? (
        <div className="border-border bg-card rounded border p-4">
          <EmptyState icon={<Receipt size={48} />} message="Bu filtrede komisyon kaydı yok." />
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded border">
          <div className="overflow-x-auto">
            <table className="min-w-[560px] w-full text-sm">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-3 py-2 text-left text-[13px] font-bold">Tarih</th>
                  <th className="px-3 py-2 text-left text-[13px] font-bold">Tür</th>
                  <th className="px-3 py-2 text-right text-[13px] font-bold">İlgili CV</th>
                  <th className="px-3 py-2 text-right text-[13px] font-bold">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c, i) => {
                  const meta = TYPE_META[c.type] ?? {
                    label: c.type,
                    badge: "border-border text-muted-foreground",
                    icon: <Receipt size={15} />,
                  };
                  return (
                    <tr
                      key={c.id}
                      className={cn(
                        "border-border border-b transition-colors hover:bg-secondary/50",
                        i % 2 === 1 && "bg-secondary-light/40"
                      )}
                    >
                      <td className="px-3 py-2 text-[13.5px] whitespace-nowrap">
                        {new Date(c.created_at).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={cn("gap-1 font-semibold", meta.badge)}>
                          {meta.icon}
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground px-3 py-2 text-right text-[13.5px]">
                        {c.related_cv != null ? `${c.related_cv.toLocaleString("tr-TR")} CV` : "—"}
                      </td>
                      <td className="text-primary-dark px-3 py-2 text-right text-sm font-extrabold">
                        +{tl(c.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sayfalama */}
          <div className="border-border flex items-center justify-between border-t px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              {commissions.length === 0
                ? "0-0 / 0 kayıt"
                : `${page * limit + 1}-${Math.min((page + 1) * limit, total)} / ${total.toLocaleString("tr-TR")} kayıt`}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="border-border bg-card text-foreground hover:bg-accent cursor-pointer rounded border px-3 py-1 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40"
              >
                Önceki
              </button>
              <button
                type="button"
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage((p) => p + 1)}
                className="border-border bg-card text-foreground hover:bg-accent cursor-pointer rounded border px-3 py-1 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommissionsPageInner() {
  return (
    <Suspense fallback={null}>
      <CommissionsContent />
    </Suspense>
  );
}

export default function CommissionsPage() {
  return (
    <RequireAuth>
      <CommissionsPageInner />
    </RequireAuth>
  );
}
