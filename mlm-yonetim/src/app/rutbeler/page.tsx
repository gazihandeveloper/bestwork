"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import { listRanks, createRank, updateRank, deleteRank, getErrorMessage, type Rank } from "@/lib/api";

interface RankForm {
  name: string;
  leftPv: number;
  rightPv: number;
  monthlyLimit: number;
  downlineRankId: number | null;
  downlineCount: number;
  activityPv: number;
}

const emptyForm: RankForm = {
  name: "",
  leftPv: 0,
  rightPv: 0,
  monthlyLimit: 0,
  downlineRankId: null,
  downlineCount: 0,
  activityPv: 250,
};

const toNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (v: number) => v.toLocaleString("tr-TR");

export default function SeviyelerPage() {
  const [ranks, setRanks] = useState<Rank[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RankForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Rank | null>(null);
  const [deleting, setDeleting] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const load = () => {
    listRanks()
      .then(setRanks)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, []);

  const rankName = (id?: number | null) => {
    if (!id) return "—";
    return ranks?.find((r) => r.id === id)?.name ?? `#${id}`;
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setFormOpen(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const openEdit = (r: Rank) => {
    setEditingId(r.id);
    setForm({
      name: r.name ?? "",
      leftPv: r.required_left_pv ?? 0,
      rightPv: r.required_right_pv ?? 0,
      monthlyLimit: r.monthly_binary_limit ?? 0,
      downlineRankId: r.required_downline_rank_id ?? null,
      downlineCount: r.required_downline_count ?? 0,
      activityPv: r.personal_activity_pv ?? 250,
    });
    setError("");
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("Seviye adı zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input = {
        name: form.name.trim(),
        required_left_pv: form.leftPv,
        required_right_pv: form.rightPv,
        monthly_binary_limit: form.monthlyLimit,
        required_downline_rank_id: form.downlineRankId,
        required_downline_count: form.downlineCount,
        personal_activity_pv: form.activityPv,
      };
      if (editingId) await updateRank(editingId, input);
      else await createRank(input);
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
      await deleteRank(delTarget.id);
      setNotice("Seviye silindi.");
      setDelTarget(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (error && ranks === null) return <PanelLayout><ErrorAlert>{error}</ErrorAlert></PanelLayout>;
  if (ranks === null) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader
        title="Seviyeler (Rütbeler)"
        subtitle="Kariyer merdivenini yönetin — PV eşiği, alt kariyer şartı, kişisel aktiflik ve aylık binary limit."
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && ranks !== null && <div className="alert alert-danger py-2">{error}</div>}

      <div className="mb-3">
        <button className="btn btn-primary" onClick={openNew}>
          <MaterialIcon name="Plus" size={15} className="me-1" /> Yeni Seviye
        </button>
      </div>

      {/* Form paneli */}
      {formOpen && (
        <PageCard
          title={editingId ? `Seviye Düzenle (#${editingId})` : "Yeni Seviye"}
          subtitle="Alt kariyer şartı 'kendi neslinden' sayılır; PV şartı spillover dahil toplam bacak hacmidir."
          className="mb-3"
        >
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Seviye Adı *</label>
              <input
                ref={nameRef}
                className="form-control"
                placeholder="Örn. Elmas"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Sol Bacak PV</label>
              <input
                type="number"
                min={0}
                className="form-control"
                value={form.leftPv}
                onChange={(e) => setForm({ ...form, leftPv: toNum(e.target.value) })}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Sağ Bacak PV</label>
              <input
                type="number"
                min={0}
                className="form-control"
                value={form.rightPv}
                onChange={(e) => setForm({ ...form, rightPv: toNum(e.target.value) })}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Aylık Binary Limit (₺)</label>
              <input
                type="number"
                min={0}
                className="form-control"
                value={form.monthlyLimit}
                onChange={(e) => setForm({ ...form, monthlyLimit: toNum(e.target.value) })}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Kişisel Aktiflik (PV/ay)</label>
              <input
                type="number"
                min={0}
                className="form-control"
                value={form.activityPv}
                onChange={(e) => setForm({ ...form, activityPv: toNum(e.target.value) })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Alt Kariyer Şartı (her bacakta)</label>
              <select
                className="form-select"
                value={form.downlineRankId ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    downlineRankId: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              >
                <option value="">— Yok (sadece PV) —</option>
                {ranks
                  .filter((r) => r.id !== editingId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Adet (bacak başına)</label>
              <input
                type="number"
                min={0}
                className="form-control"
                value={form.downlineCount}
                onChange={(e) => setForm({ ...form, downlineCount: toNum(e.target.value) })}
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

      {/* Seviye listesi */}
      <PageCard title="Seviye Listesi" subtitle={`${ranks.length} seviye`}>
        {ranks.length === 0 ? (
          <InfoAlert>Henüz seviye yok. "Yeni Seviye" ile ekleyin.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Seviye</th>
                  <th>Sol PV</th>
                  <th>Sağ PV</th>
                  <th>Alt Kariyer Şartı</th>
                  <th>Aktiflik</th>
                  <th>Aylık Binary Limit</th>
                  <th className="text-end">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {ranks.map((r) => {
                  const downline = r.required_downline_count && r.required_downline_count > 0
                    ? `${r.required_downline_count} × ${rankName(r.required_downline_rank_id)}`
                    : "—";
                  return (
                    <tr key={r.id}>
                      <td className="fw-semibold">
                        <MaterialIcon name="Trophy" size={15} className="text-warning me-1" />
                        {r.name}
                      </td>
                      <td><span className="badge text-bg-primary"><MaterialIcon name="GitBranch" size={11} className="me-1" />{fmt(r.required_left_pv)}</span></td>
                      <td><span className="badge text-bg-primary">{fmt(r.required_right_pv)}</span></td>
                      <td><span className="badge text-bg-info">{downline}</span></td>
                      <td>{r.personal_activity_pv ?? 250} PV/ay</td>
                      <td>₺{fmt(r.monthly_binary_limit)}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(r)} aria-label="Düzenle">
                          <MaterialIcon name="Pencil" size={14} />
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setDelTarget(r)} aria-label="Sil">
                          <MaterialIcon name="Trash2" size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
        <strong>{delTarget?.name}</strong> seviyesi kalıcı olarak silinecek. Emin misiniz?
        {delTarget && (
          <div className="alert alert-warning mt-2 mb-0 py-2 small">
            Bu seviyeye ulaşmış kullanıcılar varsa silme işlemi reddedilir.
          </div>
        )}
      </ConfirmModal>
    </PanelLayout>
  );
}
