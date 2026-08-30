"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import StatBox, { InfoAlert, Loading, ErrorAlert } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import { api, getErrorMessage, runBonusJob, getJob, getCommissionSeries } from "@/lib/api";
import type { JobInfo, RevenuePoint } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Tipler ────────────────────────────────────────────────────────────────
type Period = "daily" | "weekly" | "monthly";

// Backend JobRun JSON'u (GET /admin/jobs): JobInfo'dan zengin (job_type,
// meta, zaman damgaları dahil).
interface JobRow {
  id: number;
  job_type: string;
  status: string;
  progress: number;
  total: number;
  meta?: { processed?: number; failures?: number } | null;
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string;
}

// POST /admin/bonus/simulate → { result: {...} }
interface SimulateResult {
  period: string;
  member_count: number;
  average_pv: number;
  total_volume: number;
  matched_volume: number;
  estimated_bonus: number;
  assumed_binary_rate: number;
  note: string;
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "daily", label: "Günlük" },
  { key: "weekly", label: "Haftalık" },
  { key: "monthly", label: "Aylık" },
];

const JOB_STATUS_META: Record<string, { label: string; cls: string }> = {
  queued: { label: "Sırada", cls: "text-bg-secondary" },
  running: { label: "Çalışıyor", cls: "text-bg-primary" },
  completed: { label: "Tamamlandı", cls: "text-bg-success" },
  failed: { label: "Hata", cls: "text-bg-danger" },
};

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const shortTl = (v: number) => {
  if (Math.abs(v) >= 1000000) return `₺${(v / 1000000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(v) >= 1000) return `₺${(v / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}K`;
  return tl(v);
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString("tr-TR") : "—");

// ── Sayfa içinde tanımlı API çağrıları ──────────────────────────────────
async function listJobsApi(): Promise<JobRow[]> {
  const { data } = await api.get<{ jobs: JobRow[] }>("/admin/jobs", { params: { limit: 20 } });
  return data.jobs ?? [];
}

async function simulateBonusApi(input: { member_count: number; average_pv: number; period: string }): Promise<SimulateResult> {
  const { data } = await api.post<{ result: SimulateResult }>("/admin/bonus/simulate", input);
  return data.result;
}

export default function BonusPage() {
  // ── Komisyon çalıştırma (async iş) ──
  const [runPeriod, setRunPeriod] = useState<Period>("daily");
  const [running, setRunning] = useState(false);
  const [activeJob, setActiveJob] = useState<JobInfo | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const jobTimer = useRef<number | null>(null);

  // ── Simülasyon ──
  const [simMember, setSimMember] = useState("100");
  const [simAvgPv, setSimAvgPv] = useState("50");
  const [simPeriod, setSimPeriod] = useState<Period>("daily");
  const [simResult, setSimResult] = useState<SimulateResult | null>(null);
  const [simBusy, setSimBusy] = useState(false);

  // ── İş geçmişi + komisyon serisi ──
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [seriesPeriod, setSeriesPeriod] = useState<Period>("monthly");
  const [series, setSeries] = useState<RevenuePoint[]>([]);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadJobs = () => {
    listJobsApi()
      .then(setJobs)
      .catch((err) => setError(getErrorMessage(err)));
  };

  const loadSeries = () => {
    getCommissionSeries(seriesPeriod, seriesPeriod === "daily" ? 30 : 12)
      .then(setSeries)
      .catch(() => {});
  };

  useEffect(() => {
    loadJobs();
    loadSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesPeriod]);

  // Polling zamanlayıcısını unmount'ta temizle.
  useEffect(
    () => () => {
      if (jobTimer.current) window.clearTimeout(jobTimer.current);
    },
    []
  );

  // ── Komisyon kapanışını başlat + ilerlemeyi izle ──
  const handleRun = async () => {
    setConfirmOpen(false);
    setError("");
    setNotice("");
    setRunning(true);
    try {
      const jobId = await runBonusJob(runPeriod);
      setActiveJob({ id: jobId, status: "queued", progress: 0, total: 0, error: null });
      const poll = async () => {
        try {
          const job = await getJob(jobId);
          setActiveJob(job);
          if (job.status === "completed" || job.status === "failed") {
            setRunning(false);
            if (job.status === "completed") {
              setNotice(`İş #${jobId} tamamlandı — ${job.total} üye işlendi. Komisyon kayıtları güncellendi.`);
            } else {
              setError(`İş #${jobId} başarısız: ${job.error ?? "bilinmeyen hata"}`);
            }
            loadJobs();
            loadSeries(); // komisyonlar değişti, seriyi tazele
          } else {
            loadJobs();
            jobTimer.current = window.setTimeout(poll, 2000);
          }
        } catch (err) {
          setError(getErrorMessage(err));
          setRunning(false);
        }
      };
      jobTimer.current = window.setTimeout(poll, 2000);
    } catch (err) {
      setError(getErrorMessage(err));
      setRunning(false);
    }
  };

  // ── Bonus simülasyonu ──
  const handleSimulate = async () => {
    setError("");
    const memberCount = Number(simMember);
    const averagePv = Number(simAvgPv);
    if (!Number.isFinite(memberCount) || memberCount <= 0 || !Number.isFinite(averagePv) || averagePv < 0) {
      setError("Üye sayısı 0'dan büyük, ortalama PV 0 veya daha büyük olmalıdır.");
      return;
    }
    setSimBusy(true);
    try {
      const result = await simulateBonusApi({
        member_count: Math.round(memberCount),
        average_pv: averagePv,
        period: simPeriod,
      });
      setSimResult(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSimBusy(false);
    }
  };

  if (jobs === null) {
    return (
      <PanelLayout>
        <PageHeader title="Bonus Motoru" subtitle="Komisyon dağıtımı, simülasyon ve iş takibi." />
        <Loading />
      </PanelLayout>
    );
  }

  // ── Seri özeti ──
  const maxRev = series.reduce((m, p) => Math.max(m, p.revenue), 0);
  const totalRev = series.reduce((s, p) => s + p.revenue, 0);
  const avgRev = series.length > 0 ? totalRev / series.length : 0;
  const jobPct = activeJob && activeJob.total > 0 ? Math.round((activeJob.progress / activeJob.total) * 100) : 0;

  return (
    <PanelLayout>
      <PageHeader
        title="Bonus Motoru"
        subtitle="Toplu binary eşleşme geçişini çalıştırın, ödeme tahmini yapın ve ödenen komisyonları izleyin."
        breadcrumb={[{ text: "Genel Bakış", href: "/" }, { text: "Bonus Motoru" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* ── 1) Seri özeti (small-box) ── */}
      <div className="row">
        <div className="col-12 col-md-4 mb-3">
          <StatBox
            color="success"
            icon={<MaterialIcon name="Coins" size={48} />}
            title="Ödenen Komisyon (Seri)"
            value={series.length > 0 ? shortTl(totalRev) : "—"}
            footer={<span className="text-light-emphasis">{seriesPeriod === "daily" ? "Günlük" : seriesPeriod === "weekly" ? "Haftalık" : "Aylık"} toplam</span>}
          />
        </div>
        <div className="col-12 col-md-4 mb-3">
          <StatBox
            color="info"
            icon={<MaterialIcon name="TrendingUp" size={48} />}
            title="Dönem Ortalaması"
            value={series.length > 0 ? shortTl(avgRev) : "—"}
            footer={<span className="text-light-emphasis">{series.length} dönem verisi</span>}
          />
        </div>
        <div className="col-12 col-md-4 mb-3">
          <StatBox
            color="primary"
            icon={<MaterialIcon name="LineChart" size={48} />}
            title="En Yüksek Dönem"
            value={maxRev > 0 ? shortTl(maxRev) : "—"}
            footer={<span className="text-light-emphasis">{series.length > 0 ? series.reduce((a, b) => (b.revenue > a.revenue ? b : a)).date : "veri yok"}</span>}
          />
        </div>
      </div>

      {/* ── 2) Komisyon çalıştır ── */}
      <PageCard
        title="Komisyon Çalıştır"
        subtitle="Tüm aktif üyeler üzerinde toplu binary eşleşme geçişi başlatır (asenkron; ilerleme aşağıda izlenir)."
        className="mb-3"
      >
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="btn-group" role="group" aria-label="Dönem seçimi">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setRunPeriod(p.key)}
                className={cn("btn btn-sm", runPeriod === p.key ? "btn-primary" : "btn-outline-secondary")}
                disabled={running}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-warning"
            disabled={running}
            onClick={() => setConfirmOpen(true)}
          >
            {running ? (
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
            ) : (
              <MaterialIcon name="Zap" size={15} className="me-1" />
            )}
            {running ? "Çalışıyor…" : "Komisyonu Çalıştır"}
          </button>
        </div>

        {activeJob && (
          <div className="mt-3 border rounded p-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <span className="fw-semibold">İş #{activeJob.id}</span>
                <span className={cn("badge ms-2", JOB_STATUS_META[activeJob.status]?.cls ?? "text-bg-secondary")}>
                  {JOB_STATUS_META[activeJob.status]?.label ?? activeJob.status}
                </span>
              </div>
              <span className="text-muted small">
                İlerleme: {activeJob.progress} / {activeJob.total} ({jobPct}%)
              </span>
            </div>
            <div className="progress mt-2" style={{ height: 8 }}>
              <div
                className={cn("progress-bar", (activeJob.status === "queued" || activeJob.status === "running") && "progress-bar-striped progress-bar-animated")}
                style={{ width: `${jobPct}%` }}
              />
            </div>
            {activeJob.error && <div className="alert alert-danger py-2 mt-2 mb-0">{activeJob.error}</div>}
          </div>
        )}
      </PageCard>

      {/* ── 3) Bonus simülasyonu ── */}
      <PageCard
        title="Bonus Simülasyonu"
        subtitle="Varsayılan %10 binary oranı ve eşleşen hacim = toplam hacim / 2 üzerinden kaba ödeme tahmini."
        className="mb-3"
      >
        <div className="row g-2 align-items-end">
          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold mb-1">Üye Sayısı</label>
            <input
              type="number"
              min={1}
              className="form-control form-control-sm"
              value={simMember}
              onChange={(e) => setSimMember(e.target.value)}
              disabled={simBusy}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold mb-1">Ortalama PV</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="form-control form-control-sm"
              value={simAvgPv}
              onChange={(e) => setSimAvgPv(e.target.value)}
              disabled={simBusy}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold mb-1">Dönem</label>
            <select
              className="form-select form-select-sm"
              value={simPeriod}
              onChange={(e) => setSimPeriod(e.target.value as Period)}
              disabled={simBusy}
            >
              <option value="daily">Günlük</option>
              <option value="weekly">Haftalık</option>
              <option value="monthly">Aylık</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <button type="button" className="btn btn-info w-100" onClick={() => void handleSimulate()} disabled={simBusy}>
              {simBusy ? (
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
              ) : (
                <MaterialIcon name="Calculator" size={15} className="me-1" />
              )}
              Hesapla
            </button>
          </div>
        </div>

        {simResult && (
          <div className="mt-3">
            <div className="row g-2 mb-3">
              <div className="col-6 col-md-3">
                <div className="border rounded p-2 text-center h-100">
                  <div className="text-muted small text-uppercase fw-bold">Toplam Hacim</div>
                  <div className="fw-bold">{tl(simResult.total_volume)}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="border rounded p-2 text-center h-100">
                  <div className="text-muted small text-uppercase fw-bold">Eşleşen Hacim</div>
                  <div className="fw-bold">{tl(simResult.matched_volume)}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="border rounded p-2 text-center h-100">
                  <div className="text-muted small text-uppercase fw-bold">Tahmini Bonus</div>
                  <div className="fw-bold text-success">{tl(simResult.estimated_bonus)}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="border rounded p-2 text-center h-100">
                  <div className="text-muted small text-uppercase fw-bold">Varsayılan Oran</div>
                  <div className="fw-bold">%{Math.round(simResult.assumed_binary_rate * 100)}</div>
                </div>
              </div>
            </div>
            <InfoAlert>{simResult.note}</InfoAlert>
          </div>
        )}
      </PageCard>

      {/* ── 4) Komisyon serisi grafiği ── */}
      <PageCard
        title="Komisyon Serisi"
        subtitle="Ödenmiş komisyonların dönem bazlı dağılımı (GET /admin/commissions-series)."
        className="mb-3"
      >
        <div className="d-flex flex-wrap gap-1 mb-3">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setSeriesPeriod(p.key)}
              className={cn("btn btn-sm", seriesPeriod === p.key ? "btn-primary" : "btn-outline-secondary")}
            >
              {p.label}
            </button>
          ))}
        </div>

        {series.length === 0 ? (
          <InfoAlert>Bu dönem için ödenmiş komisyon verisi yok.</InfoAlert>
        ) : (
          <>
            <div className="d-flex align-items-end gap-1" style={{ height: 190 }}>
              {series.map((p) => {
                const h = maxRev > 0 ? Math.max((p.revenue / maxRev) * 100, 1.5) : 1.5;
                return (
                  <div
                    key={p.date}
                    className="d-flex flex-column justify-content-end align-items-center flex-grow-1 h-100"
                    style={{ minWidth: 0 }}
                    title={`${p.date}: ${tl(p.revenue)}`}
                  >
                    <div className="bg-primary w-100 rounded-top" style={{ height: `${h}%` }} />
                    <span className="text-muted mt-1 text-truncate w-100 text-center" style={{ fontSize: "0.6rem" }}>
                      {seriesPeriod === "monthly" ? p.date.slice(0, 7) : p.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="d-flex flex-wrap gap-3 mt-3">
              <div className="flex-fill border rounded p-2 text-center">
                <div className="text-muted small text-uppercase fw-bold">Toplam</div>
                <div className="fw-bold">{shortTl(totalRev)}</div>
              </div>
              <div className="flex-fill border rounded p-2 text-center">
                <div className="text-muted small text-uppercase fw-bold">Ortalama</div>
                <div className="fw-bold">{shortTl(avgRev)}</div>
              </div>
              <div className="flex-fill border rounded p-2 text-center">
                <div className="text-muted small text-uppercase fw-bold">En Yüksek</div>
                <div className="fw-bold">{shortTl(maxRev)}</div>
              </div>
            </div>
          </>
        )}
      </PageCard>

      {/* ── 5) İş geçmişi ── */}
      <PageCard
        title="İş Geçmişi"
        subtitle="Toplu binary eşleşme geçiş kayıtları (GET /admin/jobs)."
        actions={
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { loadJobs(); loadSeries(); }}>
            <MaterialIcon name="RefreshCw" size={14} className="me-1" />
            Yenile
          </button>
        }
      >
        {jobs.length === 0 ? (
          <InfoAlert>Henüz iş kaydı yok.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tip</th>
                  <th>Durum</th>
                  <th>İlerleme</th>
                  <th>İşlenen / Hata</th>
                  <th>Başlangıç</th>
                  <th>Bitiş</th>
                  <th>Hata Detayı</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const pct = j.total > 0 ? Math.round((j.progress / j.total) * 100) : 0;
                  return (
                    <tr key={j.id}>
                      <td className="fw-semibold">#{j.id}</td>
                      <td><code className="small">{j.job_type}</code></td>
                      <td>
                        <span className={cn("badge", JOB_STATUS_META[j.status]?.cls ?? "text-bg-secondary")}>
                          {JOB_STATUS_META[j.status]?.label ?? j.status}
                        </span>
                      </td>
                      <td style={{ minWidth: 150 }}>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1" style={{ height: 6 }}>
                            <div className="progress-bar" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-muted small">{j.progress}/{j.total}</span>
                        </div>
                      </td>
                      <td className="text-muted small">
                        {j.meta?.processed != null ? `${j.meta.processed} / ${j.meta.failures ?? 0}` : "—"}
                      </td>
                      <td className="text-muted small">{fmtDate(j.started_at)}</td>
                      <td className="text-muted small">{fmtDate(j.finished_at)}</td>
                      <td>
                        {j.error ? <span className="text-danger small">{j.error}</span> : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* ── Komisyon çalıştırma onayı ── */}
      <ConfirmModal
        open={confirmOpen}
        title="Komisyon Kapanışı Başlatılsın mı?"
        tone="warning"
        confirmText="Çalıştır"
        busy={running}
        onConfirm={() => void handleRun()}
        onCancel={() => setConfirmOpen(false)}
      >
        <p className="mb-1">
          <strong>{PERIODS.find((p) => p.key === runPeriod)?.label}</strong> dönemi için tüm aktif üyeler üzerinde
          toplu binary eşleşme geçişi başlatılacak.
        </p>
        <p className="mb-0 text-muted small">
          Bu işlem arka planda asenkron çalışır; işlemin başladığı anda sayfaya dönersiniz ve ilerleme yukarıda izlenir.
          Eşleşme idempotent olduğundan tekrar çalıştırmak güvenlidir.
        </p>
      </ConfirmModal>
    </PanelLayout>
  );
}
