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

export default function ManuelKurPage() {
  const [rate, setRate] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getSettings()
      .then((s) => {
        setRate(s.usd_try_rate ?? "40.00");
        setLoaded(true);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const save = async () => {
    const val = toNum(rate);
    if (val <= 0) {
      setError("Kur 0'dan büyük olmalıdır.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateSettings({ usd_try_rate: String(val) });
      setNotice("Manuel kur kaydedildi.");
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
        title="Manuel Kur"
        subtitle="Şirket döviz kurunu kendisi belirler — güncel kur çekilmez."
        breadcrumb={[{ text: "MLM & Ağaç" }, { text: "Manuel Kur" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <PageCard title="USD/TRY Kuru" subtitle="Kariyer bonusları bu kur üzerinden TL'ye çevrilir.">
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <label className="form-label">USD/TRY Kur</label>
            <div className="input-group">
              <span className="input-group-text">1 USD =</span>
              <input
                type="number"
                min={0}
                step="0.0001"
                className="form-control"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <span className="input-group-text">₺</span>
            </div>
            <div className="form-text">Örn. 40.00 → 1 USD = 40,00 ₺</div>
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving && <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />}
              <MaterialIcon name="Save" size={15} className="me-1" />
              Kaydet
            </button>
          </div>
        </div>
      </PageCard>
    </PanelLayout>
  );
}
