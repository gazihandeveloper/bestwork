"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import { api, getErrorMessage, type AdminUser } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Backend JSON şekilleri ───────────────────────────────────────────────
// GET /admin/pending-pool -> { pending_users: PendingPoolEntry[] }
// POST /admin/pending-pool/place -> { user_id, sponsor_id, position } -> { message }

// models.User JSON'u (password_hash hiçbir zaman dönmez)
interface PendingUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  member_code: string;
  role: string;
  sponsor_id: number | null;
  parent_id: number | null;
  position: string | null;
  package_id: number | null;
  is_active: boolean;
  is_in_pending_pool: boolean;
  pending_since: string | null;
  current_rank_id: number | null;
  total_pv_left: number;
  total_pv_right: number;
  total_cv_left: number;
  total_cv_right: number;
  total_pv_accumulated: number;
  total_cv_accumulated: number;
  current_month_binary_earned: number;
  created_at: string;
  updated_at: string;
}

interface PendingPoolEntry {
  user: PendingUser;
  sponsor_id: number | null;
  sponsor_name: string | null;
  sponsor_member_code: string | null;
}

// ── Sayfa içinde tanımlı API çağrıları ───────────────────────────────────
async function listPendingPool(): Promise<PendingPoolEntry[]> {
  const { data } = await api.get<{ pending_users: PendingPoolEntry[] }>("/admin/pending-pool");
  return data.pending_users ?? [];
}

async function placePendingUser(userId: number, sponsorId: number, position: "L" | "R"): Promise<void> {
  await api.post("/admin/pending-pool/place", { user_id: userId, sponsor_id: sponsorId, position });
}

async function searchUsers(q: string): Promise<AdminUser[]> {
  const { data } = await api.get<{ users: AdminUser[] }>("/admin/users", { params: { q, limit: 10 } });
  return data.users ?? [];
}

// ── Yardımcılar ──────────────────────────────────────────────────────────
const dt = (v?: string | null) => (v ? new Date(v).toLocaleDateString("tr-TR") : "—");

const userLabel = (u: PendingUser) => `${u.name} (${u.member_code || `#${u.id}`})`;

const sponsorLabel = (e: PendingPoolEntry) =>
  e.sponsor_id
    ? `${e.sponsor_name || `Üye ${e.sponsor_id}`} (${e.sponsor_member_code || `#${e.sponsor_id}`})`
    : "—";

// ── Sayfa ────────────────────────────────────────────────────────────────
export default function BekleyenlerPage() {
  const [entries, setEntries] = useState<PendingPoolEntry[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchQ, setSearchQ] = useState("");

  // Yerleştirme modalı
  const [placeTarget, setPlaceTarget] = useState<PendingPoolEntry | null>(null);
  const [placeBusy, setPlaceBusy] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [position, setPosition] = useState<"L" | "R">("L");
  const [sponsorQ, setSponsorQ] = useState("");
  const [sponsorResults, setSponsorResults] = useState<AdminUser[] | null>(null);
  const [sponsorSelected, setSponsorSelected] = useState<{ user_id: number; label: string } | null>(null);
  const sponsorRef = useRef<HTMLDivElement | null>(null);
  const sponsorTimer = useRef<number | null>(null);

  const load = () => {
    setError("");
    listPendingPool()
      .then(setEntries)
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, []);

  // Sponsor arama sonucu dışına tıklayınca kapanır
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sponsorRef.current && !sponsorRef.current.contains(target)) setSponsorResults(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = searchQ.trim().toLocaleLowerCase("tr-TR");
    if (!q) return entries;
    return entries.filter((e) => {
      const u = e.user;
      return (
        u.name.toLocaleLowerCase("tr-TR").includes(q) ||
        (u.member_code || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (u.email || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (u.phone || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (e.sponsor_name || "").toLocaleLowerCase("tr-TR").includes(q) ||
        (e.sponsor_member_code || "").toLocaleLowerCase("tr-TR").includes(q)
      );
    });
  }, [entries, searchQ]);

  const openPlace = (entry: PendingPoolEntry) => {
    setPlaceTarget(entry);
    setPosition("L");
    setPlaceError("");
    setSponsorQ("");
    setSponsorResults(null);
    setSponsorSelected(
      entry.sponsor_id
        ? { user_id: entry.sponsor_id, label: sponsorLabel(entry) }
        : null
    );
  };

  const runSponsorSearch = (q: string) => {
    setSponsorQ(q);
    if (sponsorTimer.current !== null) window.clearTimeout(sponsorTimer.current);
    sponsorTimer.current = null;
    const trimmed = q.trim();
    if (!trimmed) {
      setSponsorResults(null);
      return;
    }
    sponsorTimer.current = window.setTimeout(() => {
      searchUsers(trimmed)
        .then(setSponsorResults)
        .catch(() => setSponsorResults(null));
    }, 300);
  };

  const confirmPlace = async () => {
    if (!placeTarget) return;
    if (!sponsorSelected) {
      setPlaceError("Yerleştirme için sponsor seçilmelidir.");
      return;
    }
    setPlaceBusy(true);
    setPlaceError("");
    try {
      await placePendingUser(placeTarget.user.id, sponsorSelected.user_id, position);
      setNotice(`${userLabel(placeTarget.user)} üyesi ağaca yerleştirildi.`);
      setPlaceTarget(null);
      load();
    } catch (err) {
      setPlaceError(getErrorMessage(err));
    } finally {
      setPlaceBusy(false);
    }
  };

  if (entries === null && !error) return <PanelLayout><Loading /></PanelLayout>;

  return (
    <PanelLayout>
      <PageHeader
        title="Bekleyenler"
        subtitle="Bekleyenler havuzundaki üyeleri sponsor seçerek binary ağaca yerleştirin."
        breadcrumb={[{ text: "Genel Bakış", href: "/" }, { text: "Bekleyenler" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <PageCard
        title="Bekleyen Havuz"
        subtitle="Havuzda bekleyen üyeler — yerleştirilene kadar sponsor ağacına dahil olmazlar."
        actions={
          <>
            <span className="badge text-bg-warning">{entries?.length ?? 0} bekliyor</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={load} title="Yenile">
              <MaterialIcon name="RefreshCw" size={13} />
            </button>
          </>
        }
      >
        <div className="mb-3">
          <input
            className="form-control"
            style={{ maxWidth: 420 }}
            placeholder="Üye veya sponsor ara… (ad / kod / e-posta / telefon)"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </div>

        {entries === null ? (
          <Loading text="Bekleyenler yükleniyor…" />
        ) : entries.length === 0 ? (
          <InfoAlert>Havuzda bekleyen üye yok.</InfoAlert>
        ) : filtered.length === 0 ? (
          <InfoAlert>Arama kriterine uyan bekleyen üye yok.</InfoAlert>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Üye</th>
                  <th>Sponsor</th>
                  <th>E-posta</th>
                  <th>Telefon</th>
                  <th>Kayıt</th>
                  <th>PV</th>
                  <th>Durum</th>
                  <th className="text-end">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.user.id}>
                    <td className="fw-semibold">
                      {e.user.name || `Üye ${e.user.id}`}
                      <div className="text-muted small fw-normal">{e.user.member_code || `#${e.user.id}`}</div>
                    </td>
                    <td className="text-muted small">{sponsorLabel(e)}</td>
                    <td className="text-muted small">{e.user.email || "—"}</td>
                    <td className="text-muted small">{e.user.phone || "—"}</td>
                    <td className="text-muted small">{dt(e.user.created_at)}</td>
                    <td><span className="badge text-bg-light border">{e.user.total_pv_accumulated}</span></td>
                    <td>
                      {e.user.is_active ? (
                        <span className="badge text-bg-success">Aktif</span>
                      ) : (
                        <span className="badge text-bg-secondary">Pasif</span>
                      )}
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-primary" onClick={() => openPlace(e)}>
                        <MaterialIcon name="UserPlus" size={13} className="me-1" />
                        Yerleştir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* ── Yerleştirme modalı ── */}
      <ConfirmModal
        open={placeTarget !== null}
        title="Bekleyen Üyeyi Yerleştir"
        confirmText="Yerleştir"
        tone="success"
        busy={placeBusy}
        onConfirm={() => void confirmPlace()}
        onCancel={() => setPlaceTarget(null)}
      >
        {placeTarget && (
          <div className="mb-3">
            <label className="form-label">Yerleştirilecek Üye</label>
            <div className="form-control bg-light">{userLabel(placeTarget.user)}</div>
          </div>
        )}

        <div className="mb-3" ref={sponsorRef}>
          <label className="form-label">Sponsor (Üyenin Altına Yerleşeceği Kişi)</label>
          {sponsorSelected ? (
            <div className="d-flex align-items-center gap-2">
              <div className="form-control bg-light flex-grow-1">{sponsorSelected.label}</div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setSponsorSelected(null);
                  setSponsorResults(null);
                }}
              >
                <MaterialIcon name="X" size={13} /> Değiştir
              </button>
            </div>
          ) : (
            <div className="position-relative">
              <input
                className="form-control"
                placeholder="Sponsor üye ara… (ad / kod / ID)"
                value={sponsorQ}
                onChange={(e) => runSponsorSearch(e.target.value)}
              />
              {sponsorResults !== null && (
                <div className="list-group position-absolute w-100 shadow" style={{ zIndex: 1060, maxHeight: 260, overflowY: "auto" }}>
                  {sponsorResults.length === 0 && (
                    <div className="list-group-item text-muted small">Sonuç bulunamadı.</div>
                  )}
                  {sponsorResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="list-group-item list-group-item-action py-2 d-flex justify-content-between align-items-center"
                      onClick={() => {
                        setSponsorSelected({ user_id: u.id, label: `${u.name} (${u.member_code})` });
                        setSponsorResults(null);
                        setSponsorQ("");
                      }}
                    >
                      <span>
                        <span className="fw-semibold">{u.name}</span>{" "}
                        <span className="text-muted small">{u.member_code}</span>
                      </span>
                      <MaterialIcon name="ChevronRight" size={15} />
                    </button>
                  ))}
                  {/^\d+$/.test(sponsorQ.trim()) && (
                    <button
                      type="button"
                      className="list-group-item list-group-item-action py-2"
                      onClick={() => {
                        const id = Number(sponsorQ.trim());
                        setSponsorSelected({ user_id: id, label: `Üye #${id}` });
                        setSponsorResults(null);
                        setSponsorQ("");
                      }}
                    >
                      <MaterialIcon name="Search" size={13} className="me-1" />
                      <span className="fw-semibold">Üye #{sponsorQ.trim()}</span>
                      <span className="text-muted small"> — ID ile seç</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {!sponsorSelected && placeTarget?.sponsor_id && (
            <div className="form-text d-flex align-items-center gap-2 mt-1">
              <span>Varsayılan sponsor: {sponsorLabel(placeTarget)}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() =>
                  setSponsorSelected(
                    placeTarget.sponsor_id
                      ? { user_id: placeTarget.sponsor_id, label: sponsorLabel(placeTarget) }
                      : null
                  )
                }
              >
                Kullan
              </button>
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label d-block">Pozisyon (Binary Bacak)</label>
          <div className="d-flex gap-2">
            <button
              type="button"
              className={cn("btn btn-sm", position === "L" ? "btn-primary" : "btn-outline-secondary")}
              onClick={() => setPosition("L")}
            >
              <MaterialIcon name="ArrowLeft" size={13} className="me-1" /> Sol (L)
            </button>
            <button
              type="button"
              className={cn("btn btn-sm", position === "R" ? "btn-success" : "btn-outline-secondary")}
              onClick={() => setPosition("R")}
            >
              Sağ (R) <MaterialIcon name="ArrowRight" size={13} className="ms-1" />
            </button>
          </div>
        </div>

        {placeError && <div className="alert alert-danger py-2 mb-0">{placeError}</div>}

        <div className="alert alert-warning mt-3 mb-0 py-2 small">
          Seçilen bacak doluysa işlem reddedilir. Üye önce alışveriş yapmadıysa yerleştirme
          yapılamaz.
        </div>
      </ConfirmModal>
    </PanelLayout>
  );
}
