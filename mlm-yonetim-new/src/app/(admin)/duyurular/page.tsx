"use client";

import { useEffect, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  AdminModal,
  inputCls,
  labelCls,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getErrorMessage,
  type Announcement,
  type AnnouncementInput,
} from "@/lib/api";

const AUDIENCE_OPTIONS = ["all", "members", "customers"] as const;

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Tümü",
  members: "Üyeler",
  customers: "Müşteriler",
};

const emptyForm: Required<AnnouncementInput> = {
  title: "",
  body: "",
  audience: "all",
  is_active: true,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DuyurularPage() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Required<AnnouncementInput>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = () => {
    listAnnouncements()
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setFormOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      body: a.body,
      audience: a.audience || "all",
      is_active: a.is_active,
    });
    setError("");
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Başlık zorunludur.");
      return;
    }
    if (!form.body.trim()) {
      setError("Duyuru metni zorunludur.");
      return;
    }
    setSaving(true);
    setError("");
    const input: AnnouncementInput = {
      title: form.title.trim(),
      body: form.body.trim(),
      audience: form.audience,
      is_active: form.is_active,
    };
    try {
      if (editingId) await updateAnnouncement(editingId, input);
      else await createAnnouncement(input);
      setNotice(editingId ? "Duyuru güncellendi." : "Duyuru oluşturuldu.");
      setFormOpen(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (a: Announcement) => {
    if (!window.confirm(`"${a.title}" duyurusu silinecek. Emin misiniz?`)) return;
    setError("");
    try {
      await deleteAnnouncement(a.id);
      setNotice("Duyuru silindi.");
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (error && items === null) return <AdminAlert kind="error">{error}</AdminAlert>;
  if (items === null) return <AdminSpinner label="Duyurular yükleniyor…" />;

  // Mevcut değer standart listede yoksa seçeneğe ekleyerek koru.
  const audienceOptions = [...new Set([...AUDIENCE_OPTIONS, form.audience])];

  return (
    <div>
      <AdminHeader
        title="Duyurular"
        subtitle="Üyelere ve müşterilere duyuru yayınlayın — hedef kitleye göre görünür, aktif/pasif yönetilir."
        actions={<AdminBtn onClick={openNew}>+ Yeni Duyuru</AdminBtn>}
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && items !== null && <AdminAlert kind="error">{error}</AdminAlert>}

      {items.length === 0 ? (
        <AdminEmpty>Henüz duyuru yok. "Yeni Duyuru" ile ekleyin.</AdminEmpty>
      ) : (
        <AdminCard title={`Duyurular (${items.length})`} subtitle="Yalnız “Aktif” duyurular hedef kitleye gösterilir.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className={thCls}>Başlık</th>
                  <th className={thCls}>Hedef Kitle</th>
                  <th className={thCls}>Durum</th>
                  <th className={thCls}>Oluşturma</th>
                  <th className={`${thCls} text-right`}>İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className={`${tdCls} font-medium text-gray-800 dark:text-white/90`}>
                      {a.title}
                    </td>
                    <td className={`${tdCls} text-gray-700 dark:text-gray-300`}>
                      {AUDIENCE_LABELS[a.audience] ?? a.audience}
                    </td>
                    <td className={tdCls}>
                      <AdminBadge color={a.is_active ? "green" : "gray"}>
                        {a.is_active ? "Aktif" : "Pasif"}
                      </AdminBadge>
                    </td>
                    <td className={`${tdCls} text-gray-500 dark:text-gray-400`}>
                      {formatDate(a.created_at)}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <AdminBtn variant="outline" size="xs" onClick={() => openEdit(a)} className="mr-1">
                        Düzenle
                      </AdminBtn>
                      <AdminBtn variant="danger" size="xs" onClick={() => confirmDelete(a)}>
                        Sil
                      </AdminBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      <AdminModal
        open={formOpen}
        title={editingId ? `Duyuruyu Düzenle (#${editingId})` : "Yeni Duyuru"}
        size="lg"
        onClose={() => setFormOpen(false)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Başlık *</label>
            <input
              className={inputCls}
              placeholder="Bakım Çalışması Bilgilendirmesi"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Duyuru Metni *</label>
            <textarea
              className={inputCls}
              rows={5}
              placeholder="Duyuru metnini yazın…"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Hedef Kitle</label>
            <select
              className={inputCls}
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
            >
              {audienceOptions.map((v) => (
                <option key={v} value={v}>
                  {AUDIENCE_LABELS[v] ?? v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Aktif (yayında)
            </label>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <AdminBtn onClick={save} disabled={saving}>
            {saving ? "Kaydediliyor…" : editingId ? "Güncelle" : "Kaydet"}
          </AdminBtn>
          <AdminBtn variant="outline" onClick={() => setFormOpen(false)}>
            Vazgeç
          </AdminBtn>
        </div>
      </AdminModal>
    </div>
  );
}
