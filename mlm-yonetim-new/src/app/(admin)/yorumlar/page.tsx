"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
} from "@/components/admin/AdminUI";
import {
  listAdminReviews,
  approveAdminReview,
  unapproveAdminReview,
  deleteAdminReview,
  getErrorMessage,
  type AdminProductReview,
  type AdminReviewCounts,
} from "@/lib/api";

const fmtDate = (s: string) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return (
    d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  );
};

const Stars = ({ rating }: { rating: number }) => {
  const n = Math.max(0, Math.min(5, rating));
  return (
    <span className="text-sm tracking-wide">
      <span className="text-amber-400">{"★".repeat(n)}</span>
      <span className="text-gray-300">{"☆".repeat(5 - n)}</span>
    </span>
  );
};

type Status = "pending" | "approved" | "all";
type Notice = { kind: "success" | "error"; text: string } | null;

export default function YorumlarPage() {
  const [status, setStatus] = useState<Status>("pending");
  const [items, setItems] = useState<AdminProductReview[]>([]);
  const [counts, setCounts] = useState<AdminReviewCounts>({ pending: 0, approved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const showNotice = useCallback((kind: "success" | "error", text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => {
      setNotice((n) => (n && n.text === text ? null : n));
    }, 3500);
  }, []);

  const load = useCallback((st: Status) => {
    setLoading(true);
    setError("");
    listAdminReviews(st)
      .then((d) => {
        setItems(d.items ?? []);
        if (d.counts) setCounts(d.counts);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  const onApprove = async (r: AdminProductReview) => {
    setBusyId(r.id);
    try {
      await approveAdminReview(r.id);
      showNotice("success", "Yorum onaylandı — artık sitede yayında.");
      load(status);
    } catch (e) {
      showNotice("error", getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const onUnapprove = async (r: AdminProductReview) => {
    setBusyId(r.id);
    try {
      await unapproveAdminReview(r.id);
      showNotice("success", "Yorum yayından kaldırıldı.");
      load(status);
    } catch (e) {
      showNotice("error", getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (r: AdminProductReview) => {
    if (!window.confirm("Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?")) return;
    setBusyId(r.id);
    try {
      await deleteAdminReview(r.id);
      showNotice("success", "Yorum silindi.");
      load(status);
    } catch (e) {
      showNotice("error", getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const filters: { key: Status; label: string; count: number; cls: string; activeCls: string }[] = [
    {
      key: "pending",
      label: "Bekleyen",
      count: counts.pending,
      cls: "border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300",
      activeCls: "ring-2 ring-amber-400",
    },
    {
      key: "approved",
      label: "Onaylı",
      count: counts.approved,
      cls: "border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
      activeCls: "ring-2 ring-emerald-400",
    },
    {
      key: "all",
      label: "Tümü",
      count: counts.total,
      cls: "border-brand-200 bg-brand-50/70 text-brand-700 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-300",
      activeCls: "ring-2 ring-brand-400",
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Yorumlar"
        subtitle="Üyelerin ürün yorumları — onaylanmayan yorumlar sitede yayınlanmaz."
      />

      {error && <AdminAlert kind="error">{error}</AdminAlert>}
      {notice && <AdminAlert kind={notice.kind}>{notice.text}</AdminAlert>}

      {/* Filtre kartları */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatus(f.key)}
            className={`rounded-2xl border p-4 text-left transition hover:shadow-theme-sm ${f.cls} ${
              status === f.key ? f.activeCls : ""
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
              {f.label}
            </div>
            <div className="mt-1 text-2xl font-bold">{f.count}</div>
          </button>
        ))}
      </div>

      <AdminCard
        title={
          status === "pending"
            ? "Bekleyen Yorumlar"
            : status === "approved"
              ? "Onaylı Yorumlar"
              : "Tüm Yorumlar"
        }
        subtitle="Onayladığınız yorumlar ürün sayfasında anında yayınlanır."
      >
        {loading ? (
          <AdminSpinner label="Yorumlar yükleniyor…" />
        ) : items.length === 0 ? (
          <AdminEmpty>
            {status === "pending"
              ? "Bekleyen yorum yok — her şey temiz!"
              : status === "approved"
                ? "Henüz onaylı yorum yok."
                : "Henüz yorum yok."}
          </AdminEmpty>
        ) : (
          <div className="space-y-3">
            {items.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-gray-800 dark:text-white/90">
                        {r.author}
                      </span>
                      <AdminBadge color={r.is_approved ? "green" : "amber"}>
                        {r.is_approved ? "Onaylı" : "Bekliyor"}
                      </AdminBadge>
                      <span className="text-xs text-gray-400">{fmtDate(r.created_at)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Stars rating={r.rating} />
                      <span className="text-xs font-medium text-gray-400">
                        · {r.product_name || `Ürün #${r.product_id}`}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
                      {r.comment}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {r.is_approved ? (
                      <AdminBtn
                        size="xs"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => onUnapprove(r)}
                      >
                        ↩️ Yayından Kaldır
                      </AdminBtn>
                    ) : (
                      <AdminBtn
                        size="xs"
                        variant="success"
                        disabled={busyId === r.id}
                        onClick={() => onApprove(r)}
                      >
                        ✔️ Onayla
                      </AdminBtn>
                    )}
                    <AdminBtn
                      size="xs"
                      variant="danger"
                      disabled={busyId === r.id}
                      onClick={() => onDelete(r)}
                    >
                      🗑️ Sil
                    </AdminBtn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
