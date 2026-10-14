"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  inputCls,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import Pagination from "@/components/tables/Pagination";
import {
  listWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  listAdminUsers,
  getErrorMessage,
  type AdminUser,
  type WithdrawRequest,
} from "@/lib/api";

const PAGE_SIZE = 20;

type StatusFilter = "" | "pending" | "approved" | "rejected";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "", label: "Tümü" },
  { key: "pending", label: "Bekleyen" },
  { key: "approved", label: "Onaylanan" },
  { key: "rejected", label: "Reddedilen" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

const STATUS_COLORS: Record<string, "green" | "red" | "amber" | "gray"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

const fmtMoney = (n: number): string =>
  n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ₺";

const fmtDate = (s?: string | null): string =>
  s ? new Date(s).toLocaleString("tr-TR") : "—";

export default function CekimlerPage() {
  const [items, setItems] = useState<WithdrawRequest[] | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arama kutusu: 350 ms debounce ile sorguya dönüşür.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPage(1);
      setQ(search.trim());
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search]);

  // Üye adı/kodu eşlemesi için üye listesi (bir kez yüklenir).
  useEffect(() => {
    listAdminUsers({ limit: 500 })
      .then((d) => setUsers(d.users ?? []))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const load = useCallback(async () => {
    try {
      const list = await listWithdrawals();
      setItems(list);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // user_id → üye eşlemesi (member_name/member_code yoksa devreye girer).
  const userMap = new Map<number, AdminUser>(users.map((u) => [u.id, u]));

  const memberName = (w: WithdrawRequest): string | null =>
    w.member_name || userMap.get(w.user_id)?.name || null;

  const memberCode = (w: WithdrawRequest): string | null =>
    w.member_code || userMap.get(w.user_id)?.member_code || null;

  // Özet kartları — filtreden bağımsız, tüm liste üzerinden hesaplanır.
  const pendingList = (items ?? []).filter((w) => w.status === "pending");
  const pendingTotal = pendingList.reduce((sum, w) => sum + w.amount, 0);
  const approvedTotal = (items ?? [])
    .filter((w) => w.status === "approved")
    .reduce((sum, w) => sum + w.amount, 0);

  const countBy = (key: string): number =>
    key === "" ? (items ?? []).length : (items ?? []).filter((w) => w.status === key).length;

  // Yerel filtreleme (durum sekmesi + üye no/kodu araması) ve sıralama (en yeni önce).
  const needle = q.toLowerCase();
  const filtered = (items ?? [])
    .filter((w) => !status || w.status === status)
    .filter((w) => {
      if (!needle) return true;
      const code = (memberCode(w) ?? "").toLowerCase();
      return String(w.user_id).includes(needle) || code.includes(needle);
    })
    .sort(
      (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const act = async (w: WithdrawRequest, action: "approve" | "reject") => {
    const onayla = action === "approve";
    const soru = `#${w.id} numaralı, ${fmtMoney(w.amount)} tutarındaki çekim talebi ${
      onayla ? "onaylanacak" : "reddedilecek"
    }. Emin misiniz?`;
    if (!window.confirm(soru)) return;
    setBusyId(w.id);
    setBusyAction(action);
    setError("");
    setNotice("");
    try {
      if (onayla) await approveWithdrawal(w.id);
      else await rejectWithdrawal(w.id);
      setNotice(
        `#${w.id} numaralı çekim talebi ${onayla ? "onaylandı" : "reddedildi"}.`
      );
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  };

  if (error && items === null) return <AdminAlert kind="error">{error}</AdminAlert>;
  if (items === null) return <AdminSpinner label="Çekim talepleri yükleniyor…" />;

  return (
    <div>
      <AdminHeader
        title="Çekim Talepleri"
        subtitle="Üyelerden gelen para çekme taleplerini görün, onaylayın veya reddedin."
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Bekleyen Talep"
          value={String(pendingList.length)}
          hint="onay bekleyen talep adedi"
        />
        <Stat
          label="Bekleyen Tutar"
          value={fmtMoney(pendingTotal)}
          hint="onay bekleyen toplam tutar"
        />
        <Stat
          label="Onaylanan Tutar"
          value={fmtMoney(approvedTotal)}
          hint="onaylanmış toplam tutar"
        />
      </div>

      <AdminCard
        title="Talep Listesi"
        subtitle={`Sayfa ${page} / ${totalPages} — ${filtered.length} kayıt`}
        actions={
          <input
            className={`${inputCls} w-64`}
            placeholder="Üye no veya üye kodu ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key || "all"}
              onClick={() => {
                setStatus(t.key);
                setPage(1);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                status === t.key
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
              }`}
            >
              {t.label}
              <span className="ml-1.5 opacity-70">{countBy(t.key)}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          items.length === 0 ? (
            <AdminEmpty>Henüz çekim talebi bulunmuyor.</AdminEmpty>
          ) : (
            <AdminEmpty>Kriterlere uyan çekim talebi bulunamadı.</AdminEmpty>
          )
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className={thCls}>Talep No</th>
                    <th className={thCls}>Üye</th>
                    <th className={`${thCls} text-right`}>Tutar</th>
                    <th className={thCls}>Yöntem</th>
                    <th className={thCls}>Durum</th>
                    <th className={thCls}>Talep Tarihi</th>
                    <th className={thCls}>İşlem Tarihi</th>
                    <th className={`${thCls} text-right`}>İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paged.map((w) => {
                    const name = memberName(w);
                    const code = memberCode(w);
                    const busy = busyId === w.id;
                    return (
                      <tr
                        key={w.id}
                        className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                      >
                        <td className={`${tdCls} whitespace-nowrap font-mono text-xs`}>
                          #{w.id}
                        </td>
                        <td className={tdCls}>
                          <div className="font-medium text-gray-800 dark:text-white/90">
                            {name ?? `Üye #${w.user_id}`}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {code ? (
                              <>
                                <span className="font-mono">{code}</span> ·{" "}
                              </>
                            ) : null}
                            ID: {w.user_id}
                          </div>
                        </td>
                        <td
                          className={`${tdCls} whitespace-nowrap text-right font-medium text-gray-800 dark:text-white/90`}
                        >
                          {fmtMoney(w.amount)}
                        </td>
                        <td className={`${tdCls} whitespace-nowrap`}>
                          {w.method || "—"}
                        </td>
                        <td className={tdCls}>
                          <AdminBadge color={STATUS_COLORS[w.status] ?? "gray"}>
                            {STATUS_LABELS[w.status] ?? w.status}
                          </AdminBadge>
                        </td>
                        <td
                          className={`${tdCls} whitespace-nowrap text-xs text-gray-500 dark:text-gray-400`}
                        >
                          {fmtDate(w.requested_at)}
                        </td>
                        <td
                          className={`${tdCls} whitespace-nowrap text-xs text-gray-500 dark:text-gray-400`}
                        >
                          {fmtDate(w.processed_at)}
                        </td>
                        <td className={`${tdCls} text-right`}>
                          {w.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <AdminBtn
                                size="xs"
                                variant="success"
                                disabled={busy}
                                onClick={() => act(w, "approve")}
                              >
                                {busy && busyAction === "approve"
                                  ? "İşleniyor…"
                                  : "Onayla"}
                              </AdminBtn>
                              <AdminBtn
                                size="xs"
                                variant="danger"
                                disabled={busy}
                                onClick={() => act(w, "reject")}
                              >
                                {busy && busyAction === "reject"
                                  ? "İşleniyor…"
                                  : "Reddet"}
                              </AdminBtn>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex justify-end">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </AdminCard>
    </div>
  );
}

// Özet kartı — guvenlik-seridi sayfasındaki kart stiliyle uyumlu.
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-[#1E293B]">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</div>}
    </div>
  );
}
