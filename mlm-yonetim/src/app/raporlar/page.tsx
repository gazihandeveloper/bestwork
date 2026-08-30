"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import StatBox, { InfoAlert, Loading } from "@/components/StatBox";
import DashboardCharts from "@/components/DashboardCharts";
import {
  api,
  getErrorMessage,
  getAdminRevenue,
  getCommissionSeries,
  listTopEarners,
  type RevenuePoint,
  type TopEarner,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Backend JSON şekilleri ────────────────────────────────────────────────
// GET /admin/revenue?period=&limit=            -> { points: RevenuePoint[] }   (api.ts getAdminRevenue)
// GET /admin/commissions-series?period=&limit= -> { points: RevenuePoint[] }   (api.ts getCommissionSeries)
// GET /admin/top-earners?limit=                -> { earners: TopEarner[] }     (api.ts listTopEarners)
// GET /admin/binary-balance                    -> { balance: BinaryBalance }
// GET /admin/audit-logs?limit=&offset=&action= -> { logs: AuditLogRow[], total, limit, offset }
// GET /admin/correction-logs?limit=&offset=    -> { logs: AuditLogRow[], total, limit, offset }
interface BinaryBalance {
  left_pv: number;
  right_pv: number;
  left_cv: number;
  right_cv: number;
  imbalance_pv: number; // sağ - sol (pozitifse sağ bacak ağır)
}

interface FinancialSummary {
  total_revenue: number;
  total_commissions: number;
  total_wallet_balance: number;
  total_earned: number;
  net_profit: number;
  payout_ratio: number;
  total_users: number;
  active_users: number;
}

interface AuditLogRow {
  id: number;
  admin_id: number | null;
  admin_name: string | null;
  action: string;
  target_type: string;
  target_id: number | null;
  reason: string | null;
  meta: unknown;
  created_at: string;
}

interface LogsResponse {
  logs: AuditLogRow[];
  total: number;
  limit: number;
  offset: number;
}

const PERIODS = [
  { key: "daily", label: "Günlük" },
  { key: "weekly", label: "Haftalık" },
  { key: "monthly", label: "Aylık" },
] as const;
type Period = (typeof PERIODS)[number]["key"];

const PAGE_SIZE = 25;

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const shortTl = (v: number) =>
  v >= 1_000_000
    ? (v / 1_000_000).toFixed(1) + "M TL"
    : v >= 1_000
      ? (v / 1_000).toFixed(1) + "K TL"
      : v.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " TL";

const pvFmt = (v: number) => v.toLocaleString("tr-TR");

// Denetim logları eylem etiketleri + renkleri.
const ACTION_META: Record<string, { label: string; cls: string }> = {
  wallet_adjust: { label: "Cüzdan Düzeltmesi", cls: "text-bg-warning" },
  rank_update: { label: "Rütbe Güncelleme", cls: "text-bg-info" },
  tree_move: { label: "Ağaç Taşıma", cls: "text-bg-primary" },
  pv_adjust: { label: "PV/CV Düzeltmesi", cls: "text-bg-warning" },
  bonus_rollback: { label: "Bonus Geri Alımı", cls: "text-bg-danger" },
  flashout_update: { label: "Flashout Güncelleme", cls: "text-bg-secondary" },
  order_status: { label: "Sipariş Durumu", cls: "text-bg-info" },
  payment_approve: { label: "Ödeme Onayı", cls: "text-bg-success" },
  payment_reject: { label: "Ödeme Reddi", cls: "text-bg-danger" },
  withdrawal_approve: { label: "Çekim Onayı", cls: "text-bg-success" },
  withdrawal_reject: { label: "Çekim Reddi", cls: "text-bg-danger" },
};

const actionMeta = (a: string) => ACTION_META[a] ?? { label: a, cls: "text-bg-secondary" };

const TARGET_LABEL: Record<string, string> = {
  user: "Üye",
  order: "Sipariş",
  wallet: "Cüzdan",
  settings: "Ayarlar",
  tree: "Ağaç",
  rank: "Rütbe",
  package: "Paket",
  product: "Ürün",
  payment: "Ödeme",
  withdrawal: "Çekim",
  flashout: "Flashout",
};

const targetLabel = (t: string) => TARGET_LABEL[t] ?? t;

// meta JSON alanını kompakt metne çevirir (boş {} ise "" döner).
const metaText = (m: unknown): string => {
  if (m == null) return "";
  const s = JSON.stringify(m);
  return s && s !== "{}" ? s : "";
};

// ── Sayfa içinde tanımlı rapor API çağrıları ─────────────────────────────
async function getFinancialSummaryApi(): Promise<FinancialSummary> {
  const { data } = await api.get<{ summary: FinancialSummary }>("/admin/financial-summary");
  return data.summary;
}

async function getBinaryBalanceApi(): Promise<BinaryBalance> {
  const { data } = await api.get<{ balance: BinaryBalance }>("/admin/binary-balance");
  return data.balance;
}

async function listAuditLogsApi(limit: number, offset: number, action: string): Promise<LogsResponse> {
  const { data } = await api.get<LogsResponse>("/admin/audit-logs", {
    params: { limit, offset, action: action || undefined },
  });
  return data;
}

async function listCorrectionLogsApi(limit: number, offset: number): Promise<LogsResponse> {
  const { data } = await api.get<LogsResponse>("/admin/correction-logs", { params: { limit, offset } });
  return data;
}

const AUDIT_FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Tümü" },
  { key: "wallet_adjust", label: "Cüzdan Düzeltmesi" },
  { key: "rank_update", label: "Rütbe" },
  { key: "tree_move", label: "Ağaç Taşıma" },
  { key: "pv_adjust", label: "PV/CV" },
  { key: "bonus_rollback", label: "Bonus Geri Alımı" },
  { key: "flashout_update", label: "Flashout" },
];

export default function RaporlarPage() {
  // ── Ciro & komisyon ──
  const [period, setPeriod] = useState<Period>("monthly");
  const [revenue, setRevenue] = useState<RevenuePoint[] | null>(null);
  const [commissions, setCommissions] = useState<RevenuePoint[] | null>(null);

  // ── En çok kazananlar ──
  const [earners, setEarners] = useState<TopEarner[] | null>(null);

  // ── Binary denge ──
  const [balance, setBalance] = useState<BinaryBalance | null>(null);
  const [fin, setFin] = useState<FinancialSummary | null>(null);

  // ── Denetim logları ──
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[] | null>(null);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditAction, setAuditAction] = useState("");
  const [auditBusy, setAuditBusy] = useState(false);

  // ── Düzeltme logları ──
  const [corrLogs, setCorrLogs] = useState<AuditLogRow[] | null>(null);
  const [corrTotal, setCorrTotal] = useState(0);
  const [corrOffset, setCorrOffset] = useState(0);
  const [corrBusy, setCorrBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRevenue = () => {
    const limit = period === "daily" ? 30 : 12;
    Promise.all([getAdminRevenue(period, limit), getCommissionSeries(period, limit)])
      .then(([r, c]) => {
        setRevenue(r);
        setCommissions(c);
      })
      .catch((err) => setError(getErrorMessage(err)));
  };

  const loadEarners = () => {
    listTopEarners(10)
      .then(setEarners)
      .catch((err) => setError(getErrorMessage(err)));
  };

  const loadBalance = () => {
    getBinaryBalanceApi()
      .then(setBalance)
      .catch((err) => setError(getErrorMessage(err)));
  };

  const loadFinancial = () => {
    getFinancialSummaryApi()
      .then(setFin)
      .catch((err) => setError(getErrorMessage(err)));
  };

  const loadAudit = () => {
    setAuditBusy(true);
    listAuditLogsApi(PAGE_SIZE, auditOffset, auditAction)
      .then((d) => {
        setAuditLogs(d.logs);
        setAuditTotal(d.total);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setAuditBusy(false));
  };

  const loadCorrections = () => {
    setCorrBusy(true);
    listCorrectionLogsApi(PAGE_SIZE, corrOffset)
      .then((d) => {
        setCorrLogs(d.logs);
        setCorrTotal(d.total);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setCorrBusy(false));
  };

  useEffect(() => {
    loadRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    loadEarners();
    loadBalance();
    loadFinancial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditOffset, auditAction]);

  useEffect(() => {
    loadCorrections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corrOffset]);

  const totalRevenue = useMemo(() => (revenue ?? []).reduce((s, p) => s + p.revenue, 0), [revenue]);
  const totalEarned = useMemo(() => (earners ?? []).reduce((s, e) => s + e.total_earned, 0), [earners]);

  if (revenue === null || commissions === null || earners === null || balance === null || auditLogs === null || corrLogs === null) {
    return <PanelLayout><Loading /></PanelLayout>;
  }

  const totalPV = balance.left_pv + balance.right_pv;
  const leftPct = totalPV > 0 ? Math.round((balance.left_pv / totalPV) * 100) : 50;
  const imbalance = balance.imbalance_pv;

  const changeAuditAction = (key: string) => {
    setAuditAction(key);
    setAuditOffset(0);
  };

  return (
    <PanelLayout>
      <PageHeader
        title="Raporlar & Denetim"
        subtitle="Ciro, kazanç ve binary denge raporları ile denetim/düzeltme logları."
        breadcrumb={[{ text: "Genel Bakış", href: "/" }, { text: "Raporlar & Denetim" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* ── Özet kutuları ── */}
      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-4">
          <StatBox
            color="primary"
            icon={<MaterialIcon name="BarChart" size={28} />}
            title={`Dönem Ciro Toplamı (${period === "daily" ? "Günlük" : period === "weekly" ? "Haftalık" : "Aylık"})`}
            value={shortTl(totalRevenue)}
          />
        </div>
        <div className="col-sm-6 col-lg-4">
          <StatBox
            color="success"
            icon={<MaterialIcon name="Coins" size={28} />}
            title="En Çok Kazananlar Toplamı"
            value={shortTl(totalEarned)}
          />
        </div>
        <div className="col-sm-6 col-lg-4">
          <StatBox
            color="warning"
            icon={<MaterialIcon name="Scale" size={28} />}
            title="Binary Makas (PV)"
            value={`${imbalance >= 0 ? "+" : ""}${pvFmt(imbalance)} PV`}
          />
        </div>
      </div>

      {/* ── Sistem Bilançosu & Cross-Check ── */}
      {fin && (
        <PageCard
          title="Sistem Bilançosu & Cross-Check"
          subtitle="Toplam ciro, dağıtılan komisyon ve ödeme oranı (şirketin finansal sürdürülebilirliği)."
          className="mb-3"
        >
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <StatBox color="primary" icon={<MaterialIcon name="Wallet" size={24} />} title="Toplam Ciro" value={shortTl(fin.total_revenue)} />
            </div>
            <div className="col-6 col-md-3">
              <StatBox color="warning" icon={<MaterialIcon name="Coins" size={24} />} title="Dağıtılan Komisyon" value={shortTl(fin.total_commissions)} />
            </div>
            <div className="col-6 col-md-3">
              <StatBox color="success" icon={<MaterialIcon name="TrendingUp" size={24} />} title="Net Kâr" value={shortTl(fin.net_profit)} />
            </div>
            <div className="col-6 col-md-3">
              <StatBox
                color={fin.payout_ratio > 100 ? "danger" : "info"}
                icon={<MaterialIcon name="Percent" size={24} />}
                title="Ödeme Oranı (Cross-Check)"
                value={`%${fin.payout_ratio.toFixed(2)}`}
              />
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2 mt-3">
            <span className="badge text-bg-light border">Toplam Üye: {fin.total_users}</span>
            <span className="badge text-bg-light border">Aktif Üye: {fin.active_users}</span>
            <span className="badge text-bg-light border">Cüzdan Bakiye Toplamı: {shortTl(fin.total_wallet_balance)}</span>
            <span className="badge text-bg-light border">Toplam Kazanç (earned): {shortTl(fin.total_earned)}</span>
          </div>
          {fin.payout_ratio > 100 && (
            <div className="alert alert-danger mt-2 mb-0 py-2 small">
              Uyarı: Dağıtılan komisyon toplam ciroyu aşıyor (%{fin.payout_ratio.toFixed(2)}) — finansal sürdürülebilirlik riski.
            </div>
          )}
        </PageCard>
      )}

      {/* ── 1) Ciro & Komisyon Serisi ── */}
      <PageCard
        title="Ciro & Komisyon Serisi"
        subtitle="İptal edilmemiş siparişlerden dönem bazlı ciro; ödenmiş komisyonlarla karşılaştırmalı."
        className="mb-3"
        actions={
          <div className="btn-group btn-group-sm">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={cn("btn", period === p.key ? "btn-primary" : "btn-outline-secondary")}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      >
        {revenue.length === 0 && commissions.length === 0 ? (
          <InfoAlert>Bu dönemde ciro verisi yok.</InfoAlert>
        ) : (
          <>
            <DashboardCharts variant="comparison" period={period} revenue={revenue} commissions={commissions} />
            <div className="table-responsive mt-3">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Dönem</th>
                    <th className="text-end">Ciro</th>
                    <th className="text-end">Komisyon</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.map((p) => {
                    const com = commissions.find((c) => c.date === p.date)?.revenue ?? 0;
                    return (
                      <tr key={p.date}>
                        <td className="text-muted">{p.date}</td>
                        <td className="text-end fw-semibold">{tl(p.revenue)}</td>
                        <td className="text-end">{tl(com)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </PageCard>

      {/* ── 2) En Çok Kazananlar ── */}
      <PageCard
        title="En Çok Kazananlar"
        subtitle="Ödenmiş komisyonlara göre ilk 10 üye — son 30 gün kazançlarıyla birlikte."
        className="mb-3"
      >
        {earners.length === 0 ? (
          <InfoAlert>Henüz kazanç verisi yok.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>#</th>
                  <th>Üye</th>
                  <th>Üye Kodu</th>
                  <th className="text-end">Toplam Kazanç</th>
                  <th className="text-end">Son 30 Gün</th>
                </tr>
              </thead>
              <tbody>
                {earners.map((e, i) => (
                  <tr key={e.user_id}>
                    <td>
                      {i === 0 ? (
                        <MaterialIcon name="Trophy" size={18} className="text-warning" />
                      ) : (
                        <span className="text-muted">{i + 1}</span>
                      )}
                    </td>
                    <td className="fw-semibold">
                      {e.name || `Üye #${e.user_id}`}
                      <span className="text-muted small"> · #{e.user_id}</span>
                    </td>
                    <td className="text-muted">{e.member_code}</td>
                    <td className="text-end fw-semibold">{tl(e.total_earned)}</td>
                    <td className="text-end">{tl(e.recent_earned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* ── 3) Binary Denge ── */}
      <PageCard
        title="Binary Denge"
        subtitle="Sistem genelinde sol/sağ bacak birikmiş PV ve CV dağılımı."
        className="mb-3"
      >
        <div className="row g-3">
          <div className="col-sm-6">
            <div className="border rounded p-3 h-100">
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-semibold">Sol Bacak</span>
                <MaterialIcon name="ChevronLeft" size={18} className="text-success" />
              </div>
              <div className="fs-5 fw-bold mt-2">{pvFmt(balance.left_pv)} PV</div>
              <div className="text-muted small">CV: {pvFmt(balance.left_cv)}</div>
            </div>
          </div>
          <div className="col-sm-6">
            <div className="border rounded p-3 h-100">
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-semibold">Sağ Bacak</span>
                <MaterialIcon name="ChevronRight" size={18} className="text-danger" />
              </div>
              <div className="fs-5 fw-bold mt-2">{pvFmt(balance.right_pv)} PV</div>
              <div className="text-muted small">CV: {pvFmt(balance.right_cv)}</div>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="d-flex justify-content-between small mb-1">
            <span className="text-success">Sol %{leftPct}</span>
            <span className="text-danger">Sağ %{100 - leftPct}</span>
          </div>
          <div className="progress" style={{ height: 10 }}>
            <div className="progress-bar bg-success" style={{ width: `${leftPct}%` }} />
            <div className="progress-bar bg-danger" style={{ width: `${100 - leftPct}%` }} />
          </div>
        </div>

        <div className="mt-3">
          <span className="badge text-bg-light border">
            Makas (PV): <b>{imbalance >= 0 ? "+" : ""}{pvFmt(imbalance)}</b> — {imbalance >= 0 ? "sağ bacak ağır" : "sol bacak ağır"}
          </span>
        </div>
      </PageCard>

      {/* ── 4) Denetim Logları ── */}
      <PageCard
        title="Denetim Logları"
        subtitle="Yönetici tarafından yapılan kritik işlemler — kayıtlar silinemez."
        className="mb-3"
        actions={
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadAudit} disabled={auditBusy}>
            <MaterialIcon name="RefreshCw" size={14} className="me-1" />
            Yenile
          </button>
        }
      >
        <div className="d-flex flex-wrap gap-1 mb-3">
          {AUDIT_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={cn("btn btn-sm", auditAction === f.key ? "btn-primary" : "btn-outline-secondary")}
              onClick={() => changeAuditAction(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {auditLogs.length === 0 ? (
          <InfoAlert>Bu filtrede denetim kaydı yok.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Zaman</th>
                  <th>Yönetici</th>
                  <th>Eylem</th>
                  <th>Hedef</th>
                  <th>Gerekçe</th>
                  <th>Detay</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((l) => {
                  const meta = metaText(l.meta);
                  return (
                    <tr key={l.id}>
                      <td className="text-muted small">#{l.id}</td>
                      <td className="text-muted small">{new Date(l.created_at).toLocaleString("tr-TR")}</td>
                      <td>{l.admin_name || (l.admin_id != null ? `Yönetici #${l.admin_id}` : "—")}</td>
                      <td>
                        <span className={cn("badge", actionMeta(l.action).cls)}>{actionMeta(l.action).label}</span>
                      </td>
                      <td className="text-muted small">
                        {targetLabel(l.target_type)}
                        {l.target_id != null ? ` #${l.target_id}` : ""}
                      </td>
                      <td className="text-muted small" style={{ maxWidth: 240 }}>
                        <span className="text-truncate d-inline-block align-bottom" style={{ maxWidth: 240 }} title={l.reason ?? ""}>
                          {l.reason || "—"}
                        </span>
                      </td>
                      <td className="text-muted small" style={{ maxWidth: 220 }}>
                        <span className="text-truncate d-inline-block align-bottom" style={{ maxWidth: 220 }} title={meta}>
                          {meta || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="d-flex align-items-center justify-content-between mt-3">
          <span className="text-muted small">{auditTotal} kayıt</span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={auditOffset === 0 || auditBusy}
              onClick={() => setAuditOffset(Math.max(0, auditOffset - PAGE_SIZE))}
            >
              <MaterialIcon name="ChevronLeft" size={14} className="me-1" />
              Önceki
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={auditOffset + PAGE_SIZE >= auditTotal || auditBusy}
              onClick={() => setAuditOffset(auditOffset + PAGE_SIZE)}
            >
              Sonraki
              <MaterialIcon name="ChevronRight" size={14} className="ms-1" />
            </button>
          </div>
        </div>
      </PageCard>

      {/* ── 5) Düzeltme Logları ── */}
      <PageCard
        title="Düzeltme Logları"
        subtitle="Bakiye/puan düzeltmesi, rütbe değişikliği, ağaç taşıma ve bonus geri alımları."
        actions={
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadCorrections} disabled={corrBusy}>
            <MaterialIcon name="RefreshCw" size={14} className="me-1" />
            Yenile
          </button>
        }
      >
        {corrLogs.length === 0 ? (
          <InfoAlert>Henüz düzeltme kaydı yok.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Zaman</th>
                  <th>Yönetici</th>
                  <th>Eylem</th>
                  <th>Hedef</th>
                  <th>Gerekçe</th>
                  <th>Detay</th>
                </tr>
              </thead>
              <tbody>
                {corrLogs.map((l) => {
                  const meta = metaText(l.meta);
                  return (
                    <tr key={l.id}>
                      <td className="text-muted small">#{l.id}</td>
                      <td className="text-muted small">{new Date(l.created_at).toLocaleString("tr-TR")}</td>
                      <td>{l.admin_name || (l.admin_id != null ? `Yönetici #${l.admin_id}` : "—")}</td>
                      <td>
                        <span className={cn("badge", actionMeta(l.action).cls)}>{actionMeta(l.action).label}</span>
                      </td>
                      <td className="text-muted small">
                        {targetLabel(l.target_type)}
                        {l.target_id != null ? ` #${l.target_id}` : ""}
                      </td>
                      <td className="text-muted small" style={{ maxWidth: 240 }}>
                        <span className="text-truncate d-inline-block align-bottom" style={{ maxWidth: 240 }} title={l.reason ?? ""}>
                          {l.reason || "—"}
                        </span>
                      </td>
                      <td className="text-muted small" style={{ maxWidth: 220 }}>
                        <span className="text-truncate d-inline-block align-bottom" style={{ maxWidth: 220 }} title={meta}>
                          {meta || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="d-flex align-items-center justify-content-between mt-3">
          <span className="text-muted small">{corrTotal} kayıt</span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={corrOffset === 0 || corrBusy}
              onClick={() => setCorrOffset(Math.max(0, corrOffset - PAGE_SIZE))}
            >
              <MaterialIcon name="ChevronLeft" size={14} className="me-1" />
              Önceki
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={corrOffset + PAGE_SIZE >= corrTotal || corrBusy}
              onClick={() => setCorrOffset(corrOffset + PAGE_SIZE)}
            >
              Sonraki
              <MaterialIcon name="ChevronRight" size={14} className="ms-1" />
            </button>
          </div>
        </div>
      </PageCard>
    </PanelLayout>
  );
}
