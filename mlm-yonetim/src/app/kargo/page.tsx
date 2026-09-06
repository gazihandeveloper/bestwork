"use client";

import { useEffect, useState } from "react";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { Loading } from "@/components/StatBox";
import { MaterialIcon } from "@/components/MaterialIcon";
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

  if (!loaded) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader
        title="Kargo Limiti"
        subtitle="Kargo ücreti ve ücretsiz kargo eşiğini belirleyin."
        breadcrumb={[{ text: "E-Ticaret" }, { text: "Kargo Limiti" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <PageCard title="Kargo Fiyatlandırması" subtitle="Sipariş toplamı eşiği geçerse kargo ücretsiz olur.">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Sabit Kargo Ücreti (₺)</label>
            <div className="input-group">
              <input
                type="number"
                min={0}
                className="form-control"
                placeholder="Örn. 49.90"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
              <span className="input-group-text">₺</span>
            </div>
            <div className="form-text">0 bırakılırsa kargo ücreti alınmaz.</div>
          </div>
          <div className="col-md-4">
            <label className="form-label">Ücretsiz Kargo Eşiği (₺)</label>
            <div className="input-group">
              <input
                type="number"
                min={0}
                className="form-control"
                placeholder="Örn. 500"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <span className="input-group-text">₺</span>
            </div>
            <div className="form-text">Ürün toplamı bu tutara ulaşırsa/geçerse kargo ücretsiz.</div>
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving && <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />}
              <MaterialIcon name="Save" size={15} className="me-1" />
              Kaydet
            </button>
          </div>
        </div>

        {(toNum(fee) > 0 || toNum(threshold) > 0) && (
          <div className="alert alert-info mt-3 mb-0 py-2 small">
            Siparişlerde uygulanır: ürün toplamı{" "}
            <strong>{toNum(threshold) > 0 ? `${toNum(threshold).toLocaleString("tr-TR")} ₺` : "her zaman"} üzeri</strong>{" "}
            ise kargo ücretsiz; altındaysa{" "}
            <strong>{toNum(fee) > 0 ? `${toNum(fee).toLocaleString("tr-TR")} ₺` : "ücretsiz"}</strong> kargo uygulanır.          </div>
        )}
      </PageCard>
    </PanelLayout>
  );
}
