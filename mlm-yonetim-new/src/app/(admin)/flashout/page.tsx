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
import { getFlashout, setFlashout, getErrorMessage } from "@/lib/api";

const toNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function FlashoutPage() {
  const [monthly, setMonthly] = useState("");
  const [daily, setDaily] = useState("");
  const [weekly, setWeekly] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getFlashout()
      .then((f) => {
        setMonthly(f.monthly_limit ? String(f.monthly_limit) : "3500000");
        setDaily(f.daily_limit ? String(f.daily_limit) : "");
        setWeekly(f.weekly_limit ? String(f.weekly_limit) : "");
        setLoaded(true);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await setFlashout({
        monthly_limit: monthly === "" ? 0 : toNum(monthly),
        daily_limit: daily === "" ? 0 : toNum(daily),
        weekly_limit: weekly === "" ? 0 : toNum(weekly),
      });
      setNotice("Flashout (tavan) ayarları kaydedildi.");
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
        title="Flash-Out"
        subtitle="Zayıf kol (kısa kol) eşleşme priminde aylık maksimum ödeme tavanını belirleyin."
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <AdminCard
        title="Ödeme Tavanı (Flashout)"
        subtitle="Tüm kariyerler için ortak tavan. Aylık tavanı aşan zayıf kol puanları dönem sonunda sıfırlanır (şirkete kalır)."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}>Aylık Maksimum Tavan (₺)</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              placeholder="Örn. 3500000"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Günlük Tavan (₺) — opsiyonel</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              placeholder="0 = sınırsız"
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Haftalık Tavan (₺) — opsiyonel</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              placeholder="0 = sınırsız"
              value={weekly}
              onChange={(e) => setWeekly(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-5">
          <AdminBtn onClick={save} disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </AdminBtn>
        </div>
      </AdminCard>
    </div>
  );
}
