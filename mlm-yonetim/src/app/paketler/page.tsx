"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import { api, getErrorMessage } from "@/lib/api";

// Paket JSON'u (backend): {id,name,price,referral_bonus_rate,binary_bonus_rate,
// matching_bonus_rate,discount_rate,required_pv,cv,created_at}
interface PackageRow {
  id: number;
  name: string;
  price: number;
  referral_bonus_rate: number;
  binary_bonus_rate: number;
  matching_bonus_rate: number;
  discount_rate: number;
  required_pv: number;
  cv: number;
  created_at?: string;
}

interface PackageForm {
  name: string;
  price: number;
  referral: number; // %
  binary: number; // %
  matching: number; // %
  discount: number; // %
  pv: number;
  cv: number;
}

const emptyForm: PackageForm = {
  name: "",
  price: 0,
  referral: 0,
  binary: 0,
  matching: 0,
  discount: 0,
  pv: 0,
  cv: 0,
};

const toNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Oranlar backend'de 0..1 kesir; panelde % (0..100) olarak gösterilir.
const rateToPct = (r: number) => Math.round((r ?? 0) * 100);
const pctToRate = (p: number) => (Number.isFinite(p) ? Math.min(100, Math.max(0, p)) / 100 : 0);

// ── Sayfa içinde tanımlı paket CRUD'u ─────────────────────────────
async function listPackagesApi(): Promise<PackageRow[]> {
  const { data } = await api.get<{ packages: PackageRow[] }>("/packages");
  return data.packages ?? [];
}

function toBody(f: PackageForm) {
  return {
    name: f.name.trim(),
    price: f.price,
    referral_bonus_rate: pctToRate(f.referral),
    binary_bonus_rate: pctToRate(f.binary),
    matching_bonus_rate: pctToRate(f.matching),
    discount_rate: pctToRate(f.discount),
    required_pv: f.pv,
    cv: f.cv,
  };
}

async function createPackageApi(f: PackageForm): Promise<void> {
  await api.post("/packages", toBody(f));
}

async function updatePackageApi(id: number, f: PackageForm): Promise<void> {
  await api.put(`/packages/${id}`, toBody(f));
}

async function deletePackageApi(id: number): Promise<void> {
  await api.delete(`/packages/${id}`);
}

export default function PaketlerPage() {
  const [packages, setPackages] = useState<PackageRow[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PackageForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<PackageRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const load = () => {
    listPackagesApi()
      .then(setPackages)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, pv: 0, cv: 0 });
    setError("");
    setFormOpen(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const openEdit = (p: PackageRow) => {
    setEditingId(p.id);
    setForm({
      name: p.name ?? "",
      price: p.price ?? 0,
      referral: rateToPct(p.referral_bonus_rate),
      binary: rateToPct(p.binary_bonus_rate),
      matching: rateToPct(p.matching_bonus_rate),
      discount: rateToPct(p.discount_rate),
      pv: p.required_pv ?? 0,
      cv: p.cv ?? p.required_pv ?? 0,
    });
    setError("");
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("Seviye adı zorunludur.");
      return;
    }
    if (form.price <= 0) {
      setError("Fiyat 0'dan büyük olmalıdır.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = form;
      if (editingId) await updatePackageApi(editingId, body);
      else await createPackageApi(body);
      setNotice(editingId ? "Seviye güncellendi." : "Seviye eklendi.");
      setFormOpen(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await deletePackageApi(delTarget.id);
      setNotice("Seviye silindi.");
      setDelTarget(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (error && packages === null) return <PanelLayout><ErrorAlert>{error}</ErrorAlert></PanelLayout>;
  if (packages === null) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader
        title="Seviyeler"
        subtitle="Seviyeleri yönetin — PV ve CV değerlerini serbestçe ayarlayın."
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && packages !== null && <div className="alert alert-danger py-2">{error}</div>}

      <div className="mb-3">
        <button className="btn btn-primary" onClick={openNew}>
          <MaterialIcon name="Plus" size={15} className="me-1" /> Yeni Seviye
        </button>
      </div>

      {/* Form paneli */}
      {formOpen && (
        <PageCard
          title={editingId ? `Seviye Düzenle (#${editingId})` : "Yeni Seviye"}
          subtitle="PV ve CV değerlerini doğrudan girin."
          className="mb-3"
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Seviye Adı *</label>
              <input
                ref={nameRef}
                className="form-control"
                placeholder="Örn. Bronze"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Fiyat (₺) *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="form-control"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: toNum(e.target.value) })}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">PV (Gerekli)</label>
              <input
                type="number"
                min={0}
                className="form-control"
                value={form.pv}
                onChange={(e) => {
                  const pv = toNum(e.target.value);
                  setForm((f) => ({ ...f, pv }));
                }}
              />
              <div className="form-text">Genelde değişmez.</div>
            </div>
            <div className="col-md-3">
              <label className="form-label">CV</label>
              <input
                type="number"
                min={0}
                className="form-control"
                value={form.cv}
                onChange={(e) => setForm((f) => ({ ...f, cv: toNum(e.target.value) }))}
              />
            </div>


            <div className="col-md-3">
              <label className="form-label">Referans Bonusu (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="form-control"
                value={form.referral}
                onChange={(e) => setForm({ ...form, referral: toNum(e.target.value) })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Binary Bonusu (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="form-control"
                value={form.binary}
                onChange={(e) => setForm({ ...form, binary: toNum(e.target.value) })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Matching Bonusu (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="form-control"
                value={form.matching}
                onChange={(e) => setForm({ ...form, matching: toNum(e.target.value) })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">İndirim Oranı (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="form-control"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: toNum(e.target.value) })}
              />
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving && <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />}
              {editingId ? "Güncelle" : "Kaydet"}
            </button>
            <button className="btn btn-outline-secondary" onClick={() => setFormOpen(false)}>Vazgeç</button>
          </div>
        </PageCard>
      )}

      {/* Paket listesi */}
      <PageCard title="Seviye Listesi" subtitle={`${packages.length} seviye`}>
        {packages.length === 0 ? (
          <InfoAlert>Henüz seviye yok. "Yeni Seviye" ile ekleyin.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Seviye</th>
                  <th>PV</th>
                  <th>Referans</th>
                  <th>Binary</th>
                  <th>Matching</th>
                  <th>İndirim</th>
                  <th className="text-end">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {[...packages].sort((a, b) => (b.required_pv ?? 0) - (a.required_pv ?? 0)).map((p) => (
                  <tr key={p.id}>
                    <td className="fw-semibold">
                      <MaterialIcon name="Layers" size={15} className="text-primary me-1" />
                      {p.name}
                    </td>
                    <td><span className="badge text-bg-primary">{p.required_pv}</span></td>
                    <td>%{rateToPct(p.referral_bonus_rate)}</td>
                    <td>%{rateToPct(p.binary_bonus_rate)}</td>
                    <td>%{rateToPct(p.matching_bonus_rate)}</td>
                    <td>%{rateToPct(p.discount_rate)}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(p)} aria-label="Düzenle">
                        <MaterialIcon name="Pencil" size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setDelTarget(p)} aria-label="Sil">
                        <MaterialIcon name="Trash2" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      <ConfirmModal
        open={delTarget !== null}
        title="Seviye Sil"
        tone="danger"
        confirmText="Sil"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      >
        <strong>{delTarget?.name}</strong> paketi kalıcı olarak silinecek. Emin misiniz?
        {delTarget && (
          <div className="alert alert-warning mt-2 mb-0 py-2 small">
            Bu pakete bağlı kullanıcılar varsa silme işlemi reddedilir.
          </div>
        )}
      </ConfirmModal>
    </PanelLayout>
  );
}
