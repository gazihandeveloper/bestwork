"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, ShoppingBag, Shield, ChevronRight } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { getSponsorTree, getErrorMessage } from "@/services/api";
import type { SponsorTreeNode } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FlatRow {
  node: SponsorTreeNode;
  level: number;
}

// Ağacı düz listeye çevirir (derinlik sınırıyla birlikte)
function flatten(node: SponsorTreeNode, depth: number, level = 0, out: FlatRow[] = []): FlatRow[] {
  out.push({ node, level });
  if (level < depth) {
    node.children.forEach((c) => flatten(c, depth, level + 1, out));
  }
  return out;
}

function roleMeta(role: string): { label: string; badge: string; icon: React.ReactNode } {
  if (role === "admin")
    return { label: "Admin", badge: "border-amber-500/60 text-amber-600", icon: <Shield className="size-3.5" /> };
  if (role === "customer")
    return { label: "Müşteri", badge: "border-[#2E7D32]/50 text-[#2E7D32]", icon: <ShoppingBag className="size-3.5" /> };
  return { label: "Üye", badge: "border-[#0288D1]/50 text-[#0277BD]", icon: <Users className="size-3.5" /> };
}

function SponsorTreeContent() {
  const [root, setRoot] = useState<SponsorTreeNode | null>(null);
  const [depth, setDepth] = useState(3);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSponsorTree(undefined, depth)
      .then(setRoot)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [depth]);

  const rows = root ? flatten(root, depth) : [];

  return (
    <div className="py-4">
      <h1 className="text-primary-dark text-2xl font-extrabold">Referans ve Ekip Listesi</h1>
      <p className="text-muted-foreground mb-2 text-sm">
        Sponsorluğunuzla gelen üyeler ve onların referansları. Müşteriler de zincirde görünür.
      </p>

      <div className="mb-3 flex items-center gap-1">
        <span className="text-muted-foreground text-sm">Derinlik:</span>
        {[1, 2, 3, 4, 5].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setLoading(true);
              setDepth(d);
            }}
            className={cn(
              "cursor-pointer rounded px-3 py-1.5 text-sm font-semibold transition-colors",
              depth === d
                ? "bg-primary text-white"
                : "border-border bg-card text-foreground border hover:bg-accent"
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive mb-2 rounded border px-3 py-2 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="text-primary size-10 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="border-border bg-card rounded border p-4">
          <p className="text-muted-foreground text-sm">Henüz üye yok.</p>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded border">
          <div className="flex flex-col">
            {rows.map(({ node, level }) => {
              const meta = roleMeta(node.role);
              return (
                <div
                  key={node.user_id}
                  className={cn(
                    "border-border flex flex-wrap items-center justify-between gap-1 border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-accent/40",
                    level > 0 && "bg-muted/30"
                  )}
                  style={{ paddingLeft: `${12 + level * 20}px` }}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    {level > 0 && <ChevronRight className="text-muted-foreground size-3.5 shrink-0 opacity-60" />}
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        {node.name}
                        <Badge variant="outline" className={cn("gap-1 py-0 text-[10px]", meta.badge)}>
                          {meta.icon}
                          {meta.label}
                        </Badge>
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {node.member_code}
                        {node.email ? ` · ${node.email}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {node.package_name && (
                      <Badge variant="outline" className="border-border text-muted-foreground py-0 text-[10px] font-semibold">
                        {node.package_name.toLocaleUpperCase("tr-TR")}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        "py-0 text-[10px] font-semibold",
                        node.is_active
                          ? "border-[#2E7D32]/50 text-[#2E7D32]"
                          : "border-destructive/50 text-destructive"
                      )}
                    >
                      {node.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                    <Badge variant="outline" className="border-primary/40 text-primary py-0 text-[10px] font-semibold">
                      {node.total_pv_accumulated} PV
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
