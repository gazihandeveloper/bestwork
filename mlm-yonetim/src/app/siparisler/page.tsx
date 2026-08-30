"use client";

import { Fragment, useEffect, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading } from "@/components/StatBox";
import {
  listAdminPaymentNotifications,
  approvePaymentNotification,
  rejectPaymentNotification,
  listAdminOrders,
  updateOrderStatus,
  getErrorMessage,
  type PaymentNotification,
  type AdminOrder,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/?$/, "") ||
  (process.env.NODE_ENV === "development" ? "" : "https://mahmutgazihanarslan.com.tr");

const fileUrl = (p?: string | null) => {
  if (!p) return "";
  return `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;
};

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Bekliyor", cls: "text-bg-warning" },
  paid: { label: "Ödendi", cls: "text-bg-success" },
  preparing: { label: "Hazırlanıyor", cls: "text-bg-info" },
  shipped: { label: "Kargoda", cls: "text-bg-primary" },
  cancelled: { label: "İptal", cls: "text-bg-danger" },
};

const statusLabel = (s?: string | null) => STATUS_META[s ?? ""]?.label ?? s ?? "—";
const statusCls = (s?: string | null) => STATUS_META[s ?? ""]?.cls ?? "text-bg-secondary";

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Tümü" },
  { key: "pending", label: "Bekliyor" },
  { key: "paid", label: "Ödendi" },
  { key: "preparing", label: "Hazırlanıyor" },
  { key: "shipped", label: "Kargoda" },
  { key: "cancelled", label: "İptal" },
];

export default function SiparislerPage() {
  // ── Ödeme onayı (EFT/kart) ──
  const [payments, setPayments] = useState<PaymentNotification[] | null>(null);
  const [payBusy, setPayBusy] = useState<number | null>(null);
  const [payTotal, setPayTotal] = useState(0);

  // ── Siparişler ──
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [orderBusy, setOrderBusy] = useState<number | null>(null);
  const [shipTarget, setShipTarget] = useState<number | null>(null);
  const [tracking, setTracking] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPayments = () => {
    listAdminPaymentNotifications({ limit: 50 })
      .then((d) => {
        setPayments(d.payment_notifications);
        setPayTotal(d.total);
      })
      .catch((err) => setError(getErrorMessage(err)));
  };

  const loadOrders = () => {
    listAdminOrders({ limit: 100, status: filter || undefined })
      .then((d) => {
        setOrders(d.orders);
        setOrderTotal(d.total);
      })
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const actPayment = async (id: number, action: "approve" | "reject") => {
    setPayBusy(id);
    setError("");
    try {
      if (action === "approve") await approvePaymentNotification(id);
      else await rejectPaymentNotification(id);
      setNotice(action === "approve" ? "Ödeme onaylandı — sipariş ödendi." : "Ödeme reddedildi.");
      loadPayments();
      loadOrders();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPayBusy(null);
    }
  };

  const setOrderStatus = async (id: number, status: string, trackingCode = "") => {
    setOrderBusy(id);
    setError("");
    try {
      await updateOrderStatus(id, status, trackingCode);
      setNotice(
        status === "preparing" ? "Sipariş hazırlanıyor durumuna alındı." :
        status === "shipped" ? "Sipariş kargoya verildi." :
        status === "cancelled" ? "Sipariş iptal edildi." : "Sipariş durumu güncellendi."
      );
      setShipTarget(null);
      setTracking("");
      loadOrders();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setOrderBusy(null);
    }
  };

  if (payments === null || orders === null) return <PanelLayout><Loading /></PanelLayout>;

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <PanelLayout>
      <PageHeader
        title="Siparişler"
        subtitle="EFT ve kart ödemelerinin onay ekranı — onaylanan siparişler buradan hazırlanıp kargoya verilir."
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* ── 1) Ödeme Onayı (EFT / kart) ── */}
      <PageCard
        title="Ödeme Onayı"
        subtitle="EFT/kart ödemeleri buraya düşer; onaylanınca sipariş ödenir."
        className="mb-3"
        actions={
          <span className={cn("badge", pendingCount > 0 ? "text-bg-warning" : "text-bg-secondary")}>
            {pendingCount} bekliyor · {payTotal} toplam
          </span>
        }
      >
        {payments.length === 0 ? (
          <InfoAlert>Henüz ödeme bildirimi yok.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Üye</th>
                  <th>Sipariş</th>
                  <th>Tutar</th>
                  <th>Banka</th>
                  <th>Referans No</th>
                  <th>Durum</th>
                  <th>Dekont</th>
                  <th className="text-end">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-semibold">#{p.id}</td>
                    <td>Üye {p.user_id}</td>
                    <td>{p.order_id ? `#${p.order_id}` : "—"}</td>
                    <td className="fw-semibold">{tl(p.amount)}</td>
                    <td>{p.bank_name || "—"}</td>
                    <td className="text-muted">{p.reference_no || "—"}</td>
                    <td>
                      <span className={cn("badge", p.status === "pending" ? "text-bg-warning" : p.status === "approved" ? "text-bg-success" : "text-bg-danger")}>
                        {p.status === "pending" ? "Bekliyor" : p.status === "approved" ? "Onaylandı" : "Reddedildi"}
                      </span>
                    </td>
                    <td>
                      {p.file_path ? (
                        <a href={fileUrl(p.file_path)} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary" title="Dekontu görüntüle">
                          <MaterialIcon name="Eye" size={13} />
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-end">
                      {p.status === "pending" ? (
                        <>
                          <button
                            className="btn btn-sm btn-success me-1"
                            disabled={payBusy === p.id}
                            onClick={() => void actPayment(p.id, "approve")}
                          >
                            {payBusy === p.id ? <MaterialIcon name="Loader2" size={13} className="animate-spin" /> : <MaterialIcon name="Check" size={13} className="me-1" />}
                            Onayla
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            disabled={payBusy === p.id}
                            onClick={() => void actPayment(p.id, "reject")}
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

      {/* ── 2) Siparişler ── */}
      <PageCard title="Siparişler" subtitle={`${orderTotal} sipariş`}>
        {/* Durum filtresi */}
        <div className="d-flex flex-wrap gap-1 mb-3">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "btn btn-sm",
                filter === f.key ? "btn-primary" : "btn-outline-secondary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {orders.length === 0 ? (
          <InfoAlert>Bu filtrede sipariş yok.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Üye</th>
                  <th>Tutar</th>
                  <th>PV / CV</th>
                  <th>Ödeme</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th className="text-end">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <Fragment key={o.id}>
                    <tr>
                      <td className="fw-semibold">
                        #{o.id}
                        {o.items.length > 0 && (
                          <button
                            className="btn btn-link btn-sm p-0 ms-1"
                            onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                            aria-label="Ürünleri göster"
                          >
                            {expanded === o.id ? <MaterialIcon name="ChevronUp" size={14} /> : <MaterialIcon name="ChevronDown" size={14} />}
                          </button>
                        )}
                      </td>
                      <td>{o.user_name || `Üye ${o.user_id}`}</td>
                      <td className="fw-semibold">{tl(o.total_amount)}</td>
                      <td className="text-muted small">{o.total_pv} / {o.total_cv}</td>
                      <td>
                        <span className="badge text-bg-light border">
                          {o.payment_method === "card" ? "Kart" : o.payment_method === "eft" ? "EFT" : o.payment_method || "—"}
                        </span>
                      </td>
                      <td><span className={cn("badge", statusCls(o.status))}>{statusLabel(o.status)}</span></td>
                      <td className="text-muted small">{new Date(o.created_at).toLocaleString("tr-TR")}</td>
                      <td className="text-end">
                        {o.status === "paid" && (
                          <button className="btn btn-sm btn-info me-1" disabled={orderBusy === o.id} onClick={() => void setOrderStatus(o.id, "preparing")}>
                            <MaterialIcon name="PackageSearch" size={13} className="me-1" />
                            Hazırlanıyor
                          </button>
                        )}
                        {o.status === "preparing" && (
                          <button className="btn btn-sm btn-primary me-1" disabled={orderBusy === o.id} onClick={() => { setShipTarget(o.id); setTracking(o.tracking_code ?? ""); }}>
                            <MaterialIcon name="Truck" size={13} className="me-1" />
                            Kargoya Ver
                          </button>
                        )}
                        {(o.status === "pending" || o.status === "paid" || o.status === "preparing") && (
                          <button className="btn btn-sm btn-outline-danger" disabled={orderBusy === o.id} onClick={() => void setOrderStatus(o.id, "cancelled")}>
                            <MaterialIcon name="block" size={13} className="me-1" />
                            İptal
                          </button>
                        )}
                        {o.tracking_code && <span className="badge text-bg-light border ms-1">Kargo: {o.tracking_code}</span>}
                      </td>
                    </tr>
                    {shipTarget === o.id && (
                      <tr className="table-light">
                        <td colSpan={8}>
                          <div className="d-flex align-items-center gap-2 py-1">
                            <span className="small fw-semibold">Kargo Takip Kodu:</span>
                            <input
                              className="form-control form-control-sm"
                              style={{ maxWidth: 260 }}
                              placeholder="Örn. YURT-123456"
                              value={tracking}
                              onChange={(e) => setTracking(e.target.value)}
                            />
                            <button
                              className="btn btn-sm btn-primary"
                              disabled={orderBusy === o.id}
                              onClick={() => void setOrderStatus(o.id, "shipped", tracking.trim())}
                            >
                              {orderBusy === o.id ? <MaterialIcon name="Loader2" size={13} className="animate-spin" /> : <MaterialIcon name="Truck" size={13} className="me-1" />}
                              Kargoya Ver
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setShipTarget(null)}>Vazgeç</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expanded === o.id && (
                      <tr>
                        <td colSpan={8}>
                          <div className="px-2 py-1">
                            {o.items.length === 0 ? (
                              <span className="text-muted small">Ürün detayı yok.</span>
                            ) : (
                              <ul className="list-unstyled mb-0">
                                {o.items.map((it) => (
                                  <li key={it.id} className="small py-0.5">
                                    <span className="fw-semibold">{it.product_name || `Ürün #${it.product_id ?? "?"}`}</span>
                                    <span className="text-muted"> × {it.quantity} — {tl(it.price)} (PV {it.pv} / CV {it.cv})</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>
    </PanelLayout>
  );
}
