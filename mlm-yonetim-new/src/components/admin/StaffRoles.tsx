"use client";

import { useEffect, useState } from "react";
import {
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
import { ChevronDownIcon } from "@/components/icons";
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getErrorMessage,
  type StaffMember,
  type StaffInput,
} from "@/lib/api";
import { STAFF_NAV_ITEMS, STAFF_NAV_PATHS, type NavEntry } from "@/lib/nav";

type Form = {
  ad: string;
  soyad: string;
  email: string;
  phone: string;
  birim: string;
  password: string;
  menus: string[];
};

const emptyForm: Form = {
  ad: "",
  soyad: "",
  email: "",
  phone: "",
  birim: "",
  password: "",
  menus: [],
};

// Menü yolu -> Görev Yetkileri ana başlığı (üst menü) adı
const MENU_NAME: Record<string, string> = {};
STAFF_NAV_ITEMS.forEach((e) => {
  if (e.subItems) e.subItems.forEach((s) => (MENU_NAME[s.path] = e.name));
  else if (e.path) MENU_NAME[e.path] = e.name;
});

// Yalnızca güncel menü ağacında tanımlı yetkilerin ana başlıklarını döndürür.
// (Artık menüde olmayan eski/geçersiz yetki anahtarları gösterilmez.)
const gorevBasliklari = (menus?: string[]) =>
  Array.from(
    new Set((menus || []).filter((m) => MENU_NAME[m]).map((m) => MENU_NAME[m]))
  );

export default function StaffRoles({ listOnly = false, hideList = false }: { listOnly?: boolean; hideList?: boolean }) {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [delTarget, setDelTarget] = useState<StaffMember | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const load = () => {
    listStaff()
      .then(setStaff)
      .catch((e) => setError(getErrorMessage(e)));
  };

  useEffect(() => {
    load();
  }, []);

  const groupPaths = (e: NavEntry) => e.subItems?.map((s) => s.path) ?? [];

  const toggleChild = (path: string) =>
    setForm((f) => ({
      ...f,
      menus: f.menus.includes(path)
        ? f.menus.filter((m) => m !== path)
        : [...f.menus, path],
    }));

  const toggleGroup = (e: NavEntry) => {
    const ps = groupPaths(e);
    const all = ps.length > 0 && ps.every((p) => form.menus.includes(p));
    setForm((f) => ({
      ...f,
      menus: all
        ? f.menus.filter((m) => !ps.includes(m))
        : Array.from(new Set([...f.menus, ...ps])),
    }));
  };

  const allSelected = STAFF_NAV_PATHS.every((p) => form.menus.includes(p));
  const toggleAll = () =>
    setForm((f) => ({ ...f, menus: allSelected ? [] : [...STAFF_NAV_PATHS] }));

  const reset = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  };

  const startEdit = (s: StaffMember) => {
    const parts = (s.name || "").trim().split(/\s+/);
    setForm({
      ad: parts[0] || "",
      soyad: parts.slice(1).join(" "),
      email: s.email,
      phone: s.phone || "",
      birim: "",
      password: "",
      menus: [...(s.menus || [])],
    });
    setEditingId(s.id);
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    setError("");
    setNotice("");
    if (!form.ad.trim()) {
      setError("İsim zorunludur.");
      return;
    }
    if (!form.email.trim()) {
      setError("E-posta zorunludur.");
      return;
    }
    if (!editingId && form.password.trim().length < 6) {
      setError("Yeni çalışan için şifre zorunludur (en az 6 karakter).");
      return;
    }
    const payload: StaffInput = {
      name: `${form.ad.trim()} ${form.soyad.trim()}`.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      menus: form.menus,
      ...(form.password.trim() ? { password: form.password.trim() } : {}),
    };
    setBusy(true);
    try {
      if (editingId) {
        await updateStaff(editingId, payload);
        setNotice("Çalışan güncellendi.");
      } else {
        await createStaff(payload);
        setNotice("Çalışan oluşturuldu — bu bilgilerle panele giriş yapabilir.");
      }
      reset();
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setBusy(true);
    setError("");
    try {
      await deleteStaff(delTarget.id);
      setNotice("Çalışan silindi / pasife alındı.");
      if (editingId === delTarget.id) reset();
      setDelTarget(null);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (staff === null) return <AdminSpinner label="Çalışanlar yükleniyor…" />;

  return (
    <div className="flex flex-col gap-5">
      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      {(!listOnly || editingId !== null) && (
      <AdminCard
        title={editingId ? "Düzenle" : "Yeni Çalışan"}
        subtitle="Bilgileri girin, erişebileceği menüleri işaretleyin."
        actions={
          editingId ? (
            <AdminBtn variant="outline" size="xs" onClick={reset}>
              Vazgeç
            </AdminBtn>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}>İsim</label>
            <input
              className={inputCls}
              value={form.ad}
              onChange={(e) => setForm({ ...form, ad: e.target.value })}
              placeholder="Ahmet"
            />
          </div>
          <div>
            <label className={labelCls}>Soyisim</label>
            <input
              className={inputCls}
              value={form.soyad}
              onChange={(e) => setForm({ ...form, soyad: e.target.value })}
              placeholder="Yılmaz"
            />
          </div>
          <div>
            <label className={labelCls}>Birim</label>
            <input
              className={inputCls}
              value={form.birim}
              onChange={(e) => setForm({ ...form, birim: e.target.value })}
              placeholder="Örn. Satış"
            />
          </div>
          <div>
            <label className={labelCls}>Telefon</label>
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="05xx xxx xx xx"
            />
          </div>
          <div>
            <label className={labelCls}>E-posta (giriş için)</label>
            <input
              className={inputCls}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="calisan@bestwork.com"
            />
          </div>
          <div>
            <label className={labelCls}>
              {editingId ? "Yeni Şifre (boşsa değişmez)" : "Şifre"}
            </label>
            <input
              className={inputCls}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Görev Yetkileri
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Bu çalışanın panelde görebileceği menüler ({form.menus.length}/
                {STAFF_NAV_PATHS.length})
              </div>
            </div>
            <AdminBtn size="xs" variant="outline" onClick={toggleAll}>
              {allSelected ? "Tümünü Kaldır" : "Tümünü Seç"}
            </AdminBtn>
          </div>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {STAFF_NAV_ITEMS.map((entry) => {
              const ps = groupPaths(entry);
              const isGroup = !!entry.subItems;
              const selected = isGroup
                ? ps.filter((p) => form.menus.includes(p)).length
                : entry.path && form.menus.includes(entry.path)
                  ? 1
                  : 0;
              const total = isGroup ? ps.length : 1;
              const isOpen = !!openGroups[entry.name];
              return (
                <div key={entry.name}>
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-[#29a56c]"
                      checked={isGroup ? ps.every((p) => form.menus.includes(p)) : selected === 1}
                      onChange={() =>
                        isGroup ? toggleGroup(entry) : entry.path && toggleChild(entry.path)
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        isGroup &&
                        setOpenGroups((g) => ({ ...g, [entry.name]: !g[entry.name] }))
                      }
                      className={`flex flex-1 items-center justify-between gap-2 text-left ${
                        isGroup ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {entry.name}
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className={`text-xs ${
                            selected > 0 ? "font-semibold text-brand-500" : "text-gray-400"
                          }`}
                        >
                          {selected}/{total}
                        </span>
                        {isGroup && (
                          <ChevronDownIcon
                            className={`h-4 w-4 text-gray-400 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </span>
                    </button>
                  </div>
                  {isGroup && isOpen && (
                    <div className="border-t border-gray-100 bg-gray-50/60 px-3.5 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {entry.subItems!.map((sub) => (
                          <label
                            key={sub.path}
                            className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                          >
                            <input
                              type="checkbox"
                              className="size-4 accent-[#29a56c]"
                              checked={form.menus.includes(sub.path)}
                              onChange={() => toggleChild(sub.path)}
                            />
                            {sub.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <AdminBtn onClick={save} disabled={busy}>
            {busy ? "Kaydediliyor…" : editingId ? "Güncelle" : "Çalışan Ekle"}
          </AdminBtn>
        </div>
      </AdminCard>
      )}

      {!hideList && editingId === null && (
      <AdminCard title="Kullanıcılar" subtitle={`${staff.length} kayıtlı kullanıcı`}>
        {staff.length === 0 ? (
          <AdminEmpty>Henüz çalışan oluşturulmadı.</AdminEmpty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th className={thCls}>Ad Soyad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">BİRİM</th>
                  <th className={thCls}>E-posta</th>
                  <th className={thCls}>Telefon</th>
                  <th className={thCls}>Durum</th>
                  <th className={`${thCls} text-right`}>İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className={tdCls}>
                      <div className="font-medium text-gray-800 dark:text-white/90">
                        {s.name}
                      </div>
                    </td>
                    <td className={tdCls}>
                      {gorevBasliklari(s.menus).join(", ") || "—"}
                    </td>
                    <td className={tdCls}>{s.email}</td>
                    <td className={tdCls}>{s.phone || "—"}</td>
                    <td className={tdCls}>
                      {s.is_active ? (
                        <AdminBadge color="green">Aktif</AdminBadge>
                      ) : (
                        <AdminBadge color="red">Pasif</AdminBadge>
                      )}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      <AdminBtn size="xs" variant="outline" onClick={() => startEdit(s)}>
                        Düzenle
                      </AdminBtn>{" "}
                      <AdminBtn size="xs" variant="danger" onClick={() => setDelTarget(s)}>
                        Sil
                      </AdminBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
      )}

      <AdminModal
        open={!!delTarget}
        title="Çalışanı Sil"
        tone="danger"
        onClose={() => setDelTarget(null)}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <b>{delTarget?.name}</b> adlı çalışanı silmek istediğinize emin misiniz?
          Bağlı kaydı varsa hesap pasife alınır.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <AdminBtn variant="outline" onClick={() => setDelTarget(null)}>
            Vazgeç
          </AdminBtn>
          <AdminBtn variant="danger" onClick={confirmDelete} disabled={busy}>
            {busy ? "Siliniyor…" : "Evet, Sil"}
          </AdminBtn>
        </div>
      </AdminModal>
    </div>
  );
}
