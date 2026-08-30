"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, Loading } from "@/components/StatBox";
import { api, getErrorMessage, getFraudDuplicates, type FraudDuplicate } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Backend JSON şekilleri ────────────────────────────────────────────────
// POST /admin/fraud/scan  { field, value } -> { matches: FraudMatch[] }
// GET  /admin/fraud/matches                -> { matches: FraudMatch[] } (kalıcı sonuç saklanmaz)
// GET  /admin/fraud/duplicates?limit=8     -> { groups: FraudDuplicate[] } (api.ts getFraudDuplicates)
interface FraudMatch {
  user_id: number;
  name: string;
  member_code: string;
  email: string;
  phone: string;
  matched_field: string;
  matched_value: string;
  count: number;
  risk: "high" | "medium" | "low";
}

type ScanField = "tc" | "iban" | "phone" | "email";

const FIELD_OPTIONS: { key: ScanField; label: string; placeholder: string }[] = [
  { key: "tc", label: "TC Kimlik No", placeholder: "Örn. 12345678901" },
  { key: "iban", label: "IBAN", placeholder: "Örn. TR12 0000 1234 5678" },
  { key: "phone", label: "Telefon", placeholder: "Örn. 0532 000 00 00" },
  { key: "email", label: "E-posta", placeholder: "Örn. ornek@mail.com" },
];

const fieldLabel = (f: string) =>
  f === "tc" ? "TC Kimlik" : f === "iban" ? "IBAN" : f === "phone" ? "Telefon" : f === "email" ? "E-posta" : f;

const riskMeta = (r: string) =>
  r === "high"
    ? { label: "Yüksek Risk", cls: "text-bg-danger" }
    : r === "medium"
      ? { label: "Orta Risk", cls: "text-bg-warning" }
      : { label: "Düşük Risk", cls: "text-bg-success" };

const dupRisk = (count: number) =>
  count >= 3 ? { label: "Yüksek", cls: "text-bg-danger" } : { label: "Orta", cls: "text-bg-warning" };

// Sayfa içinde tanımlı fraud API çağrıları (panel axios instance'ı oturum/CSRF yönetir).
async function scanFraudApi(field: string, value: string): Promise<FraudMatch[]> {
  const { data } = await api.post<{ matches: FraudMatch[] }>("/admin/fraud/scan", { field, value });
  return data.matches ?? [];
}

async function listFraudMatchesApi(): Promise<FraudMatch[]> {
  const { data } = await api.get<{ matches: FraudMatch[] }>("/admin/fraud/matches");
  return data.matches ?? [];
}

export default function GuvenlikPage() {
  // ── Tarama formu ──
  const [scanField, setScanField] = useState<ScanField>("phone");
  const [scanValue, setScanValue] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResults, setScanResults] = useState<FraudMatch[] | null>(null);

  // ── Mükerrer hesap grupları + kalıcı eşleşmeler ──
  const [duplicates, setDuplicates] = useState<FraudDuplicate[] | null>(null);
  const [matches, setMatches] = useState<FraudMatch[] | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadDuplicates = () => {
    getFraudDuplicates(10)
      .then(setDuplicates)
      .catch((err) => setError(getErrorMessage(err)));
  };

  const loadMatches = () => {
    listFraudMatchesApi()
      .then(setMatches)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    loadDuplicates();
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runScan = async () => {
    const v = scanValue.trim();
    if (!v) {
      setError("Tarama için bir değer girin.");
      return;
    }
    setScanBusy(true);
    setError("");
    setNotice("");
    try {
      const results = await scanFraudApi(scanField, v);
      setScanResults(results);
      setNotice(results.length > 0 ? `${results.length} eşleşme bulundu.` : "Eşleşme bulunamadı.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setScanBusy(false);
    }
  };

  if (duplicates === null || matches === null) return <PanelLayout><Loading /></PanelLayout>;

  const activeField = FIELD_OPTIONS.find((f) => f.key === scanField) ?? FIELD_OPTIONS[0];

  return (
    <PanelLayout>
      <PageHeader
        title="Güvenlik"
        subtitle="Fraud & multi-hesap yönetimi — mükerrer kayıtlar ve hesap taraması."
        breadcrumb={[{ text: "Genel Bakış", href: "/" }, { text: "Güvenlik" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* ── 1) Multi-Hesap Taraması ── */}
      <PageCard
        title="Multi-Hesap Taraması"
        subtitle="TC kimlik, IBAN, telefon veya e-posta ile anlık mükerrer hesap taraması yapın."
        className="mb-3"
      >
        <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
          <div>
            <label className="form-label small mb-1">Eşleşme Alanı</label>
            <select
              className="form-select form-select-sm"
              style={{ minWidth: 170 }}
              value={scanField}
              onChange={(e) => setScanField(e.target.value as ScanField)}
            >
              {FIELD_OPTIONS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-grow-1" style={{ minWidth: 240, maxWidth: 420 }}>
            <label className="form-label small mb-1">Değer</label>
            <input
              className="form-control form-control-sm"
              placeholder={activeField.placeholder}
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void runScan();
              }}
            />
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={scanBusy || !scanValue.trim()}
              onClick={() => void runScan()}
            >
              {scanBusy ? (
                <MaterialIcon name="Loader2" size={14} className="animate-spin me-1" />
              ) : (
                <MaterialIcon name="Scan" size={14} className="me-1" />
              )}
              Taramayı Başlat
            </button>
            {scanResults !== null && (
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setScanResults(null); setNotice(""); }}>
                <MaterialIcon name="X" size={14} className="me-1" />
                Temizle
              </button>
            )}
          </div>
        </div>

        {scanResults === null ? (
          <InfoAlert>
            Henüz tarama yapılmadı. Yukarıdan bir alan seçip değer girerek tarama başlatın — sonuçlar
            burada listelenir.
          </InfoAlert>
        ) : scanResults.length === 0 ? (
          <InfoAlert>
            <b>{fieldLabel(activeField.key)}</b> için <b>{scanValue.trim()}</b> değeriyle eşleşen hesap bulunamadı.
          </InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Üye</th>
                  <th>Üye Kodu</th>
                  <th>E-posta</th>
                  <th>Telefon</th>
                  <th>Eşleşen Değer</th>
                  <th className="text-center">Hesap Sayısı</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {scanResults.map((m) => (
                  <tr key={m.user_id}>
                    <td className="fw-semibold">
                      {m.name || `Üye #${m.user_id}`}
                      <span className="text-muted small"> · #{m.user_id}</span>
                    </td>
                    <td className="text-muted">{m.member_code}</td>
                    <td className="text-muted small">{m.email || "—"}</td>
                    <td className="text-muted small">{m.phone || "—"}</td>
                    <td>
                      <span className="badge text-bg-light border">{fieldLabel(m.matched_field)}</span>{" "}
                      <span className="text-muted small">{m.matched_value}</span>
                    </td>
                    <td className="text-center">
                      <span className="badge text-bg-dark">{m.count}</span>
                    </td>
                    <td>
                      <span className={cn("badge", riskMeta(m.risk).cls)}>{riskMeta(m.risk).label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* ── 2) Mükerrer Hesap Grupları ── */}
      <PageCard
        title="Mükerrer Hesap Grupları"
        subtitle="Aynı telefon / IBAN / TC kimlik ile açılmış hesap grupları (otomatik tespit)."
        className="mb-3"
        actions={
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadDuplicates}>
            <MaterialIcon name="RefreshCw" size={14} className="me-1" />
            Yenile
          </button>
        }
      >
        {duplicates.length === 0 ? (
          <InfoAlert>Mükerrer hesap tespit edilmedi — tüm telefon, IBAN ve TC kimlikler benzersiz görünüyor.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Alan</th>
                  <th>Değer</th>
                  <th className="text-center">Hesap Sayısı</th>
                  <th>Hesap ID&apos;leri</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((d, i) => (
                  <tr key={`${d.field}-${d.value}-${i}`}>
                    <td><span className="badge text-bg-light border">{fieldLabel(d.field)}</span></td>
                    <td className="fw-semibold">{d.value}</td>
                    <td className="text-center">
                      <span className="badge text-bg-dark">{d.count}</span>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {d.accounts.map((id) => (
                          <span key={id} className="badge text-bg-secondary">#{id}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={cn("badge", dupRisk(d.count).cls)}>{dupRisk(d.count).label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* ── 3) Kayıtlı Eşleşmeler ── */}
      <PageCard
        title="Kayıtlı Eşleşmeler"
        subtitle="GET /admin/fraud/matches — kalıcı saklanan tarama sonuçları."
      >
        {matches.length === 0 ? (
          <InfoAlert>
            Kalıcı saklanan eşleşme bulunmuyor. Tarama sonuçları sunucuda saklanmaz; anlık taramalar
            yukarıdaki form ile yapılır.
          </InfoAlert>
        ) : (
          <p className="mb-0">{matches.length} kayıtlı eşleşme.</p>
        )}
      </PageCard>
    </PanelLayout>
  );
}
