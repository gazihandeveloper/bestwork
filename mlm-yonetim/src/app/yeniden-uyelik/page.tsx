"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import { searchUsers, respawnUser, getErrorMessage, type UserSearchResult } from "@/lib/api";

export default function YenidenUyelikPage() {
  // Eski üye
  const [memberQ, setMemberQ] = useState("");
  const [memberResults, setMemberResults] = useState<UserSearchResult[] | null>(null);
  const [memberBusy, setMemberBusy] = useState(false);
  const [oldMember, setOldMember] = useState<UserSearchResult | null>(null);

  // Yeni sponsor
  const [sponsorQ, setSponsorQ] = useState("");
  const [sponsorResults, setSponsorResults] = useState<UserSearchResult[] | null>(null);
  const [sponsorBusy, setSponsorBusy] = useState(false);
  const [newSponsor, setNewSponsor] = useState<UserSearchResult | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const searchMember = async () => {
    if (!memberQ.trim()) return;
    setMemberBusy(true);
    setError("");
    try {
      const users = await searchUsers(memberQ.trim());
      setMemberResults(users);
      setOldMember(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setMemberBusy(false);
    }
  };

  const searchSponsor = async () => {
    if (!sponsorQ.trim()) return;
    setSponsorBusy(true);
    setError("");
    try {
      const users = await searchUsers(sponsorQ.trim());
      setSponsorResults(users);
      setNewSponsor(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSponsorBusy(false);
    }
  };

  const doRespawn = async () => {
    if (!oldMember || !newSponsor) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await respawnUser(oldMember.id, newSponsor.id);
      setNotice(
        `Yeniden üyelik tamamlandı: ${oldMember.name} (${oldMember.member_code}) askıya alındı, yeni sponsor ${newSponsor.name} (${newSponsor.member_code}).`
      );
      setConfirmOpen(false);
      setOldMember(null);
      setNewSponsor(null);
      setMemberResults(null);
      setSponsorResults(null);
      setMemberQ("");
      setSponsorQ("");
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("tr-TR") : "—");

  const memberRow = (u: UserSearchResult, selected: boolean, onSelect: () => void) => (
    <button
      key={u.id}
      type="button"
      onClick={onSelect}
      className={
        "list-group-item list-group-item-action d-flex justify-content-between align-items-center " +
        (selected ? "active" : "")
      }
    >
      <span>
        <strong>{u.name}</strong>{" "}
        <span className="text-muted small">
          {u.member_code} · {u.email}
        </span>
      </span>
      <span className={"badge " + (u.is_active ? "text-bg-success" : "text-bg-secondary")}>
        {u.is_active ? "Aktif" : "Pasif"}
      </span>
    </button>
  );

  return (
    <PanelLayout>
      <PageHeader
        title="Yeniden Üyelik"
        subtitle="1 yıldır ürün almamış ve yeni üye kaydetmemiş üyeyi askıya alıp, yeni sponsorla sıfırdan üyelik açın."
        breadcrumb={[{ text: "Genel Bakış", href: "/" }, { text: "Yeniden Üyelik" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row">
        {/* Eski üye */}
        <div className="col-12 col-lg-6 mb-3">
          <PageCard title="1) Eski Üye" subtitle="Yeniden üyelik yapılacak üyeyi arayıp seçin.">
            <div className="d-flex gap-2">
              <input
                className="form-control"
                placeholder="Ad, e-posta veya üye no"
                value={memberQ}
                onChange={(e) => setMemberQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchMember()}
              />
              <button className="btn btn-outline-primary" onClick={searchMember} disabled={memberBusy}>
                {memberBusy ? <span className="spinner-border spinner-border-sm" role="status" /> : <MaterialIcon name="Search" size={16} />}
              </button>
            </div>

            {memberResults !== null && (
              <div className="mt-3">
                {memberResults.length === 0 ? (
                  <InfoAlert>Sonuç bulunamadı.</InfoAlert>
                ) : (
                  <div className="list-group">
                    {memberResults.map((u) => memberRow(u, oldMember?.id === u.id, () => setOldMember(u)))}
                  </div>
                )}
              </div>
            )}

            {oldMember && (
              <div className="alert alert-info mt-3 mb-0 py-2">
                <strong>Seçilen üye:</strong> {oldMember.name} ({oldMember.member_code}) — Kayıt: {fmtDate(oldMember.created_at)}
              </div>
            )}
          </PageCard>
        </div>

        {/* Yeni sponsor */}
        <div className="col-12 col-lg-6 mb-3">
          <PageCard title="2) Yeni Sponsor" subtitle="Üyenin bağlanacağı yeni sponsoru arayıp seçin.">
            <div className="d-flex gap-2">
              <input
                className="form-control"
                placeholder="Ad, e-posta veya üye no"
                value={sponsorQ}
                onChange={(e) => setSponsorQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchSponsor()}
              />
              <button className="btn btn-outline-primary" onClick={searchSponsor} disabled={sponsorBusy}>
                {sponsorBusy ? <span className="spinner-border spinner-border-sm" role="status" /> : <MaterialIcon name="Search" size={16} />}
              </button>
            </div>

            {sponsorResults !== null && (
              <div className="mt-3">
                {sponsorResults.length === 0 ? (
                  <InfoAlert>Sonuç bulunamadı.</InfoAlert>
                ) : (
                  <div className="list-group">
                    {sponsorResults.map((u) => memberRow(u, newSponsor?.id === u.id, () => setNewSponsor(u)))}
                  </div>
                )}
              </div>
            )}

            {newSponsor && (
              <div className="alert alert-success mt-3 mb-0 py-2">
                <strong>Seçilen sponsor:</strong> {newSponsor.name} ({newSponsor.member_code})
              </div>
            )}
          </PageCard>
        </div>
      </div>

      <PageCard title="İşlem" subtitle="Şart: son 1 yıl içinde alışveriş yapmamış ve yeni üye kaydetmemiş olmalı.">
        <InfoAlert>
          Eski üyelik <strong>askıya alınır</strong> (pasife çekilir); kişi aynı ad/e-posta/telefon ve şifresiyle, seçilen
          yeni sponsor altında <strong>sıfırdan</strong> yeni üyelik açar (PV/CV/rütbe/paket sıfırlanır).
        </InfoAlert>
        <button
          className="btn btn-warning mt-3"
          disabled={!oldMember || !newSponsor || busy}
          onClick={() => setConfirmOpen(true)}
        >
          {busy ? (
            <span className="spinner-border spinner-border-sm me-1" role="status" />
          ) : (
            <MaterialIcon name="Replay" size={15} className="me-1" />
          )}
          Yeniden Üyelik Yap
        </button>
      </PageCard>

      <ConfirmModal
        open={confirmOpen}
        title="Yeniden Üyelik Onayı"
        tone="warning"
        confirmText="Onayla"
        busy={busy}
        onConfirm={doRespawn}
        onCancel={() => setConfirmOpen(false)}
      >
        <p className="mb-1">
          <strong>{oldMember?.name}</strong> ({oldMember?.member_code}) askıya alınacak ve{" "}
          <strong>{newSponsor?.name}</strong> ({newSponsor?.member_code}) sponsorluğunda sıfırdan yeni üyelik açılacak.
        </p>
        <p className="mb-0 text-muted small">Bu işlem geri alınamaz. Emin misiniz?</p>
      </ConfirmModal>
    </PanelLayout>
  );
}
