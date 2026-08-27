"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { listLeadershipBonuses, getErrorMessage } from "@/services/api";
import type { Commission } from "@/services/api";
import { Button } from "@/components/ui/button";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

function LeadershipBonusContent() {
  const [items, setItems] = useState<Commission[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  useEffect(() => {
    listLeadershipBonuses(limit, offset)
      .then((d) => {
        setItems(d.commissions);
        setTotal(d.total);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div className="py-4">
      <h1 className="text-primary-dark text-2xl font-extrabold">Liderlik Primi (Matching)</h1>
      <p className="text-muted-foreground mb-3 text-sm">
        Ekibinizin binary kazançlarından 5 nesle kadar aldığınız liderlik primleri.
      </p>

      <div className="border-border bg-card mb-3 flex flex-wrap items-center justify-between gap-1 rounded border p-3">
        <div>
          <p className="text-muted-foreground text-sm">Toplam Liderlik Primi</p>
          <p className="text-primary-dark text-xl font-extrabold">
            {tl(items.reduce((sum, c) => sum + c.amount, 0))}
          </p>
        </div>
        <p className="text-muted-foreground text-sm">Toplam {total} kayıt</p>
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
      ) : items.length === 0 ? (
        <div className="border-border bg-card rounded border p-4">
          <p className="text-muted-foreground text-sm">Henüz liderlik primi kazanmadınız.</p>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b bg-accent/50">
                  <th className="px-3 py-2 text-left font-bold">Tarih</th>
                  <th className="px-3 py-2 text-right font-bold">Kazanç</th>
                  <th className="px-3 py-2 text-left font-bold">Kazandıran Üye</th>
                  <th className="px-3 py-2 text-right font-bold">İlgili CV</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-border hover:bg-accent/40 border-b transition-colors">
                    <td className="px-3 py-2">{new Date(c.created_at).toLocaleString("tr-TR")}</td>
                    <td className="text-[#2E7D32] px-3 py-2 text-right font-bold">+{tl(c.amount)}</td>
                    <td className="px-3 py-2">{c.from_user_id != null ? `Üye #${c.from_user_id}` : "-"}</td>
                    <td className="px-3 py-2 text-right">{c.related_cv ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-2 flex justify-between">
        <Button variant="outline" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - limit))}>
          Önceki
        </Button>
        <Button variant="outline" disabled={offset + limit >= total} onClick={() => setOffset((o) => o + limit)}>
          Sonraki
        </Button>
      </div>
    </div>
  );
}

export default function LeadershipBonusPage() {
  return (
    <RequireAuth>
      <LeadershipBonusContent />
    </RequireAuth>
  );
}
