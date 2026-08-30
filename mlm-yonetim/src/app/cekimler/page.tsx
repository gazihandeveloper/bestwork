"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import StatBox, { InfoAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import { listWithdrawals, approveWithdrawal, rejectWithdrawal, getErrorMessage } from "@/lib/api";
import type { WithdrawRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

// Backend WithdrawRequest JSON'u api.ts'tekinden zengin: method ve processed_at
// ek alanlar olarak tanımlanır (ListAllWithdrawRequests bunları döndürür).
interface WithdrawalRow extends WithdrawRequest {
  method?: string | null;
  processed_at?: string | null;
}

type StatusFilter = "" | "pending" | "approved" | "rejected";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Bekliyor", cls: "text-bg-warning" },
  approved: { label: "Onaylandı", cls: "text-bg-success" },
  rejected: { label: "Reddedildi", cls: "text-bg-danger" },
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "", label: "Tümü" },
  { key: "pending", label: "Bekliyor" },
  { key: "approved", label: "Onaylandı" },
  { key: "rejected", label: "Reddedildi" },
];

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString("tr-TR") : "—");

const methodLabel = (m?: string | null) =>
  m ? (m === "iban" ? "IBAN" : m === "bank" ? "Banka" : m === "crypto" ? "Kripto" : m) : "—";

export default function CekimlerPage() {
  const [rows, setRows] = useState<WithdrawalRow[] | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [busy, setBusy] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<WithdrawalRow | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () => {
    listWithdrawals()
      .then((ws) => setRows(ws))
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, []);

  const actApprove = async (id: number) => {
    setBusy(id);
    setError("");
    setNotice("");
    try {
      await approveWithdrawal(id);
      setNotice(`Çekim talebi #${id} onaylandı — üye bakiyesinden düşüldü.`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const actReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    setError("");
    try {
      await rejectWithdrawal(rejectTarget.id);
      setNotice(`Çekim talebi #${rejectTarget.id} reddedildi.`);
      setRejectTarget(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRejecting(false);
    }
  };

  if (rows === null) {
    return (
      <PanelLayout>
        <PageHeader title="Çekim Talepleri" subtitle="Üyelerin cüzdandan çekim talepleri ve onay/red işlemleri." />
        <Loading />
      </PanelLayout>
    );
  }

  const pendingRows = rows.filter((r) => r.status === "pending");
  const approvedRows = rows.filter((r) => r.status === "approved");
  const rejectedRows = rows.filter((r) => r.status === "rejected");
  const visible = filter === "" ? rows : rows.filter((r) => r.status === filter);

  const sum = (list: WithdrawalRow[]) => list.reduce((s, r) => s + (r.amount ?? 0), 0);
  const pendingAmount = sum(pendingRows);
  const approvedAmount = sum(approvedRows);
  const rejectedAmount = sum(rejectedRows);

  return (
    <PanelLayout>
      <PageHeader
        title="Çekim Talepleri"
        subtitle="Bekleyen çekimleri onaylayın veya reddedin; tüm taleplerin durumunu tek ekrandan izleyin."
        breadcrumb={[{ text: "Genel Bakış", href: "/" }, { text: "Çekim Talepleri" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* ── 1) Özet (small-box) ── */}
      <div className="row">
        <div className="col-12 col-md-4 mb-3">
          <StatBox
            color="warning"
            icon={<MaterialIcon name="Hourglass" size={48} />}
            title="Bekleyen Talep"
            value={pendingRows.length.toLocaleString("tr-TR")}
            footer={<span className="text-dark-emphasis">Toplam {tl(pendingAmount)}</span>}
          />
        </div>
        <div className="col-12 col-md-4 mb-3">
          <StatBox
            color="success"
            icon={<MaterialIcon name="Check" size={48} />}
            title="Onaylanan Talep"
            value={approvedRows.length.toLocaleString("tr-TR")}
            footer={<span className="text-light-emphasis">Toplam {tl(approvedAmount)}</span>}
          />
        </div>
        <div className="col-12 col-md-4 mb-3">
          <StatBox
            color="danger"
            icon={<MaterialIcon name="X" size={48} />}
            title="Reddedilen Talep"
            value={rejectedRows.length.toLocaleString("tr-TR")}
            footer={<span className="text-light-emphasis">Toplam {tl(rejectedAmount)}</span>}
          />
        </div>
      </div>

      {/* ── 2) Talep listesi ── */}
      <PageCard
        title="Çekim Talepleri"
        subtitle={`${rows.length} talep kayıtlı`}
        actions={
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={load}>
            <MaterialIcon name="RefreshCw" size={14} className="me-1" />
            Yenile
          </button>
        }
      >
        {/* Durum filtresi */}
        <div className="d-flex flex-wrap gap-1 mb-3">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn("btn btn-sm", filter === f.key ? "btn-primary" : "btn-outline-secondary")}
            >
              {f.label}
              {f.key !== "" && (
                <span className="ms-1 opacity-75">
                  ({f.key === "pending" ? pendingRows.length : f.key === "approved" ? approvedRows.length : rejectedRows.length})
                </span>
              )}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <InfoAlert>
            {filter === "" ? "Henüz çekim talebi yok." : "Bu durumda çekim talebi yok."}
          </InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Üye</th>
                  <th>Tutar</th>
                  <th>Yöntem</th>
                  <th>Durum</th>
                  <th>Talep Tarihi</th>
                  <th>İşlem Tarihi</th>
                  <th className="text-end">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td className="fw-semibold">#{r.id}</td>
                    <td>Üye {r.user_id}</td>
                    <td className="fw-semibold">{tl(r.amount)}</td>
                    <td>{methodLabel(r.method)}</td>
                    <td>
                      <span className={cn("badge", STATUS_META[r.status]?.cls ?? "text-bg-secondary")}>
                        {STATUS_META[r.status]?.label ?? r.status}
                      </span>
                    </td>
                    <td className="text-muted small">{fmtDate(r.requested_at)}</td>
                    <td className="text-muted small">{fmtDate(r.processed_at)}</td>
                    <td className="text-end">
                      {r.status === "pending" ? (
                        <>
                          <button
                            className="btn btn-sm btn-success me-1"
                            disabled={busy === r.id}
                            onClick={() => void actApprove(r.id)}
                          >
                            {busy === r.id ? (
                              <MaterialIcon name="Loader2" size={13} className="animate-spin" />
                            ) : (
                              <MaterialIcon name="Check" size={13} className="me-1" />
                            )}
                            Onayla
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            disabled={busy === r.id}
                            onClick={() => { setError(""); setNotice(""); setRejectTarget(r); }}
                          >
                            <MaterialIcon name="X" size={13} className="me-1" />
                            Reddet
                          </button>
                        </>
                      ) : (
                        <span className="text-muted small">İşlendi</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* ── Reddetme onayı ── */}
      <ConfirmModal
        open={rejectTarget !== null}
        title="Çekim Talebi Reddedilsin mi?"
        tone="danger"
        confirmText="Reddet"
        busy={rejecting}
        onConfirm={() => void actReject()}
        onCancel={() => { if (!rejecting) setRejectTarget(null); }}
      >
        {rejectTarget && (
          <>
            <p className="mb-1">
              <strong>#{rejectTarget.id}</strong> numaralı talep — Üye {rejectTarget.user_id},{" "}
              <strong>{tl(rejectTarget.amount)}</strong> ({fmtDate(rejectTarget.requested_at)}).
            </p>
            <p className="mb-0 text-muted small">
              Talep reddedilecek ve üye bakiyesine dokunulmayacak. Bu işlem geri alınamaz.
            </p>
          </>
        )}
      </ConfirmModal>
    </PanelLayout>
  );
}
