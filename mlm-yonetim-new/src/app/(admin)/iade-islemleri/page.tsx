"use client";

import { useEffect, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import {
  listAdminOrders,
  getErrorMessage,
  type AdminOrder,
} from "@/lib/api";

const fmtTl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

export default function IadeIslemleriPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCancelledOrders = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Fetch orders filtered by cancelled status
      const data = await listAdminOrders({ 
        limit: 1000, 
        status: "cancelled" 
      });
      setOrders(data.orders);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCancelledOrders();
  }, []);

  if (isLoading) {
    return <AdminSpinner label="İadeler yükleniyor..." />;
  }

  const totalAmount = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
  const totalCount = orders?.length || 0;

  return (
    <div>
      <AdminHeader
        title="İade İşlemleri"
        subtitle="İptal edilen veya iadesi talep edilen siparişlerin takibi."
      />

      <AdminAlert kind="warning">
        Bu ekran iptal edilmiş siparişleri listeler. Tam bir iade (refund) akışı için backend'de iade modeli gereklidir.
      </AdminAlert>

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      {/* Özet Kartlar */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AdminCard title="Toplam İptal Sayısı">
          <div className="text-3xl font-bold">{totalCount}</div>
        </AdminCard>
        <AdminCard title="Toplam İptal Tutarı">
          <div className="text-3xl font-bold">{fmtTl(totalAmount)}</div>
        </AdminCard>
      </div>

      {/* Liste */}
      <AdminCard title="İade / İptal Edilen Siparişler">
        {orders === null || orders.length === 0 ? (
          <AdminEmpty>Herhangi bir iptal işlemi bulunamadı.</AdminEmpty>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className={thCls}>Sipariş No</th>
                  <th className={thCls}>Üye</th>
                  <th className={thCls}>Tutar</th>
                  <th className={thCls}>Durum</th>
                  <th className={thCls}>Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className={`${tdCls} font-medium text-gray-800 dark:text-white/90`}>
                      #{o.id}
                    </td>
                    <td className={tdCls}>
                      {o.user_name || `Üye ${o.user_id}`}
                    </td>
                    <td className={`${tdCls} font-medium`}>
                      {fmtTl(o.total_amount)}
                    </td>
                    <td className={tdCls}>
                      <AdminBadge color="red">
                        {o.status === "cancelled" ? "İptal Edildi" : o.status || "İptal"}
                      </AdminBadge>
                    </td>
                    <td className={`${tdCls} text-xs text-gray-500 dark:text-gray-400`}>
                      {new Date(o.created_at).toLocaleString("tr-TR")}
                    </td>
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
