"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, Loading } from "@/components/StatBox";
import { api, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Tipler (backend JSON şekilleri) ───────────────────────────────────────
// GET /admin/flashout -> { flashout: { daily_limit, weekly_limit } }
interface FlashoutRules {
  daily_limit: number;
  weekly_limit: number;
}

// GET /admin/flashout/logs -> { logs, total, limit, offset } (FlashoutLog)
interface FlashoutLog {
  id: number;
  user_id: number;
  user_name: string;
  member_code: string;
  period: string;
  limit_amount: number;
  earned_amount: number;
  capped_amount: number;
  created_at: string;
}

// ── Sayfa içinde tanımlı API çağrıları ────────────────────────────────────
const LOG_LIMIT = 20;

async function getFlashoutApi(): Promise<FlashoutRules> {
  const { data } = await api.get<{ flashout?: FlashoutRules }>("/admin/flashout");
  return data.flashout ?? { daily_limit: 0, weekly_limit: 0 };
}

// PUT /admin/flashout -> { message } — gövde: { daily_limit, weekly_limit }
async function setFlashoutApi(body: FlashoutRules): Promise<void> {
  await api.put("/admin/flashout", body);
}

async function listFlashoutLogsApi(offset: number): Promise<{ logs: FlashoutLog[]; total: number }> {
  const { data } = await api.get<{ logs: FlashoutLog[]; total: number }>("/admin/flashout/logs", {
    params: { limit: LOG_LIMIT, offset },
  });
  return { logs: data.logs ?? [], total: data.total ?? 0 };
}

// ── Yardımcılar ───────────────────────────────────────────────────────────
const tl = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
  " TL";

// Backend: 0 = limit yok (sınırsız)
const limitText = (v: number) => (v > 0 ? tl(v) : "Sınırsız");

const periodMeta = (p: string) =>
  p === "daily"
    ? { label: "Günlük", cls: "text-bg-info" }
    : p === "weekly"
      ? { label: "Haftalık", cls: "text-bg-warning" }
      : { label: p || "—", cls: "text-bg-secondary" };

const toNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function FlashoutPage() {
  // ── Limitler ──
  const [rules, setRules] = useState<FlashoutRules | null>(null);
  const [daily, setDaily] = useState("");
  const [weekly, setWeekly] = useState("");
  const [saving, setSaving] = useState(false);

  // ── İhlal logları ──
  const [logs, setLogs] = useState<FlashoutLog[] | null>(null);
  const [logTotal, setLogTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [logLoading, setLogLoading] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRules = () => {
    getFlashoutApi()
      .then((r) => {
        setRules(r);
        setDaily(String(r.daily_limit));
        setWeekly(String(r.weekly_limit));
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        // Limitler okunamasa da sayfa açık kalsın (form 0/0 ile başlar)
        setRules({ daily_limit: 0, weekly_limit: 0 });
      });
  };

  const loadLogs = (off: number) => {
    setLogLoading(true);
    setError("");
    listFlashoutLogsApi(off)
      .then((d) => {
        setLogs(d.logs);
        setLogTotal(d.total);
        setOffset(off);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
        setLogs([]);
        setLogTotal(0);
      })
      .finally(() => setLogLoading(false));
  };

  useEffect(() => {
    loadRules();
    loadLogs(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    const d = toNum(daily);
    const w = toNum(weekly);
    if (d < 0 || w < 0) {
      setError("Limitler negatif olamaz.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await setFlashoutApi({ daily_limit: d, weekly_limit: w });
      setNotice("Flashout limitleri güncellendi.");
      loadRules();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (rules === null || logs === null) return <PanelLayout><Loading /></PanelLayout>;

  const page = Math.floor(offset / LOG_LIMIT);
  const pageCount = Math.max(1, Math.ceil(logTotal / LOG_LIMIT));

  return (
    <PanelLayout>
      <PageHeader
        title="Flashout & Limitler"
        subtitle="Günlük/haftalık bonus cap (flashout) limitlerini görüntüleyin, düzenleyin ve ihlal kayıtlarını izleyin."
        breadcrumb={[{ text: "Genel Bakış", href: "/" }, { text: "Flashout & Limitler" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* ── 1) Mevcut Limitler + Düzenleme ── */}
      <PageCard
        title="Mevcut Limitler"
        subtitle="0 (sıfır) değeri o dönem için limit uygulanmadığı anlamına gelir (sınırsız)."
        className="mb-3"
      >
        <div className="row g-3 mb-3">
          <div className="col-sm-6">
            <div className="small-box text-bg-info">
              <div className="inner">
                <h3>{limitText(rules.daily_limit)}</h3>
                <p>Günlük Flashout Limiti</p>
              </div>
              <span className="small-box-icon" aria-hidden="true">
                <MaterialIcon name="Calendar" size={60} />
              </span>
            </div>
          </div>
          <div className="col-sm-6">
            <div className="small-box text-bg-warning">
              <div className="inner">
                <h3>{limitText(rules.weekly_limit)}</h3>
                <p>Haftalık Flashout Limiti</p>
              </div>
              <span className="small-box-icon" aria-hidden="true">
                <MaterialIcon name="CalendarClock" size={60} />
              </span>
            </div>
          </div>
        </div>

        <h6 className="fw-semibold">
          <MaterialIcon name="Tune" size={15} className="me-1 text-primary" />
          Limitleri Düzenle
        </h6>
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label">Günlük Limit (₺)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="form-control"
              placeholder="0 = sınırsız"
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Haftalık Limit (₺)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="form-control"
              placeholder="0 = sınırsız"
              value={weekly}
              onChange={(e) => setWeekly(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <button className="btn btn-primary w-100" onClick={() => void save()} disabled={saving}>
              {saving ? (
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
              ) : (
                <MaterialIcon name="Check" size={15} className="me-1" />
              )}
              Limitleri Kaydet
            </button>
          </div>
        </div>
        <div className="alert alert-warning mt-3 mb-0 py-2 small">
          Limit güncellemeleri denetim (audit) loguna yazılır. Limit aşımı yaşayan üyelerin kazançları otomatik olarak
          cap uygulanır ve aşağıdaki ihlal loglarına düşer.
        </div>
      </PageCard>

      {/* ── 2) İhlal Logları ── */}
      <PageCard title="İhlal Logları" subtitle={`${logTotal} kayıt · cap uygulanan flashout ihlalleri`}>
        {logLoading && logs.length === 0 ? (
          <Loading text="Loglar yükleniyor…" />
        ) : logs.length === 0 ? (
          <InfoAlert>Henüz flashout ihlali kaydı yok.</InfoAlert>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Üye</th>
                    <th>Üye Kodu</th>
                    <th>Dönem</th>
                    <th className="text-end">Limit</th>
                    <th className="text-end">Kazanç</th>
                    <th className="text-end">Kesilen (Cap)</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => {
                    const pm = periodMeta(l.period);
                    return (
                      <tr key={l.id}>
                        <td className="text-muted small">{l.id}</td>
                        <td className="fw-semibold">{l.user_name || `Üye #${l.user_id}`}</td>
                        <td>
                          <span className="badge text-bg-light border">{l.member_code}</span>
                        </td>
                        <td>
                          <span className={cn("badge", pm.cls)}>{pm.label}</span>
                        </td>
                        <td className="text-end">{limitText(l.limit_amount)}</td>
                        <td className="text-end fw-semibold">{tl(l.earned_amount)}</td>
                        <td className={cn("text-end fw-semibold", l.capped_amount > 0 ? "text-danger" : "text-muted")}>
                          {tl(l.capped_amount)}
                        </td>
                        <td className="text-muted small">{new Date(l.created_at).toLocaleString("tr-TR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
              <span className="text-muted small">
                Sayfa {page + 1} / {pageCount}
              </span>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={offset === 0 || logLoading}
                  onClick={() => loadLogs(offset - LOG_LIMIT)}
                >
                  <MaterialIcon name="ChevronLeft" size={14} className="me-1" />
                  Önceki
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={offset + LOG_LIMIT >= logTotal || logLoading}
                  onClick={() => loadLogs(offset + LOG_LIMIT)}
                >
                  Sonraki
                  <MaterialIcon name="ChevronRight" size={14} className="ms-1" />
                </button>
              </div>
            </div>
          </>
        )}
      </PageCard>
    </PanelLayout>
  );
}
