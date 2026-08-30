"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import { listBinaryTransactions, getErrorMessage } from "@/services/api";
import type { BinaryTransactionsResponse } from "@/services/api";
import RequireAuth from "@/components/RequireAuth";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  add: { label: "Ekleme", badge: "border-[#2E7D32]/50 text-[#2E7D32]", icon: <MaterialIcon name="TrendingUp" size={15} /> },
  deduct: { label: "Eşleşme Düşümü", badge: "border-destructive/50 text-destructive", icon: <MaterialIcon name="trending_down" size={15} /> },
  reset: { label: "Sıfırlama", badge: "border-amber-500/50 text-amber-600", icon: <MaterialIcon name="RefreshCcw" size={15} /> },
};

function BinaryTransactionsContent() {
  const [data, setData] = useState<BinaryTransactionsResponse | null>(null);
  const [position, setPosition] = useState("");
  const [txType, setTxType] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 10;

  useEffect(() => {
    listBinaryTransactions({
      position: (position as "L" | "R") || undefined,
      transaction_type: (txType as "add" | "deduct" | "reset") || undefined,
      limit,
      offset: page * limit,
    })
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [position, txType, page]);

  const addTotal =
    data?.transactions.filter((t) => t.transaction_type === "add").reduce((s, t) => s + t.cv, 0) ?? 0;
  const deductTotal =
    data?.transactions.filter((t) => t.transaction_type === "deduct").reduce((s, t) => s + t.cv, 0) ?? 0;

  const summaryCards = [
    { label: "Toplam Hareket", value: data?.total ?? 0, highlight: true },
    { label: "Ekleme (sayfa)", value: addTotal },
    { label: "Eşleşme Düşümü (sayfa)", value: deductTotal },
  ];

  const filterBtn = (active: boolean) =>
    cn(
      "cursor-pointer rounded px-3 py-1.5 text-sm font-semibold transition-colors",
      active
        ? "bg-primary text-white"
        : "border-border bg-card text-foreground border hover:bg-accent"
    );

  return (
    <div className="py-3">
      <h1 className="text-primary-dark mb-1 text-2xl font-extrabold">Binary Hareketleri</h1>
      <p className="text-muted-foreground mb-3 text-sm">
        Sol ve sağ hatlarınızdaki PV/CV ekleme ve eşleşme düşümlerinin geçmişi.
      </p>

      {/* Özet kartları */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
              {typeof s.value === "number" && !Number.isInteger(s.value)
                ? `${s.value.toLocaleString("tr-TR")} CV`
                : s.value.toLocaleString("tr-TR")}
            </p>
          </div>
        ))}
      </div>

      {/* Filtreler */}
      <div className="mb-2 flex flex-wrap gap-1">
        {[
          { group: "pos", value: "", label: "Tüm Hatlar" },
          { group: "pos", value: "L", label: "Sol" },
          { group: "pos", value: "R", label: "Sağ" },
        ].map((t) => (
          <button
            key={`pos-${t.value}`}
            type="button"
            onClick={() => {
              setPosition(t.value);
              setPage(0);
            }}
            className={filterBtn(position === t.value)}
          >
            {t.label}
          </button>
        ))}
        {[
          { group: "type", value: "", label: "Tümü" },
          { group: "type", value: "add", label: "Ekleme" },
          { group: "type", value: "deduct", label: "Düşüm" },
        ].map((t) => (
          <button
            key={`type-${t.value}`}
            type="button"
            onClick={() => {
              setTxType(t.value);
              setPage(0);
            }}
            className={filterBtn(txType === t.value)}
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
          <MaterialIcon name="Loader2" className="text-primary size-8 animate-spin" />
        </div>
      ) : data && data.transactions.length === 0 ? (
        <div className="border-border bg-card rounded border p-4">
          <EmptyState icon={<MaterialIcon name="Network" size={48} />} message="Henüz binary hareketi yok." />
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded border">
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-3 py-2 text-left text-[13px] font-bold">Tarih</th>
                  <th className="px-3 py-2 text-left text-[13px] font-bold">Hat</th>
                  <th className="px-3 py-2 text-left text-[13px] font-bold">İşlem</th>
                  <th className="px-3 py-2 text-right text-[13px] font-bold">PV</th>
                  <th className="px-3 py-2 text-right text-[13px] font-bold">CV</th>
                  <th className="px-3 py-2 text-left text-[13px] font-bold">Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {data?.transactions.map((t, i) => {
                  const meta = TYPE_META[t.transaction_type] ?? {
                    label: t.transaction_type,
                    badge: "border-border text-muted-foreground",
                    icon: <MaterialIcon name="Network" size={15} />,
                  };
                  return (
                    <tr
                      key={t.id}
                      className={cn(
                        "border-border border-b transition-colors hover:bg-secondary/50",
                        i % 2 === 1 && "bg-secondary-light/40"
                      )}
                    >
                      <td className="px-3 py-2 text-[13.5px] whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="border-primary/40 text-primary font-semibold">
                          {t.position === "L" ? "Sol Hat" : "Sağ Hat"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={cn("gap-1 font-semibold", meta.badge)}>
                          {meta.icon}
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right text-[13.5px]">
                        {t.pv > 0 ? (
                          <span className="text-[#2E7D32] text-sm font-bold">+{t.pv.toLocaleString("tr-TR")} PV</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-[13.5px]">
                        {t.cv > 0 ? (
                          <span className="text-primary-dark text-sm font-bold">+{t.cv.toLocaleString("tr-TR")} CV</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-muted-foreground max-w-[260px] px-3 py-2 text-[12.5px]">
                        <span className="block truncate">
                          {t.description || "—"}
                          {t.related_order_id != null && ` · Sipariş #${t.related_order_id}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data && (
            <div className="border-border flex items-center justify-between border-t px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {data.transactions.length === 0
                  ? "0-0 / 0 hareket"
                  : `${page * limit + 1}-${Math.min((page + 1) * limit, data.total)} / ${data.total.toLocaleString("tr-TR")} hareket`}
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
                  disabled={(page + 1) * limit >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="border-border bg-card text-foreground hover:bg-accent cursor-pointer rounded border px-3 py-1 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BinaryTransactionsPage() {
  return (
    <RequireAuth>
      <BinaryTransactionsContent />
    </RequireAuth>
  );
}
