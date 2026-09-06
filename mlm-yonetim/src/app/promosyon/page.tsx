"use client";

import { useEffect, useState } from "react";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { Loading } from "@/components/StatBox";
import { MaterialIcon } from "@/components/MaterialIcon";
import { api, adjustUserStats, updateSettings, getSettings, getErrorMessage } from "@/lib/api";

const toNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

interface PackageRow {
  id: number;
  name: string;
}

export default function PromosyonPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Seçili üye ve düzeltme değerleri (PV/CV)
  const [target, setTarget] = useState<any | null>(null);
  const [pv, setPv] = useState("");
  const [cv, setCv] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Aktiflik şartı ayarı (panelden değişebilir)
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [actPkgId, setActPkgId] = useState("2");
  const [actGoal, setActGoal] = useState("2");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    api
      .get<{ packages: PackageRow[] }>("/packages")
      .then(({ data }) => setPackages(data.packages ?? []))
      .catch(() => {});
    getSettings()
      .then((s) => {
        setActPkgId(s.activity_package_id ?? "2");
        setActGoal(s.activity_goal_count ?? "2");
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, []);

  const saveActivity = async () => {
    setSaving(true);
    setError("");
    try {
      await updateSettings({
        activity_package_id: actPkgId || "2",
        activity_goal_count: actGoal || "2",
      });
      setNotice("Aktiflik şartı kaydedildi.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get<{ users: any[] }>("/admin/users", {
        params: { q: q.trim(), limit: 10 },
      });
      setResults(data.users ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
      setResults(null);
    } finally {
      setBusy(false);
    }
  };

  const openTarget = (u: any) => {
    setTarget(u);
    setPv("");
    setCv("");
    setReason("");
    setError("");
  };

  const save = async () => {
    if (!target) return;
    setSaving(true);
    setError("");
    try {
      await adjustUserStats(target.id, {
        delta_pv: toNum(pv),
        delta_cv: toNum(cv),
        reason: reason.trim() || "Promosyon",
      });
      setNotice(`${target.name} (${target.member_code}) için PV/CV düzeltmesi uygulandı.`);
      setTarget(null);
      setResults(null);
      setQ("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!settingsLoaded) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader
        title="PV Promosyon & Aktiflik Şartı"
        subtitle="Üye PV/CV düzeltme ve aylık aktiflik şartını (hedef paket kayıtları) yönetin."
        breadcrumb={[{ text: "MLM & Ağaç" }, { text: "PV & Aktiflik" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <PageCard
        title="Aylık Aktiflik Şartı"
        subtitle="Üye, ay içinde bu hedef pakete ulaşan alt üyelerden hedef adet kadar kayıt yapınca o ay AKTİF sayılır (alışveriş şartı yok, ödül yok)."
        className="mb-3"
      >
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <label className="form-label">Hedef Paket</label>
            <select className="form-select" value={actPkgId} onChange={(e) => setActPkgId(e.target.value)}>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Hedef Adet (kayıt)</label>
            <input
              type="number"
              min={1}
              className="form-control"
              value={actGoal}
              onChange={(e) => setActGoal(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary" onClick={saveActivity} disabled={saving}>
              {saving && <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />}
              <MaterialIcon name="Save" size={15} className="me-1" /> Kaydet
            </button>
          </div>
        </div>
        <div className="form-text mt-2">
          Örn. Hedef Paket: Bronze, Hedef Adet: 2 → üye ay içinde 2 alt üyesini Bronze pakete
          ulaştırınca o ay aktif kabul edilir. Sayaç her ay sonunda sıfırlanır.
        </div>
      </PageCard>

      <PageCard title="Üye Ara" subtitle="Ad, e-posta veya üye no ile arayın.">
        <div className="input-group">
          <input
            className="form-control"
            placeholder="Ad / e-posta / üye no…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
          />
          <button className="btn btn-primary" onClick={search} disabled={busy}>
            {busy ? <span className="spinner-border spinner-border-sm" role="status" /> : <MaterialIcon name="Search" size={16} />}
          </button>
        </div>

        {results !== null && (
          <div className="list-group mt-3" style={{ maxHeight: 260, overflowY: "auto" }}>
            {results.length === 0 ? (
              <div className="list-group-item text-muted small">Sonuç bulunamadı.</div>
            ) : (
              results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  onClick={() => openTarget(u)}
                >
                  <span>
                    <strong>{u.name}</strong>{" "}
                    <span className="text-muted small">{u.member_code}</span>
                    <div className="text-muted small">
                      PV: {u.total_pv_accumulated ?? 0} · CV: {u.total_cv_accumulated ?? 0}
                    </div>
                  </span>
                  <MaterialIcon name="ChevronRight" size={15} />
                </button>
              ))
            )}
          </div>
        )}
      </PageCard>

      {target && (
        <PageCard
          title={`PV/CV Düzeltme: ${target.name} (${target.member_code})`}
          subtitle="Negatif değer girerseniz düşürür, pozitif eklersiniz."
          className="mt-3"
        >
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">PV (delta)</label>
              <input type="number" className="form-control" value={pv} onChange={(e) => setPv(e.target.value)} placeholder="+/- PV" />
            </div>
            <div className="col-md-3">
              <label className="form-label">CV (delta)</label>
              <input type="number" className="form-control" value={cv} onChange={(e) => setCv(e.target.value)} placeholder="+/- CV" />
            </div>
            <div className="col-md-4">
              <label className="form-label">Sebep *</label>
              <input className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Örn. promosyon" />
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-warning" onClick={save} disabled={saving}>
              {saving && <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />}
              <MaterialIcon name="Tune" size={15} className="me-1" />
              Uygula
            </button>
            <button className="btn btn-outline-secondary" onClick={() => setTarget(null)}>Vazgeç</button>
          </div>
          <div className="form-text mt-2">
            PV düzeltmesi üst hat bacak toplamlarını yeniden hesaplar.
          </div>
        </PageCard>
      )}
    </PanelLayout>
  );
}
