"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import Pagination from "@/components/tables/Pagination";
import {
  listAuditLogs,
  listCorrectionLogs,
  getErrorMessage,
  type AuditLogsResponse,
  type AuditLogRow,
} from "@/lib/api";

const PAGE_SIZE = 50;

const TABS = [
  { key: "audit", label: "İşlem Kayıtları" },
  { key: "correction", label: "Düzeltme Kayıtları" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const dateTR = (s?: string | null) =>
  s ? new Date(s).toLocaleString("tr-TR") : "—";

// Eylem adına göre rozet rengi (bazı yaygın eylemler için).
const actionColor = (a: string) => {
  const l = a.toLowerCase();
  if (l.includes("delete") || l.includes("sil") || l.includes("iptal")) return "red" as const;
  if (l.includes("update") || l.includes("duzenle") || l.includes("guncelle") || l.includes("edit"))
    return "amber" as const;
  if (l.includes("system") || l.includes("otomatik") || l.includes("batch"))
    return "purple" as const;
  return "blue" as const;
};

export default function DenetimKayitlariPage() {
  const [tab, setTab] = useState<TabKey>("audit");
  const [audit, setAudit] = useState<AuditLogsResponse | null>(null);
  const [corr, setCorr] = useState<AuditLogsResponse | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [corrPage, setCorrPage] = useState(1);
  const [actionInput, setActionInput] = useState("");
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Eylem filtresi: 350 ms debounce ile action query'sine dönüşür (server-side).
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setAction(actionInput.trim());
      setAuditPage(1);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [actionInput]);

  const loadAudit = useCallback(() => {
    listAuditLogs({
      limit: PAGE_SIZE,
      offset: (auditPage - 1) * PAGE_SIZE,
      action: action || undefined,
    })
      .then((d) => {
        setAudit(d);
        setNotice("");
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [auditPage, action]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const loadCorr = useCallback(() => {
    listCorrectionLogs({ limit: PAGE_SIZE, offset: (corrPage - 1) * PAGE_SIZE })
      .then((d) => {
        setCorr(d);
        setNotice("");
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [corrPage]);

  useEffect(() => {
    loadCorr();
  }, [loadCorr]);

  const active = tab === "audit" ? audit : corr;
  if (active === null) {
    return <AdminSpinner label="Denetim kayıtları yükleniyor…" />;
  }

  const totalPages = Math.max(1, Math.ceil(active.total / PAGE_SIZE));

  return (
    <div>
      <AdminHeader
        title="Denetim Kayıtları"
        subtitle="Yönetici işlem geçmişi ve düzeltme kayıtları — tüm yetkili işlemler izlenebilir."
        actions={
          <AdminBadge color="gray">
            {tab === "audit" ? `${audit?.total ?? 0} işlem` : `${corr?.total ?? 0} düzeltme`}
          </AdminBadge>
        }
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              tab === t.key
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "audit" ? (
        <AdminCard
          title="İşlem Kayıtları"
          subtitle={`Sayfa ${auditPage} / ${totalPages} — eylem adına göre filtreleyebilirsiniz.`}
          actions={
            <input
              className={`${inputCls} w-64`}
              placeholder="Eylem adı filtrele (örn. update, delete)…"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
            />
          }
        >
          <LogTable logs={audit?.logs ?? []} noticeKey={`audit-${action}`} />
          <div className="mt-4 flex justify-end">
            <Pagination
              currentPage={auditPage}
              totalPages={totalPages}
              onPageChange={(p) => setAuditPage(p)}
            />
          </div>
        </AdminCard>
      ) : (
        <AdminCard
          title="Düzeltme Kayıtları"
          subtitle={`Sayfa ${corrPage} / ${totalPages} — PV/CV, cüzdan ve üye kayıtlarında yapılan düzeltmeler.`}
        >
          <LogTable logs={corr?.logs ?? []} noticeKey={`corr-${corrPage}`} />
          <div className="mt-4 flex justify-end">
            <Pagination
              currentPage={corrPage}
              totalPages={totalPages}
              onPageChange={(p) => setCorrPage(p)}
            />
          </div>
        </AdminCard>
      )}
    </div>
  );
}

function LogTable({ logs, noticeKey }: { logs: AuditLogRow[]; noticeKey: string }) {
  if (logs.length === 0) {
    return <AdminEmpty>Bu kriterlere uyan kayıt bulunamadı.</AdminEmpty>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-white/[0.02]">
          <tr>
            <th className={thCls}>ID</th>
            <th className={thCls}>Yönetici</th>
            <th className={thCls}>Eylem</th>
            <th className={thCls}>Hedef</th>
            <th className={thCls}>Gerekçe</th>
            <th className={thCls}>Tarih</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {logs.map((log) => (
            <tr key={`${noticeKey}-${log.id}`} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
              <td className={`${tdCls} font-mono text-xs text-gray-500 dark:text-gray-400`}>
                #{log.id}
              </td>
              <td className={tdCls}>
                <div className="font-medium text-gray-800 dark:text-white/90">
                  {log.admin_name || "Sistem"}
                </div>
                {log.admin_id != null && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">#{log.admin_id}</div>
                )}
              </td>
              <td className={tdCls}>
                <AdminBadge color={actionColor(log.action)}>{log.action || "—"}</AdminBadge>
              </td>
              <td className={`${tdCls} text-gray-700 dark:text-gray-300`}>
                {log.target_type || "—"}
                {log.target_id != null && (
                  <span className="ml-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                    #{log.target_id}
                  </span>
                )}
              </td>
              <td className={`${tdCls} max-w-xs truncate text-gray-600 dark:text-gray-400`} title={log.reason || undefined}>
                {log.reason || "—"}
              </td>
              <td className={`${tdCls} whitespace-nowrap text-xs text-gray-500 dark:text-gray-400`}>
                {dateTR(log.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
