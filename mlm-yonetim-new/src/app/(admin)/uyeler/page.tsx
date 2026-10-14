"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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
import Pagination from "@/components/tables/Pagination";
import {
  listAdminUsers,
  updateUserStatus,
  listRanks,
  getAdminWallet,
  adminWalletAdjust,
  updateUserRank,
  updateUserRole,
  changeSponsor,
  adjustPVAndCV,
  getMe,
  lookupMember,
  getErrorMessage,
  formatPV,
  type AdminUser,
  type AdminWallet,
  type WalletTransaction,
  type Rank,
} from "@/lib/api";

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  user: "Üye",
  customer: "Müşteri",
  admin: "Yönetici",
  super_admin: "Süper Admin",
};

const ROLE_COLORS: Record<string, "green" | "red" | "amber" | "blue" | "gray" | "purple"> = {
  user: "blue",
  customer: "gray",
  admin: "purple",
  super_admin: "red",
};

const ROLE_FILTERS = [
  { key: "", label: "Tümü" },
  { key: "user", label: "Üye" },
  { key: "customer", label: "Müşteri" },
];

const dateTR = (s?: string | null) =>
  s
    ? new Date(s).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

const dateTimeTR = (s?: string | null) =>
  s ? new Date(s).toLocaleString("tr-TR") : "—";

const tl = (v?: number | null) =>
  (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

export default function UyelerPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [myRole, setMyRole] = useState("");
  const [sel, setSel] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPage(1);
      setQ(search.trim());
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search]);

  const load = useCallback(() => {
    listAdminUsers({
      q: q || undefined,
      role: role || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
      .then((d) => {
        setUsers(d.users);
        setTotal(d.total);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [q, role, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listRanks().then(setRanks).catch(() => {});
    getMe().then((me) => setMyRole(me?.role ?? ""));
  }, []);

  const rankName = (id?: number | null) => {
    if (!id) return "—";
    return ranks.find((r) => r.id === id)?.name ?? `#${id}`;
  };

  const toggleActive = async (u: AdminUser) => {
    setBusy(u.id);
    setError("");
    setNotice("");
    try {
      await updateUserStatus(u.id, !u.is_active, "Panelden durum güncellendi");
      setNotice(`${u.name} ${!u.is_active ? "aktifleştirildi" : "pasife alındı"}.`);
      setSel((s) => (s && s.id === u.id ? { ...s, is_active: !u.is_active } : s));
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (users === null) {
    return <AdminSpinner label="Üyeler yükleniyor…" />;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <AdminHeader
        title="Üyeler"
        subtitle={`Toplam ${total} kayıtlı üye — arama, rol filtresi, cüzdan ve yönetim işlemleri.`}
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <AdminCard
        title="Üye Listesi"
        subtitle={`Sayfa ${page} / ${totalPages}`}
        actions={
          <input
            className={`${inputCls} w-64`}
            placeholder="Ad, e-posta, üye no veya telefon ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setRole(f.key);
                setPage(1);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                role === f.key
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {users.length === 0 ? (
          <AdminEmpty>Kriterlere uyan üye bulunamadı.</AdminEmpty>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className={thCls}>Üye</th>
                    <th className={thCls}>Üye No</th>
                    <th className={thCls}>Telefon</th>
                    <th className={thCls}>Rol</th>
                    <th className={thCls}>Kariyer</th>
                    <th className={thCls}>Sponsor</th>
                    <th className={thCls}>Durum</th>
                    <th className={thCls}>Kayıt</th>
                    <th className={`${thCls} text-right`}>İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className={tdCls}>
                        <button className="text-left" onClick={() => setSel(u)}>
                          <div className="font-medium text-gray-800 dark:text-white/90">{u.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                        </button>
                      </td>
                      <td className={tdCls}>
                        <span className="font-mono text-xs">{u.member_code}</span>
                      </td>
                      <td className={tdCls}>{u.phone || "—"}</td>
                      <td className={tdCls}>
                        <AdminBadge color={ROLE_COLORS[u.role] || "gray"}>
                          {ROLE_LABELS[u.role] || u.role}
                        </AdminBadge>
                      </td>
                      <td className={tdCls}>{rankName(u.current_rank_id)}</td>
                      <td className={tdCls}>
                        <SponsorRef user={u} />
                      </td>
                      <td className={tdCls}>
                        {u.is_active ? (
                          <AdminBadge color="green">Aktif</AdminBadge>
                        ) : (
                          <AdminBadge color="red">Pasif</AdminBadge>
                        )}
                        {u.is_in_pending_pool && (
                          <span className="ml-1">
                            <AdminBadge color="amber">Havuzda</AdminBadge>
                          </span>
                        )}
                      </td>
                      <td className={`${tdCls} whitespace-nowrap text-xs text-gray-500`}>
                        {dateTR(u.created_at)}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <AdminBtn size="xs" variant="outline" onClick={() => setSel(u)}>
                          Detay
                        </AdminBtn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </AdminCard>

      {sel && (
        <MemberDetailModal
          user={sel}
          ranks={ranks}
          myRole={myRole}
          rankName={rankName}
          busy={busy === sel.id}
          onToggleActive={() => toggleActive(sel)}
          onClose={() => setSel(null)}
          onNotify={(m) => setNotice(m)}
          onError={(m) => setError(m)}
          onRefresh={load}
        />
      )}
    </div>
  );
}

// ── Üye detay modalı: Genel / Cüzdan / Yönetim sekmeleri ───────────────────
function MemberDetailModal({
  user,
  ranks,
  myRole,
  rankName,
  busy,
  onToggleActive,
  onClose,
  onNotify,
  onError,
  onRefresh,
}: {
  user: AdminUser;
  ranks: Rank[];
  myRole: string;
  rankName: (id?: number | null) => string;
  busy: boolean;
  onToggleActive: () => void;
  onClose: () => void;
  onNotify: (m: string) => void;
  onError: (m: string) => void;
  onRefresh: () => void;
}) {
  const superAdmin = myRole === "super_admin" || myRole === "admin";
  const [tab, setTab] = useState<"genel" | "cuzdan" | "yonetim">("genel");

  return (
    <AdminModal open title={`${user.name} — Üye Detayı`} onClose={onClose} size="xl">
      <div className="mb-4 flex gap-2 border-b border-gray-100 dark:border-gray-800">
        {(
          [
            ["genel", "Genel"],
            ["cuzdan", "Cüzdan"],
            ["yonetim", "Yönetim İşlemleri"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition ${
              tab === k
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "genel" && (
        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info label="Üye No" value={user.member_code} />
            <Info label="Rol" value={ROLE_LABELS[user.role] || user.role} />
            <Info label="E-posta" value={user.email} />
            <Info label="Telefon" value={user.phone || "—"} />
            <Info label="Kariyer" value={rankName(user.current_rank_id)} />
            <Info label="Sponsor" value={<SponsorRef user={user} />} />
            <Info label="Paket" value={user.package_id ? `#${user.package_id}` : "—"} />
            <Info label="Durum" value={user.is_active ? "Aktif" : "Pasif"} />
            <Info label="Sol PV" value={formatPV(user.total_pv_left)} />
            <Info label="Sağ PV" value={formatPV(user.total_pv_right)} />
            <Info label="Toplam PV" value={formatPV(user.total_pv_accumulated)} />
            <Info label="Toplam CV" value={formatPV(user.total_cv_accumulated)} />
            <Info label="Havuz" value={user.is_in_pending_pool ? "Havuzda" : "—"} />
            <Info label="Kayıt" value={dateTimeTR(user.created_at)} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <AdminBtn variant="outline" onClick={onClose}>
              Kapat
            </AdminBtn>
            <AdminBtn
              variant={user.is_active ? "danger" : "success"}
              disabled={busy}
              onClick={onToggleActive}
            >
              {busy ? "İşleniyor…" : user.is_active ? "Pasife Al" : "Aktifleştir"}
            </AdminBtn>
          </div>
        </div>
      )}

      {tab === "cuzdan" && <WalletPanel user={user} onError={onError} onNotify={onNotify} />}

      {tab === "yonetim" && (
        <ManagementPanel
          user={user}
          ranks={ranks}
          rankName={rankName}
          superAdmin={superAdmin}
          onError={onError}
          onNotify={onNotify}
          onRefresh={onRefresh}
        />
      )}
    </AdminModal>
  );
}

// ── Cüzdan paneli ─────────────────────────────────────────────────────────
function WalletPanel({
  user,
  onError,
  onNotify,
}: {
  user: AdminUser;
  onError: (m: string) => void;
  onNotify: (m: string) => void;
}) {
  const [wallet, setWallet] = useState<AdminWallet | null>(null);
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getAdminWallet(user.id)
      .then((d) => {
        setWallet(d.wallet);
        setTxs(d.transactions);
      })
      .catch((err) => onError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [user.id, onError]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <AdminSpinner label="Cüzdan yükleniyor…" />;
  if (!wallet) return <AdminEmpty>Bu üye için cüzdan kaydı bulunamadı.</AdminEmpty>;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Bakiye" value={tl(wallet.balance)} accent />
        <Stat label="Toplam Kazanç" value={tl(wallet.total_earned)} />
        <Stat label="Toplam Çekilen" value={tl(wallet.total_withdrawn)} />
        <Stat label="Bloke" value={tl(wallet.blocked_balance)} />
        <Stat label="Çip/Token" value={formatPV(wallet.chip_balance)} />
        <Stat label="Güncelleme" value={dateTimeTR(wallet.updated_at)} />
      </div>

      <h4 className="mt-6 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Son Hareketler
      </h4>
      {txs.length === 0 ? (
        <AdminEmpty>Hareket bulunamadı.</AdminEmpty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02]">
              <tr>
                <th className={thCls}>Tarih</th>
                <th className={thCls}>Tür</th>
                <th className={thCls}>Açıklama</th>
                <th className={`${thCls} text-right`}>Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {txs.map((t) => (
                <tr key={t.id}>
                  <td className={`${tdCls} whitespace-nowrap text-xs text-gray-500`}>
                    {dateTimeTR(t.created_at)}
                  </td>
                  <td className={tdCls}>{t.type}</td>
                  <td className={tdCls}>{t.description || "—"}</td>
                  <td
                    className={`${tdCls} text-right font-medium ${
                      Number(t.amount) < 0 ? "text-error-600" : "text-success-600"
                    }`}
                  >
                    {tl(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-400">
        Not: Bakiye düzeltme işlemleri "Yönetim İşlemleri" sekmesindedir (yalnızca yönetici).
      </p>
    </div>
  );
}

// ── Yönetim işlemleri paneli ──────────────────────────────────────────────
function ManagementPanel({
  user,
  ranks,
  rankName,
  superAdmin,
  onError,
  onNotify,
  onRefresh,
}: {
  user: AdminUser;
  ranks: Rank[];
  rankName: (id?: number | null) => string;
  superAdmin: boolean;
  onError: (m: string) => void;
  onNotify: (m: string) => void;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState("");

  // Rütbe
  const [rankId, setRankId] = useState(user.current_rank_id ? String(user.current_rank_id) : "");
  const [rankReason, setRankReason] = useState("");
  // Rol
  const [roleVal, setRoleVal] = useState(user.role);
  // Sponsor
  const [sponsorCode, setSponsorCode] = useState("");
  const [sponsorFound, setSponsorFound] = useState<{ id: number; name: string } | null>(null);
  // PV/CV
  const [pvLeft, setPvLeft] = useState(String(user.total_pv_left ?? 0));
  const [pvRight, setPvRight] = useState(String(user.total_pv_right ?? 0));
  const [cvLeft, setCvLeft] = useState(String(user.total_cv_left ?? 0));
  const [cvRight, setCvRight] = useState(String(user.total_cv_right ?? 0));
  const [pvReason, setPvReason] = useState("");
  // Cüzdan işlemi
  const [wAmount, setWAmount] = useState("");
  const [wAction, setWAction] = useState<"add" | "subtract" | "block" | "unblock">("add");
  const [wReason, setWReason] = useState("");

  const run = async (key: string, fn: () => Promise<void>, okMsg: string) => {
    setBusy(key);
    try {
      await fn();
      onNotify(okMsg);
      onRefresh();
    } catch (err) {
      onError(getErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const doRank = () =>
    run(
      "rank",
      async () => {
        if (!rankId) throw new Error("Kariyer seçin.");
        await updateUserRank(user.id, Number(rankId), rankReason || "Panelden manuel rütbe");
      },
      `${user.name} kariyeri güncellendi.`
    );

  const doRole = () =>
    run(
      "role",
      async () => {
        await updateUserRole(user.id, roleVal, "Panelden rol güncellendi");
      },
      `${user.name} rolü güncellendi.`
    );

  const searchSponsor = async () => {
    setBusy("sponsor-search");
    onError("");
    try {
      const u = await lookupMember(sponsorCode.trim());
      setSponsorFound({ id: u.id, name: u.name });
    } catch (err) {
      setSponsorFound(null);
      onError(getErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const doSponsor = () =>
    run(
      "sponsor",
      async () => {
        if (!sponsorFound) throw new Error("Önce sponsor üyeyi arayın.");
        await changeSponsor(user.id, sponsorFound.id, "Panelden sponsor değişikliği");
      },
      `${user.name} sponsoru güncellendi.`
    );

  const doPV = () =>
    run(
      "pv",
      async () => {
        if (!pvReason.trim()) throw new Error("Gerekçe zorunludur.");
        await adjustPVAndCV(user.id, {
          pv_left: Number(pvLeft),
          pv_right: Number(pvRight),
          cv_left: Number(cvLeft),
          cv_right: Number(cvRight),
          reason: pvReason,
        });
      },
      `${user.name} PV/CV değerleri güncellendi.`
    );

  const doWallet = () =>
    run(
      "wallet",
      async () => {
        const amt = Number(wAmount);
        if (!amt || amt <= 0) throw new Error("Geçerli bir tutar girin.");
        if (!wReason.trim()) throw new Error("Gerekçe zorunludur.");
        await adminWalletAdjust({ user_id: user.id, amount: amt, action: wAction, reason: wReason });
      },
      `${user.name} cüzdanına işlem uygulandı.`
    );

  if (!superAdmin) {
    return (
      <AdminAlert kind="warning">
        Bu işlemler (rütbe, rol, sponsor, PV/CV ve bakiye düzeltme) yalnızca yönetici/süper yönetici
        yetkisine sahiptir. Mevcut rolünüz: <b>{ROLE_LABELS[myRoleLabel(user.role)] || user.role}</b>.
      </AdminAlert>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Rütbe */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Kariyer (Rütbe)</h4>
        <label className={labelCls}>Kariyer — şu an: {rankName(user.current_rank_id)}</label>
        <select className={inputCls} value={rankId} onChange={(e) => setRankId(e.target.value)}>
          <option value="">Seçiniz…</option>
          {ranks.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input
          className={`${inputCls} mt-2`}
          placeholder="Gerekçe (opsiyonel)"
          value={rankReason}
          onChange={(e) => setRankReason(e.target.value)}
        />
        <AdminBtn className="mt-3" size="sm" onClick={doRank} disabled={busy === "rank"}>
          {busy === "rank" ? "Kaydediliyor…" : "Rütbeyi Güncelle"}
        </AdminBtn>
      </section>

      {/* Rol */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Rol</h4>
        <label className={labelCls}>Kullanıcı rolü</label>
        <select className={inputCls} value={roleVal} onChange={(e) => setRoleVal(e.target.value)}>
          <option value="user">Üye</option>
          <option value="customer">Müşteri</option>
          <option value="admin">Yönetici</option>
          <option value="super_admin">Süper Admin</option>
        </select>
        <AdminBtn className="mt-3" size="sm" variant="danger" onClick={doRole} disabled={busy === "role"}>
          {busy === "role" ? "Kaydediliyor…" : "Rolü Güncelle"}
        </AdminBtn>
      </section>

      {/* Sponsor */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Sponsor Değiştir</h4>
        <label className={labelCls}>Yeni sponsor üye kodu</label>
        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="Örn. TR90…"
            value={sponsorCode}
            onChange={(e) => setSponsorCode(e.target.value)}
          />
          <AdminBtn size="sm" variant="outline" onClick={searchSponsor} disabled={busy === "sponsor-search"}>
            {busy === "sponsor-search" ? "Aranıyor…" : "Ara"}
          </AdminBtn>
        </div>
        {sponsorFound && (
          <p className="mt-2 text-xs text-success-600">
            Bulundu: <b>{sponsorFound.name}</b> (#{sponsorFound.id})
          </p>
        )}
        <AdminBtn className="mt-3" size="sm" onClick={doSponsor} disabled={busy === "sponsor" || !sponsorFound}>
          {busy === "sponsor" ? "Kaydediliyor…" : "Sponsoru Değiştir"}
        </AdminBtn>
      </section>

      {/* PV/CV */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">PV / CV Düzeltme</h4>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} type="number" placeholder="Sol PV" value={pvLeft} onChange={(e) => setPvLeft(e.target.value)} />
          <input className={inputCls} type="number" placeholder="Sağ PV" value={pvRight} onChange={(e) => setPvRight(e.target.value)} />
          <input className={inputCls} type="number" placeholder="Sol CV" value={cvLeft} onChange={(e) => setCvLeft(e.target.value)} />
          <input className={inputCls} type="number" placeholder="Sağ CV" value={cvRight} onChange={(e) => setCvRight(e.target.value)} />
        </div>
        <input
          className={`${inputCls} mt-2`}
          placeholder="Gerekçe (zorunlu)"
          value={pvReason}
          onChange={(e) => setPvReason(e.target.value)}
        />
        <AdminBtn className="mt-3" size="sm" variant="danger" onClick={doPV} disabled={busy === "pv"}>
          {busy === "pv" ? "Kaydediliyor…" : "PV/CV Güncelle"}
        </AdminBtn>
      </section>

      {/* Cüzdan işlemi */}
      <section className="rounded-xl border border-gray-200 p-4 lg:col-span-2 dark:border-gray-800">
        <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Cüzdan İşlemi (manuel)</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select className={inputCls} value={wAction} onChange={(e) => setWAction(e.target.value as typeof wAction)}>
            <option value="add">Bakiye Ekle</option>
            <option value="subtract">Bakiye Düş</option>
            <option value="block">Bloke Et</option>
            <option value="unblock">Bloke Çöz</option>
          </select>
          <input className={inputCls} type="number" placeholder="Tutar (₺)" value={wAmount} onChange={(e) => setWAmount(e.target.value)} />
          <input className={inputCls} placeholder="Gerekçe (zorunlu)" value={wReason} onChange={(e) => setWReason(e.target.value)} />
        </div>
        <AdminBtn className="mt-3" size="sm" variant="danger" onClick={doWallet} disabled={busy === "wallet"}>
          {busy === "wallet" ? "Uygulanıyor…" : "Cüzdan İşlemini Uygula"}
        </AdminBtn>
        <p className="mt-2 text-xs text-gray-400">
          Bu işlemler <code>audit_logs</code> tablosuna aktör + gerekçe ile yazılır (Denetim Kayıtları).
        </p>
      </section>
    </div>
  );
}

// Üye rol etiketini güvenli döndürür.
function myRoleLabel(role: string): string {
  return ROLE_LABELS[role] ? role : "user";
}

function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${accent ? "border-brand-200 bg-brand-50/50 dark:border-brand-500/25 dark:bg-brand-500/10" : "border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-white/[0.02]"}`}>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-gray-800 dark:text-white/90">{value}</div>
    </div>
  );
}

// Sponsor TR kodu — üzerine gelince ANINDA isim tooltip'i çıkar.
function SponsorRef({ user }: { user: AdminUser }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement | null>(null);

  if (!user.sponsor_id) return <>—</>;
  const label = user.sponsor_code || `#${user.sponsor_id}`;

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setTip({ x: r.left + r.width / 2, y: r.top });
  };

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={() => setTip(null)}
        className="cursor-help underline decoration-dotted underline-offset-2 decoration-gray-300 dark:decoration-gray-600"
      >
        {label}
      </span>
      {tip && user.sponsor_name && (
        <span
          style={{
            position: "fixed",
            left: tip.x,
            top: Math.max(tip.y - 8, 44),
            transform: "translate(-50%, -100%)",
            zIndex: 2000,
          }}
          className="pointer-events-none whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-700"
        >
          {user.sponsor_name}
        </span>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-gray-800 dark:text-white/90">{value}</div>
    </div>
  );
}
