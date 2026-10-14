"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import {
  monthlyClose,
  listJobs,
  runBonusJob,
  listFlashoutLogs,
  getErrorMessage,
  type JobRun,
  type FlashoutLog,
} from "@/lib/api";

type BadgeColor = "green" | "red" | "amber" | "blue" | "gray" | "purple";
type PageAlert = { kind: "success" | "warning" | "error"; text: string };

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleString("tr-TR") : "—";

const JOB_STATUS: Record<string, { label: string; color: BadgeColor }> = {
  queued: { label: "Sırada", color: "amber" },
  running: { label: "Çalışıyor", color: "blue" },
  done: { label: "Tamamlandı", color: "green" },
  failed: { label: "Başarısız", color: "red" },
};

const jobStatus = (s: string): { label: string; color: BadgeColor } =>
  JOB_STATUS[s] ?? { label: s || "—", color: "gray" };

function jobPercent(j: JobRun): number {
  if (j.total > 0)
    return Math.min(100, Math.max(0, Math.round((j.progress / j.total) * 100)));
  return j.status === "done" ? 100 : 0;
}

// Flash-out logları dinamik alanlarla gelir; tarih/tutar benzeri alanları
// okunabilir biçime dönüştürmek için anahtar desenleri.
const DATE_KEY_RE = /(tarih|_at$|_date$|^date|_time$|^time)/i;
const AMOUNT_KEY_RE =
  /(tutar|amount|total|bonus|usd|try|price|balance|paid|commission|kazanc|wallet)/i;

function fmtVal(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Evet" : "Hayır";
  if (typeof v === "number")
    return AMOUNT_KEY_RE.test(key) ? v.toLocaleString("tr-TR") : String(v);
  if (typeof v === "string") {
    if (DATE_KEY_RE.test(key) || /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})/.test(v)) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString("tr-TR");
    }
    return v;
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function logColumns(logs: FlashoutLog[]): string[] {
  const keys = ["id", "user_id"];
  const seen = new Set(keys);
  for (const l of logs) {
    for (const k of Object.keys(l)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  return keys;
}

const colLabel = (k: string) =>
  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function AySonuIslemleriPage() {
  const [alert, setAlert] = useState<PageAlert | null>(null);

  const [closing, setClosing] = useState(false);
  const [bonusRunning, setBonusRunning] = useState(false);

  const [jobs, setJobs] = useState<JobRun[] | null>(null);
  const [jobsError, setJobsError] = useState("");
  const [jobsBusy, setJobsBusy] = useState(false);

  const [logs, setLogs] = useState<FlashoutLog[] | null>(null);
  const [logsError, setLogsError] = useState("");

  const loadJobs = useCallback(async () => {
    setJobsBusy(true);
    setJobsError("");
    try {
      setJobs(await listJobs(20));
    } catch (err) {
      setJobsError(getErrorMessage(err));
    } finally {
      setJobsBusy(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsError("");
    try {
      setLogs(await listFlashoutLogs());
    } catch (err) {
      setLogsError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadJobs();
    loadLogs();
  }, [loadJobs, loadLogs]);

  // Devam eden/iş kuyruğundaki iş varsa ilerlemeyi tablodan izlemek için
  // periyodik olarak yenile.
  const hasActiveJob = useMemo(
    () => (jobs ?? []).some((j) => j.status === "running" || j.status === "queued"),
    [jobs]
  );

  useEffect(() => {
    if (!hasActiveJob) return;
    const t = setInterval(() => {
      loadJobs();
    }, 5000);
    return () => clearInterval(t);
  }, [hasActiveJob, loadJobs]);

  const runMonthlyClose = async () => {
    const ok = window.confirm(
      "Aylık kapanış çalıştırılsın mı?\n\n" +
        "Bu işlem cari ayın kapanışını (bonus, kariyer vb.) yapar.\n" +
        "Aynı ay içinde tekrar çalıştırırsanız herhangi bir değişiklik YAPILMAZ (idempotent)."
    );
    if (!ok) return;
    setClosing(true);
    setAlert(null);
    try {
      const res = await monthlyClose();
      const base = res.executed
        ? "Aylık kapanış tamamlandı"
        : "Bu ay için zaten çalıştırılmış";
      setAlert({
        kind: res.executed ? "success" : "warning",
        text: res.message ? `${base} — ${res.message}` : base,
      });
    } catch (err) {
      setAlert({ kind: "error", text: getErrorMessage(err) });
    } finally {
      setClosing(false);
    }
  };

  const startBonusJob = async () => {
    setBonusRunning(true);
    setAlert(null);
    try {
      const res = await runBonusJob();
      setAlert({
        kind: "success",
        text: `Toplu binary eşleşme işi başlatıldı (İş #${res.job_id} · ${res.status}). İlerlemeyi aşağıdaki "İşler (Jobs)" tablosundan izleyebilirsiniz.`,
      });
      await loadJobs();
    } catch (err) {
      setAlert({ kind: "error", text: getErrorMessage(err) });
    } finally {
      setBonusRunning(false);
    }
  };

  const logCols = useMemo(() => (logs ? logColumns(logs) : []), [logs]);

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Ay Sonu İşlemleri"
        subtitle="Aylık kapanışı çalıştırın, toplu binary eşleşme işini başlatın; iş ve flash-out kayıtlarını izleyin."
      />

      {/* 1. Bilgilendirme / idempotentlik uyarısı */}
      <AdminCard
        title="Bilgilendirme"
        subtitle="Aylık kapanış ve toplu binary eşleşme işlemleri hakkında"
      >
        <AdminAlert kind="warning">
          <strong>Aylık kapanış</strong> her ayın <strong>1&apos;i 00:00</strong>&apos;da
          otomatik çalışır; aşağıdaki buton yalnızca manuel/acil tetikleme içindir.
          İşlem <strong>idempotent</strong>tir: aynı ay içinde tekrar çalıştırılırsa
          herhangi bir değişiklik yapılmaz, mevcut kayıtlar korunur. Toplu binary
          eşleşme ise arka planda bir iş (job) olarak çalışır ve ilerlemesi
          &quot;İşler (Jobs)&quot; tablosundan izlenir.
        </AdminAlert>
      </AdminCard>

      {/* 2-3. İşlemler */}
      <AdminCard
        title="İşlemler"
        subtitle="Kapanış ve toplu eşleşme işlerini başlatın"
      >
        {alert && <AdminAlert kind={alert.kind}>{alert.text}</AdminAlert>}
        <div className="flex flex-wrap gap-2">
          <AdminBtn variant="primary" onClick={runMonthlyClose} disabled={closing || bonusRunning}>
            {closing ? "Çalışıyor…" : "Aylık Kapanışı Çalıştır"}
          </AdminBtn>
          <AdminBtn variant="info" onClick={startBonusJob} disabled={closing || bonusRunning}>
            {bonusRunning ? "Başlatılıyor…" : "Toplu Binary Eşleşme Başlat"}
          </AdminBtn>
        </div>
      </AdminCard>

      {/* 4. İşler (Jobs) */}
      <AdminCard
        title="İşler (Jobs)"
        subtitle="Arka plan işlerinin durumu ve ilerlemesi"
        actions={
          <AdminBtn variant="outline" onClick={loadJobs} disabled={jobsBusy}>
            {jobsBusy ? "Yenileniyor…" : "Yenile"}
          </AdminBtn>
        }
      >
        {jobsError ? (
          <AdminAlert kind="error">{jobsError}</AdminAlert>
        ) : jobs === null ? (
          <AdminSpinner label="İşler yükleniyor…" />
        ) : jobs.length === 0 ? (
          <AdminEmpty>Henüz iş (job) kaydı yok.</AdminEmpty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th className={thCls}>ID</th>
                  <th className={thCls}>İş Türü</th>
                  <th className={thCls}>Durum</th>
                  <th className={thCls}>İlerleme</th>
                  <th className={thCls}>Başlangıç</th>
                  <th className={thCls}>Bitiş</th>
                  <th className={thCls}>Hata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {jobs.map((j) => {
                  const st = jobStatus(j.status);
                  const pct = jobPercent(j);
                  return (
                    <tr key={j.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className={`${tdCls} font-mono text-xs`}>{j.id}</td>
                      <td className={tdCls}>
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {j.job_type}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <AdminBadge color={st.color}>{st.label}</AdminBadge>
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-brand-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                            {j.total > 0 ? `${j.progress}/${j.total} (%${pct})` : `%${pct}`}
                          </span>
                        </div>
                      </td>
                      <td className={`${tdCls} whitespace-nowrap text-xs text-gray-500`}>
                        {fmtDate(j.started_at)}
                      </td>
                      <td className={`${tdCls} whitespace-nowrap text-xs text-gray-500`}>
                        {fmtDate(j.finished_at)}
                      </td>
                      <td className={tdCls}>
                        {j.error ? (
                          <span className="text-xs text-error-600 dark:text-error-400">
                            {j.error}
                          </span>
                        ) : (
                          "—"
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

      {/* 5. Flash-Out Logları */}
      <AdminCard
        title="Flash-Out Logları"
        subtitle="Flash-out (anlık nakit çıkış) kayıtları"
      >
        {logsError ? (
          <AdminAlert kind="error">{logsError}</AdminAlert>
        ) : logs === null ? (
          <AdminSpinner label="Flash-out logları yükleniyor…" />
        ) : logs.length === 0 ? (
          <AdminEmpty>Henüz flash-out log kaydı yok.</AdminEmpty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  {logCols.map((k) => (
                    <th key={k} className={thCls}>
                      {colLabel(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                    {logCols.map((k) => (
                      <td
                        key={k}
                        className={`${tdCls} ${
                          k === "id" || k === "user_id"
                            ? "font-mono text-xs"
                            : "whitespace-nowrap text-xs text-gray-500"
                        }`}
                      >
                        {fmtVal(k, l[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}