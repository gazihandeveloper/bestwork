"use client";

import { useEffect, useRef, useState } from "react";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import { MaterialIcon } from "@/components/MaterialIcon";
import { api, getErrorMessage } from "@/lib/api";

interface Announcement {
  id: number;
  title: string;
  body: string;
  audience: string;
  is_active: boolean;
  created_at: string;
}

interface AnnouncementForm {
  title: string;
  body: string;
  audience: string;
  is_active: boolean;
}

const emptyForm: AnnouncementForm = { title: "", body: "", audience: "all", is_active: true };

const AUDIENCE_LABEL: Record<string, string> = {
  all: "Tüm Üyeler",
  member: "Üyeler",
  admin: "Yöneticiler",
};

async function listAnnouncements(): Promise<Announcement[]> {
  const { data } = await api.get<{ announcements: Announcement[] }>("/admin/announcements");
  return data.announcements ?? [];
}

export default function DuyurularPage() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AnnouncementForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);

  const load = () => {
    listAnnouncements()
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setFormOpen(true);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  const openEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({ title: a.title, body: a.body, audience: a.audience, is_active: a.is_active });
    setError("");
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError("Başlık ve içerik zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = { title: form.title.trim(), body: form.body, audience: form.audience, is_active: form.is_active };
      if (editingId) await api.put(`/admin/announcements/${editingId}`, body);
      else await api.post("/admin/announcements", body);
      setNotice(editingId ? "Duyuru güncellendi." : "Duyuru eklendi.");
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
      await api.delete(`/admin/announcements/${delTarget.id}`);
      setNotice("Duyuru silindi.");
      setDelTarget(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (error && items === null) return <PanelLayout><ErrorAlert>{error}</ErrorAlert></PanelLayout>;
  if (items === null) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader title="Duyurular" subtitle="Üyelere panel içi duyuru ve bildirimler gönderin." />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && items !== null && <div className="alert alert-danger py-2">{error}</div>}

      <div className="mb-3">
        <button className="btn btn-primary" onClick={openNew}>
          <MaterialIcon name="Plus" size={15} className="me-1" /> Yeni Duyuru
        </button>
      </div>

      {formOpen && (
        <PageCard
          title={editingId ? `Duyuru Düzenle (#${editingId})` : "Yeni Duyuru"}
          subtitle="Başlık ve içerik yazın; hedef kitleyi seçin."
          className="mb-3"
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Başlık *</label>
              <input
                ref={titleRef}
                className="form-control"
                placeholder="Örn. Sistem bakımı hakkında"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Hedef Kitle</label>
              <select
                className="form-select"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
              >
                <option value="all">Tüm Üyeler</option>
                <option value="member">Üyeler</option>
                <option value="admin">Yöneticiler</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="annActive"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="annActive">Aktif</label>
              </div>
            </div>
            <div className="col-12">
              <label className="form-label">İçerik *</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Duyuru metni…"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
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

      <PageCard title="Duyuru Listesi" subtitle={`${items.length} duyuru`}>
        {items.length === 0 ? (
          <InfoAlert>Henüz duyuru yok. "Yeni Duyuru" ile ekleyin.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Hedef</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th className="text-end">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="fw-semibold">{a.title}</div>
                      <div className="text-muted small text-truncate" style={{ maxWidth: 420 }}>{a.body}</div>
                    </td>
                    <td><span className="badge text-bg-light border">{AUDIENCE_LABEL[a.audience] ?? a.audience}</span></td>
                    <td>
                      <span className={`badge ${a.is_active ? "text-bg-success" : "text-bg-secondary"}`}>
                        {a.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="text-muted small">{new Date(a.created_at).toLocaleString("tr-TR")}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(a)} aria-label="Düzenle">
                        <MaterialIcon name="Pencil" size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setDelTarget(a)} aria-label="Sil">
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
        title="Duyuru Sil"
        tone="danger"
        confirmText="Sil"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDelTarget(null)}
      >
        <strong>{delTarget?.title}</strong> duyurusu kalıcı olarak silinecek. Emin misiniz?
      </ConfirmModal>
    </PanelLayout>
  );
}
