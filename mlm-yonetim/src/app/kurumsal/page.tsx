"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { Loading } from "@/components/StatBox";
import { getSettings, updateSettings, getErrorMessage } from "@/lib/api";

// Kurumsal & Footer ayar anahtarları (settings key/value).
const SETTINGS_KEYS = [
  "corporate_description",
  "corporate_address",
  "corporate_phone",
  "corporate_email",
  "corporate_hours",
  "footer_about",
  "footer_copyright",
  "social_instagram",
  "social_facebook",
  "social_youtube",
] as const;

type SettingsMap = Record<string, string>;

const emptySettings = (): SettingsMap =>
  Object.fromEntries(SETTINGS_KEYS.map((k) => [k, ""]));

export default function KurumsalPage() {
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => setSettings({ ...emptySettings(), ...s }))
      .catch((err) => {
        // Yükleme başarısız olsa bile form boş değerlerle açılır.
        setSettings(emptySettings());
        setError(getErrorMessage(err));
      });
  }, []);

  const set = (key: string, value: string) =>
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      // Tüm anahtarlar tek seferde gönderilir.
      await updateSettings({ ...settings });
      setNotice("Ayarlar kaydedildi.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (settings === null) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader title="Kurumsal & Footer" subtitle="Kurumsal bilgileri ve footer (alt bilgi) ayarlarını yönetin." />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3">
        {/* Kurumsal Bilgiler */}
        <div className="col-12 col-lg-6">
          <PageCard title="Kurumsal Bilgiler" subtitle="Hakkımızda sayfası ve iletişim bilgileri.">
            <div className="mb-3">
              <label className="form-label">
                <MaterialIcon name="FileText" size={13} className="me-1" />Açıklama
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Şirket tanıtım yazısı…"
                value={settings.corporate_description ?? ""}
                onChange={(e) => set("corporate_description", e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">
                <MaterialIcon name="MapPin" size={13} className="me-1" />Adres
              </label>
              <input
                className="form-control"
                placeholder="Şirket adresi…"
                value={settings.corporate_address ?? ""}
                onChange={(e) => set("corporate_address", e.target.value)}
              />
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">
                  <MaterialIcon name="Phone" size={13} className="me-1" />Telefon
                </label>
                <input
                  className="form-control"
                  placeholder="+90 5xx xxx xx xx"
                  value={settings.corporate_phone ?? ""}
                  onChange={(e) => set("corporate_phone", e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">
                  <MaterialIcon name="Mail" size={13} className="me-1" />E-posta
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="info@bestwork.com.tr"
                  value={settings.corporate_email ?? ""}
                  onChange={(e) => set("corporate_email", e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="form-label">
                <MaterialIcon name="Clock" size={13} className="me-1" />Çalışma Saatleri
              </label>
              <input
                className="form-control"
                placeholder="Hafta içi 09:00 – 18:00"
                value={settings.corporate_hours ?? ""}
                onChange={(e) => set("corporate_hours", e.target.value)}
              />
            </div>
          </PageCard>
        </div>

        {/* Footer Ayarları */}
        <div className="col-12 col-lg-6">
          <PageCard title="Footer Ayarları" subtitle="Site alt bilgisi ve sosyal medya bağlantıları.">
            <div className="mb-3">
              <label className="form-label">Kısa Açıklama</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Footer'da görünen kısa tanıtım…"
                value={settings.footer_about ?? ""}
                onChange={(e) => set("footer_about", e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">
                <MaterialIcon name="copyright" size={13} className="me-1" />Telif Hakkı Metni
              </label>
              <input
                className="form-control"
                placeholder="(c) 2026 BestWork. Tüm hakları saklıdır."
                value={settings.footer_copyright ?? ""}
                onChange={(e) => set("footer_copyright", e.target.value)}
              />
              <div className="form-text">Tamamen düzenlenebilir; boş bırakılırsa varsayılan metin kullanılır.</div>
            </div>
            <label className="form-label d-block mb-1">Sosyal Medya (boş bırakılabilir)</label>
            <div className="mb-3">
              <div className="input-group">
                <span className="input-group-text"><MaterialIcon name="photo_camera" size={14} /></span>
                <input
                  className="form-control"
                  placeholder="https://instagram.com/bestwork"
                  value={settings.social_instagram ?? ""}
                  onChange={(e) => set("social_instagram", e.target.value)}
                />
              </div>
            </div>
            <div className="mb-3">
              <div className="input-group">
                <span className="input-group-text"><MaterialIcon name="public" size={14} /></span>
                <input
                  className="form-control"
                  placeholder="https://facebook.com/bestwork"
                  value={settings.social_facebook ?? ""}
                  onChange={(e) => set("social_facebook", e.target.value)}
                />
              </div>
            </div>
            <div className="mb-1">
              <div className="input-group">
                <span className="input-group-text"><MaterialIcon name="smart_display" size={14} /></span>
                <input
                  className="form-control"
                  placeholder="https://youtube.com/@bestwork"
                  value={settings.social_youtube ?? ""}
                  onChange={(e) => set("social_youtube", e.target.value)}
                />
              </div>
            </div>
          </PageCard>
        </div>
      </div>

      <div className="mt-3">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving && <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />}
          <MaterialIcon name="save" size={15} className="me-1" /> Kaydet
        </button>
      </div>
    </PanelLayout>
  );
}
