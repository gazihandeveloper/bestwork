"use client";

import { useEffect, useState } from "react";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import { MaterialIcon } from "@/components/MaterialIcon";
import { api, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  member_code: string;
  role: string;
  is_active: boolean;
  phone?: string | null;
  current_rank_id?: number | null;
  created_at?: string;
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Süper Admin",
  admin: "Yönetici",
  user: "Üye",
  customer: "Müşteri",
};

export default function UyelerPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdminUser | null>(null);

  const load = (search?: string) => {
    const term = search ?? q;
    api
      .get<{ users: AdminUser[]; total: number }>("/admin/users", { params: { q: term, limit: 100 } })
      .then(({ data }) => setUsers(data.users ?? []))
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const changeRole = async (u: AdminUser, role: string) => {
    setBusyId(u.id);
    try {
      await api.put(`/admin/users/${u.id}/role`, { role, reason: `Rol ${u.role} → ${role}` });
      setNotice(`${u.name} rolü güncellendi.`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
      load();
    } finally {
      setBusyId(null);
    }
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    setBusyId(toggleTarget.id);
    try {
      await api.put(`/admin/users/${toggleTarget.id}/status`, {
        is_active: !toggleTarget.is_active,
        reason: toggleTarget.is_active ? "Hesap donduruldu" : "Hesap aktifleştirildi",
      });
      setNotice(toggleTarget.is_active ? "Üye donduruldu." : "Üye aktifleştirildi.");
      setToggleTarget(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (error && users === null) return <PanelLayout><ErrorAlert>{error}</ErrorAlert></PanelLayout>;
  if (users === null) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader title="Üyeler" subtitle="Üyeleri arayın, dondurun veya aktifleştirin." />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && users !== null && <div className="alert alert-danger py-2">{error}</div>}

      <PageCard title="Üye Arama">
        <form className="row g-2" onSubmit={onSearch}>
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white"><MaterialIcon name="Search" size={16} /></span>
              <input
                className="form-control"
                placeholder="Ad, e-posta, üye no veya telefon ara…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary" type="submit">Ara</button>
          </div>
        </form>
      </PageCard>

      <PageCard title="Üye Listesi" subtitle={`${users.length} üye`}>
        {users.length === 0 ? (
          <InfoAlert>Arama sonucu üye bulunamadı.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Üye No</th>
                  <th>Ad</th>
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th className="text-end">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-semibold">{u.member_code}</td>
                    <td>
                      <div className="fw-semibold">{u.name}</div>
                      {u.phone && <div className="text-muted small">{u.phone}</div>}
                    </td>
                    <td className="text-muted">{u.email}</td>
                    <td>
                      {u.role === "super_admin" ? (
                        <span className="badge text-bg-danger">{ROLE_LABEL[u.role]}</span>
                      ) : (
                        <select
                          className="form-select form-select-sm"
                          style={{ minWidth: 130 }}
                          value={u.role}
                          disabled={busyId === u.id}
                          onChange={(e) => void changeRole(u, e.target.value)}
                        >
                          <option value="admin">Yönetici</option>
                          <option value="user">Üye</option>
                          <option value="customer">Müşteri</option>
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={cn("badge", u.is_active ? "text-bg-success" : "text-bg-danger")}>
                        {u.is_active ? "Aktif" : "Donduruldu"}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        className={cn("btn btn-sm", u.is_active ? "btn-outline-danger" : "btn-outline-success")}
                        disabled={busyId === u.id || u.role === "super_admin"}
                        onClick={() => setToggleTarget(u)}
                      >
                        {busyId === u.id ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        ) : u.is_active ? (
                          <>Dondur</>
                        ) : (
                          <>Aktifleştir</>
                        )}
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
        open={toggleTarget !== null}
        title={toggleTarget?.is_active ? "Üyeyi Dondur" : "Üyeyi Aktifleştir"}
        tone={toggleTarget?.is_active ? "danger" : "success"}
        confirmText={toggleTarget?.is_active ? "Dondur" : "Aktifleştir"}
        busy={busyId !== null}
        onConfirm={confirmToggle}
        onCancel={() => setToggleTarget(null)}
      >
        <strong>{toggleTarget?.name}</strong> ({toggleTarget?.member_code}){" "}
        {toggleTarget?.is_active ? "dondurulacak" : "aktifleştirilecek"}. Emin misiniz?
      </ConfirmModal>
    </PanelLayout>
  );
}
