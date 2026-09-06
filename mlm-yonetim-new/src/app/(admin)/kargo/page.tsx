"use client";

import { useEffect, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminAlert,
  AdminSpinner,
  inputCls,
  labelCls,
} from "@/components/admin/AdminUI";
import { getSettings, updateSettings, getErrorMessage } from "@/lib/api";

const toNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function KargoPage() {
  const [fee, setFee] = useState("");
  const [threshold, setThreshold] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getSettings()
      .then((s) => {
        setFee(s.shipping_fee ?? "");
        setThreshold(s.free_shipping_threshold ?? "");
        setLoaded(true);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await updateSettings({
        shipping_fee: fee === "" ? "0" : String(toNum(fee)),
        free_shipping_threshold: threshold === "" ? "0" : String(toNum(threshold)),
      });
      setNotice("Kargo ayarları kaydedildi.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded && !error) return <AdminSpinner label="Yükleniyor…" />;

  return (
    <div>
      <AdminHeader
        title="Kargo Limiti"
        subtitle="Kargo ücreti ve ücretsiz kargo eşiğini belirleyin."
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <AdminCard
        title="Kargo Fiyatlandırması"
        subtitle="Sipariş toplamı eşiği geçerse kargo ücretsiz olur."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}>Sabit Kargo Ücreti (₺)</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              placeholder="Örn. 49.90"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              0 bırakılırsa kargo ücreti alınmaz.
            </p>
          </div>
          <div>
            <label className={labelCls}>Ücretsiz Kargo Eşiği (₺)</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              placeholder="Örn. 500"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Ürün toplamı bu tutara ulaşırsa/geçerse kargo ücretsiz.
            </p>
          </div>
          <div className="flex items-end">
            <AdminBtn onClick={save} disabled={saving} size="sm">
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </AdminBtn>
          </div>
        </div>

        {(toNum(fee) > 0 || toNum(threshold) > 0) && (
          <div className="mt-5 rounded-xl border border-blue-light-500/30 bg-blue-light-500/10 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
            Siparişlerde uygulanır: ürün toplamı{" "}
            <strong>
              {toNum(threshold) > 0
                ? `${toNum(threshold).toLocaleString("tr-TR")} ₺`
                : "her zaman"}{" "}
              üzeri
            </strong>{" "}
            ise kargo ücretsiz; altındaysa{" "}
            <strong>
              {toNum(fee) > 0 ? `${toNum(fee).toLocaleString("tr-TR")} ₺` : "ücretsiz"}
            </strong>{" "}
            kargo uygulanır.
          </div>
        )}
      </AdminCard>
    </div>
  );
}
