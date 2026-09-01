"use client";

import { useEffect, useState } from "react";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import { MaterialIcon } from "@/components/MaterialIcon";
import { api, getErrorMessage, searchUsers, type UserSearchResult } from "@/lib/api";
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

  // Sponsor değiştirme modalı
  const [sponsorTarget, setSponsorTarget] = useState<AdminUser | null>(null);
  const [sponsorQ, setSponsorQ] = useState("");
  const [sponsorResults, setSponsorResults] = useState<UserSearchResult[] | null>(null);
  const [sponsorBusy, setSponsorBusy] = useState(false);
  const [newSponsor, setNewSponsor] = useState<UserSearchResult | null>(null);

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

  const openSponsor = (u: AdminUser) => {
    setSponsorTarget(u);
    setSponsorQ("");
    setSponsorResults(null);
    setNewSponsor(null);
    setError("");
  };

  const searchSponsor = async () => {
    if (!sponsorQ.trim()) return;
    setSponsorBusy(true);
    try {
      setSponsorResults(await searchUsers(sponsorQ.trim()));
      setNewSponsor(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSponsorBusy(false);
    }
  };

  const confirmSponsor = async () => {
    if (!sponsorTarget || !newSponsor) return;
    setBusyId(sponsorTarget.id);
    try {
      await api.put(`/admin/users/${sponsorTarget.id}/sponsor`, { new_sponsor_id: newSponsor.id });
      setNotice(`${sponsorTarget.name} sponsor değiştirildi: ${newSponsor.name} (${newSponsor.member_code}).`);
      setSponsorTarget(null);
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
      <PageHeader title="Üyeler" subtitle="Üyeleri arayın, dondurun, rol/sponsor değiştirin." />

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
                        className="btn btn-sm btn-outline-primary me-1"
                        disabled={busyId === u.id || u.role === "super_admin"}
                        onClick={() => openSponsor(u)}
                        title="Sponsor değiştir"
                      >
                        Sponsor
                      </button>
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

      {/* Sponsor değiştirme modalı */}
      {sponsorTarget && (
        <div className="modal d-block" tabIndex={-1} role="dialog" style={{ background: "rgba(0,0,0,.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Sponsor Değiştir</h5>
                <button type="button" className="btn-close" aria-label="Kapat" onClick={() => setSponsorTarget(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Üye: <strong>{sponsorTarget.name}</strong> ({sponsorTarget.member_code})
                </p>
                <div className="input-group mb-2">
                  <input
                    className="form-control"
                    placeholder="Yeni sponsor: ad, e-posta veya üye no ara"
                    value={sponsorQ}
                    onChange={(e) => setSponsorQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchSponsor())}
                  />
                  <button className="btn btn-outline-primary" onClick={searchSponsor} disabled={sponsorBusy}>
                    {sponsorBusy ? <span className="spinner-border spinner-border-sm" role="status" /> : <MaterialIcon name="Search" size={16} />}
                  </button>
                </div>

                {sponsorResults !== null && (
                  <div className="list-group" style={{ maxHeight: 260, overflowY: "auto" }}>
                    {sponsorResults.length === 0 ? (
                      <div className="list-group-item text-muted small">Sonuç bulunamadı.</div>
                    ) : (
                      sponsorResults.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={"list-group-item list-group-item-action d-flex justify-content-between " + (newSponsor?.id === s.id ? "active" : "")}
                          onClick={() => setNewSponsor(s)}
                        >
                          <span>
                            <strong>{s.name}</strong>{" "}
                            <span className="text-muted small">{s.member_code}</span>
                          </span>
                          {s.id === sponsorTarget.id && <span className="badge text-bg-warning">Kendisi</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setSponsorTarget(null)}>Vazgeç</button>
                <button className="btn btn-warning" disabled={!newSponsor || newSponsor.id === sponsorTarget.id || busyId === sponsorTarget.id} onClick={confirmSponsor}>
                  {busyId === sponsorTarget.id ? (
                    <span className="spinner-border spinner-border-sm me-1" role="status" />
                  ) : (
                    <MaterialIcon name="swap_horiz" size={15} className="me-1" />
                  )}
                  Değiştir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
