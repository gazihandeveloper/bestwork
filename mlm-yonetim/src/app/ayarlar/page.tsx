"use client";

import { useEffect, useState } from "react";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { Loading } from "@/components/StatBox";
import { MaterialIcon } from "@/components/MaterialIcon";
import { getSettings, updateSettings, getErrorMessage } from "@/lib/api";

// Lisans/abonelik + çekim otomasyon kuralları (settings key/value).
const KEYS = {
  subscription_enabled: "false",
  subscription_fee: "",
  subscription_period_months: "12",
  withdrawal_min_amount: "",
  withdrawal_fee_percent: "",
};

const toNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function AyarlarPage() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getSettings()
      .then((s) => setSettings({ ...KEYS, ...s }))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const set = (key: string, value: string) => setSettings((s) => (s ? { ...s, [key]: value } : s));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError("");
    try {
      await updateSettings({
        subscription_enabled: settings.subscription_enabled ?? "false",
        subscription_fee: settings.subscription_fee ?? "",
        subscription_period_months: settings.subscription_period_months ?? "12",
        withdrawal_min_amount: settings.withdrawal_min_amount ?? "",
        withdrawal_fee_percent: settings.withdrawal_fee_percent ?? "",
      });
      setNotice("Ayarlar kaydedildi.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (settings === null) return <PanelLayout><Loading /></PanelLayout>;

  const subEnabled = settings.subscription_enabled === "true";

  return (
    <PanelLayout>
      <PageHeader title="Sistem Ayarları" subtitle="Lisans/abonelik ücretleri ve çekim otomasyon kuralları." />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3">
        <div className="col-lg-6">
          <PageCard title="Lisans & Abonelik" subtitle="Üye paneli kullanım/yenileme ücretleri." className="h-100">
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="subEnabled"
                checked={subEnabled}
                onChange={(e) => set("subscription_enabled", e.target.checked ? "true" : "false")}
              />
              <label className="form-check-label" htmlFor="subEnabled">Abonelik ücreti al</label>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Yenileme Ücreti (₺)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="form-control"
                  value={settings.subscription_fee ?? ""}
                  onChange={(e) => set("subscription_fee", e.target.value)}
                  disabled={!subEnabled}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Yenileme Periyodu (ay)</label>
                <input
                  type="number"
                  min={1}
                  className="form-control"
                  value={settings.subscription_period_months ?? "12"}
                  onChange={(e) => set("subscription_period_months", e.target.value)}
                  disabled={!subEnabled}
                />
              </div>
            </div>
          </PageCard>
        </div>

        <div className="col-lg-6">
          <PageCard title="Çekim Otomasyon Kuralları" subtitle="Çekim talepleri için minimum tutar ve işlem ücreti." className="h-100">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Minimum Çekim Tutarı (₺)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="form-control"
                  value={settings.withdrawal_min_amount ?? ""}
                  onChange={(e) => set("withdrawal_min_amount", e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Çekim İşlem Ücreti (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  className="form-control"
                  value={settings.withdrawal_fee_percent ?? ""}
                  onChange={(e) => set("withdrawal_fee_percent", e.target.value)}
                />
              </div>
            </div>
          </PageCard>
        </div>
      </div>

      <div className="mt-3">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" /> : <MaterialIcon name="Save" size={15} className="me-1" />}
          Kaydet
        </button>
      </div>
    </PanelLayout>
  );
}
