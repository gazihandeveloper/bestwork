"use client";

import { Fragment, useEffect, useState } from "react";
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
import {
  listAdminPaymentNotifications,
  approvePaymentNotification,
  rejectPaymentNotification,
  listAdminOrders,
  updateOrderStatus,
  fileUrl,
  getErrorMessage,
  type PaymentNotification,
  type AdminOrder,
} from "@/lib/api";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const STATUS_COLOR: Record<string, "green" | "red" | "amber" | "blue" | "gray" | "purple"> = {
  pending: "amber",
  paid: "green",
  preparing: "blue",
  shipped: "purple",
  cancelled: "red",
};

const statusLabel = (s?: string | null) =>
  ({
    pending: "Bekliyor",
    paid: "Ödendi",
    preparing: "Hazırlanıyor",
    shipped: "Kargoda",
    cancelled: "İptal",
  })[s ?? ""] ?? s ?? "—";

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Tümü" },
  { key: "pending", label: "Bekliyor" },
  { key: "paid", label: "Ödendi" },
  { key: "preparing", label: "Hazırlanıyor" },
  { key: "shipped", label: "Kargoda" },
  { key: "cancelled", label: "İptal" },
];

export default function SiparislerPage() {
  const [payments, setPayments] = useState<PaymentNotification[] | null>(null);
  const [payBusy, setPayBusy] = useState<number | null>(null);
  const [payTotal, setPayTotal] = useState(0);

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
        status === "preparing"
          ? "Sipariş hazırlanıyor durumuna alındı."
          : status === "shipped"
          ? "Sipariş kargoya verildi."
          : status === "cancelled"
          ? "Sipariş iptal edildi."
          : "Sipariş durumu güncellendi."
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

  if (payments === null || orders === null) {
    return <AdminSpinner label="Siparişler yükleniyor…" />;
  }

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  return (
    <div>
      <AdminHeader
        title="Siparişler"
        subtitle="EFT ve kart ödemelerinin onay ekranı — onaylanan siparişler buradan hazırlanıp kargoya verilir."
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      {/* ── 1) Ödeme Onayı (EFT / kart) ── */}
      <div className="mb-5">
        <AdminCard
          title="Ödeme Onayı"
          subtitle="EFT/kart ödemeleri buraya düşer; onaylanınca sipariş ödenir."
          actions={
            <AdminBadge color={pendingCount > 0 ? "amber" : "gray"}>
              {pendingCount} bekliyor · {payTotal} toplam
            </AdminBadge>
          }
        >
          {payments.length === 0 ? (
            <AdminEmpty>Henüz ödeme bildirimi yok.</AdminEmpty>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className={thCls}>#</th>
                    <th className={thCls}>Üye</th>
                    <th className={thCls}>Sipariş</th>
                    <th className={thCls}>Tutar</th>
                    <th className={thCls}>Banka</th>
                    <th className={thCls}>Referans No</th>
                    <th className={thCls}>Durum</th>
                    <th className={thCls}>Dekont</th>
                    <th className={`${thCls} text-right`}>İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className={`${tdCls} font-medium text-gray-800 dark:text-white/90`}>#{p.id}</td>
                      <td className={tdCls}>Üye {p.user_id}</td>
                      <td className={tdCls}>{p.order_id ? `#${p.order_id}` : "—"}</td>
                      <td className={`${tdCls} font-medium`}>{tl(p.amount)}</td>
                      <td className={tdCls}>{p.bank_name || "—"}</td>
                      <td className={`${tdCls} text-gray-500 dark:text-gray-400`}>{p.reference_no || "—"}</td>
                      <td className={tdCls}>
                        <AdminBadge
                          color={p.status === "pending" ? "amber" : p.status === "approved" ? "green" : "red"}
                        >
                          {p.status === "pending"
                            ? "Bekliyor"
                            : p.status === "approved"
                            ? "Onaylandı"
                            : "Reddedildi"}
                        </AdminBadge>
                      </td>
                      <td className={tdCls}>
                        {p.file_path ? (
                          <a
                            href={fileUrl(p.file_path)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-brand-500 hover:underline"
                          >
                            Görüntüle
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        {p.status === "pending" ? (
                          <>
                            <AdminBtn
                              variant="success"
                              size="xs"
                              disabled={payBusy === p.id}
                              onClick={() => void actPayment(p.id, "approve")}
                              className="mr-1"
                            >
                              Onayla
                            </AdminBtn>
                            <AdminBtn
                              variant="danger"
                              size="xs"
                              disabled={payBusy === p.id}
                              onClick={() => void actPayment(p.id, "reject")}
                            >
                              Reddet
                            </AdminBtn>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">İşlendi</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      {/* ── 2) Siparişler ── */}
      <AdminCard title="Siparişler" subtitle={`${orderTotal} sipariş`}>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                filter === f.key
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {orders.length === 0 ? (
          <AdminEmpty>Bu filtrede sipariş yok.</AdminEmpty>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className={thCls}>Sipariş</th>
                  <th className={thCls}>Üye</th>
                  <th className={thCls}>Tutar</th>
                  <th className={thCls}>PV / CV</th>
                  <th className={thCls}>Ödeme</th>
                  <th className={thCls}>Durum</th>
                  <th className={thCls}>Tarih</th>
                  <th className={`${thCls} text-right`}>İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {orders.map((o) => (
                  <Fragment key={o.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className={`${tdCls} font-medium text-gray-800 dark:text-white/90`}>
                        #{o.id}
                        {o.items.length > 0 && (
                          <button
                            className="ml-1.5 align-middle text-xs font-normal text-gray-400 hover:text-brand-500"
                            onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                            aria-label="Ürünleri göster"
                          >
                            {expanded === o.id ? "▴" : "▾"}
                          </button>
                        )}
                      </td>
                      <td className={tdCls}>{o.user_name || `Üye ${o.user_id}`}</td>
                      <td className={`${tdCls} font-medium`}>{tl(o.total_amount)}</td>
                      <td className={`${tdCls} text-xs text-gray-500 dark:text-gray-400`}>
                        {o.total_pv} / {o.total_cv}
                      </td>
                      <td className={tdCls}>
                        <AdminBadge color="gray">
                          {o.payment_method === "card"
                            ? "Kart"
                            : o.payment_method === "eft"
                            ? "EFT"
                            : o.payment_method || "—"}
                        </AdminBadge>
                      </td>
                      <td className={tdCls}>
                        <AdminBadge color={STATUS_COLOR[o.status] ?? "gray"}>
                          {statusLabel(o.status)}
                        </AdminBadge>
                      </td>
                      <td className={`${tdCls} text-xs text-gray-500 dark:text-gray-400`}>
                        {new Date(o.created_at).toLocaleString("tr-TR")}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        {o.status === "paid" && (
                          <AdminBtn
                            variant="info"
                            size="xs"
                            disabled={orderBusy === o.id}
                            onClick={() => void setOrderStatus(o.id, "preparing")}
                            className="mr-1"
                          >
                            Hazırlanıyor
                          </AdminBtn>
                        )}
                        {o.status === "preparing" && (
                          <AdminBtn
                            variant="primary"
                            size="xs"
                            disabled={orderBusy === o.id}
                            onClick={() => {
                              setShipTarget(o.id);
                              setTracking(o.tracking_code ?? "");
                            }}
                            className="mr-1"
                          >
                            Kargoya Ver
                          </AdminBtn>
                        )}
                        {(o.status === "pending" || o.status === "paid" || o.status === "preparing") && (
                          <AdminBtn
                            variant="danger"
                            size="xs"
                            disabled={orderBusy === o.id}
                            onClick={() => void setOrderStatus(o.id, "cancelled")}
                          >
                            İptal
                          </AdminBtn>
                        )}
                        {o.tracking_code && (
                          <span className="ml-1 inline-block text-xs text-gray-500 dark:text-gray-400">
                            Kargo: {o.tracking_code}
                          </span>
                        )}
                      </td>
                    </tr>
                    {shipTarget === o.id && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 px-4 py-3 dark:bg-white/[0.02]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              Kargo Takip Kodu:
                            </span>
                            <input
                              className={`${inputCls} !w-64 !py-2`}
                              placeholder="Örn. YURT-123456"
                              value={tracking}
                              onChange={(e) => setTracking(e.target.value)}
                            />
                            <AdminBtn
                              size="xs"
                              disabled={orderBusy === o.id}
                              onClick={() => void setOrderStatus(o.id, "shipped", tracking.trim())}
                            >
                              {orderBusy === o.id ? "Gönderiliyor…" : "Kargoya Ver"}
                            </AdminBtn>
                            <AdminBtn variant="outline" size="xs" onClick={() => setShipTarget(null)}>
                              Vazgeç
                            </AdminBtn>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expanded === o.id && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 px-6 py-3 dark:bg-white/[0.02]">
                          {o.items.length === 0 ? (
                            <span className="text-sm text-gray-500">Ürün detayı yok.</span>
                          ) : (
                            <ul className="space-y-1 text-sm">
                              {o.items.map((it) => (
                                <li key={it.id} className="text-gray-700 dark:text-gray-300">
                                  <span className="font-medium">
                                    {it.product_name || `Ürün #${it.product_id ?? "?"}`}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {" "}
                                    × {it.quantity} — {tl(it.price)} (PV {it.pv} / CV {it.cv})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
