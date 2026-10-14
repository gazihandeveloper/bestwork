"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  inputCls,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import { listProducts, getErrorMessage, type Product } from "@/lib/api";

// Stok değeri runtime'da bulunmayabilir (Product.stok opsiyonel olabilir).
// Tip içinde "number" görünse de yokluğa karşı güvenli okuyoruz.
const stockOf = (p: Product): number | null => {
  const raw = (p as unknown as Record<string, unknown>).stock;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
};

const fmtCount = (n: number) => n.toLocaleString("tr-TR");

const fmtMoney = (v: number) =>
  Number.isFinite(v)
    ? v.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0,00";

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "brand" | "green" | "amber" | "red";
}) {
  const map = {
    brand:
      "border-brand-200 bg-brand-50/70 dark:border-brand-500/25 dark:bg-brand-500/10",
    green:
      "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/10",
    amber:
      "border-warning-200 bg-warning-50/70 dark:border-warning-500/25 dark:bg-warning-500/10",
    red: "border-red-200 bg-red-50/70 dark:border-red-500/25 dark:bg-red-500/10",
  }[tone];
  const text = {
    brand: "text-brand-700 dark:text-brand-300",
    green: "text-emerald-700 dark:text-emerald-300",
    amber: "text-warning-700 dark:text-warning-300",
    red: "text-red-700 dark:text-red-300",
  }[tone];
  const labelText = {
    brand: "text-brand-700/80 dark:text-brand-300/80",
    green: "text-emerald-700/80 dark:text-emerald-300/80",
    amber: "text-warning-700/80 dark:text-warning-300/80",
    red: "text-red-700/80 dark:text-red-300/80",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${map}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide ${labelText}`}>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${text}`}>{value}</div>
      {hint && (
        <div className={`mt-1 text-xs ${labelText}`}>{hint}</div>
      )}
    </div>
  );
}

export default function StokPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  // Ürün kayıtlarının herhangi birinde geçerli stok alanı var mı?
  const hasStock = useMemo(
    () => (products ?? []).some((p) => stockOf(p) !== null),
    [products]
  );

  const list = products ?? [];

  const totals = useMemo(() => {
    let active = 0;
    let total = 0;
    let warning = 0;
    for (const p of list) {
      const s = stockOf(p);
      if (s === null) continue;
      if (s > 0) active += 1;
      total += s;
      if (s < 10) warning += 1; // Az (1-9) + Tükendi (0)
    }
    return { active, total, warning };
  }, [list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return list.filter((p) => {
      if (lowOnly) {
        const s = stockOf(p);
        if (s === null || s >= 10) return false;
      }
      if (!q) return true;
      const hay = `${p.name ?? ""} ${p.sku ?? ""}`.toLocaleLowerCase("tr-TR");
      return hay.includes(q);
    });
  }, [list, query, lowOnly]);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (error && products === null)
    return <AdminAlert kind="error">{error}</AdminAlert>;
  if (products === null) return <AdminSpinner label="Stok verileri yükleniyor…" />;

  return (
    <div>
      <AdminHeader
        title="Stok"
        subtitle="Ürün stok ve envanter görünümü — tükenen ve azalan ürünleri tek bakışta takip edin."
      />

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      {!hasStock && (
        <AdminAlert kind="warning">
          Ürün kayıtlarında stok alanı tanımlı değil; stok takibi için ürün
          modeline stok alanı eklenmeli. Bu durumda stok kolonu ve özetleri
          “—” olarak gösterilir.
        </AdminAlert>
      )}

      {/* Özet kartları */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Toplam Ürün"
          value={fmtCount(list.length)}
          hint="katalogdaki toplam ürün"
          tone="brand"
        />
        <Stat
          label="Aktif Ürün"
          value={hasStock ? fmtCount(totals.active) : "—"}
          hint={hasStock ? "stokta olan (stok > 0)" : "stok verisi yok"}
          tone="green"
        />
        {hasStock && (
          <Stat
            label="Toplam Stok Adedi"
            value={fmtCount(totals.total)}
            hint="tüm ürünlerin toplam stok miktarı"
            tone="amber"
          />
        )}
        {hasStock && (
          <Stat
            label="Stok Uyarısı"
            value={fmtCount(totals.warning)}
            hint="azalan (1–9) ve tükenen (0) ürün sayısı"
            tone={totals.warning > 0 ? "red" : "green"}
          />
        )}
      </div>

      <AdminCard
        title="Stok Listesi"
        subtitle={`${filtered.length} ürün${lowOnly ? " · az/tükenen filtreli" : ""}`}
        actions={
          <input
            className={`${inputCls} w-64`}
            placeholder="Ürün adı veya SKU ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      >
        {/* Az / Tükenen filtresi */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setLowOnly(false)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              !lowOnly
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08]"
            }`}
          >
            Tümü ({list.length})
          </button>
          <button
            type="button"
            onClick={() => setLowOnly(true)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              lowOnly
                ? "bg-warning-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08]"
            }`}
          >
            Az / Tükenen ({hasStock ? totals.warning : 0})
          </button>
        </div>

        {filtered.length === 0 ? (
          <AdminEmpty>
            {query || lowOnly
              ? "Filtreye uyan ürün bulunamadı."
              : "Henüz ürün kaydı yok. Önce ürün ekleyin."}
          </AdminEmpty>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className={thCls}>Ürün Adı</th>
                  <th className={thCls}>Kategori</th>
                  <th className={thCls}>Fiyat</th>
                  <th className={thCls}>Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((p) => {
                  const s = stockOf(p);
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <td className={`${tdCls} font-medium text-gray-800 dark:text-white/90`}>
                        {p.name}
                        {p.sku ? (
                          <span className="ml-2 text-xs font-normal text-gray-400">
                            {p.sku}
                          </span>
                        ) : null}
                      </td>
                      <td className={tdCls}>
                        {p.category_name || p.category ? (
                          <AdminBadge color="blue">
                            {p.category_name || p.category}
                          </AdminBadge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className={`${tdCls} font-medium`}>
                        ₺{fmtMoney(p.price ?? 0)}
                      </td>
                      <td className={tdCls}>
                        {s === null ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums text-gray-800 dark:text-white/90">
                              {fmtCount(s)}
                            </span>
                            {s === 0 ? (
                              <AdminBadge color="red">Tükendi</AdminBadge>
                            ) : s < 10 ? (
                              <AdminBadge color="amber">Az</AdminBadge>
                            ) : (
                              <AdminBadge color="green">Yeterli</AdminBadge>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
