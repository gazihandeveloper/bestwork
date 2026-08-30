"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import { InfoAlert, ErrorAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import { api, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Tipler (backend JSON şekilleri) ───────────────────────────────────────
// GET /admin/users -> { users, total, limit, offset } (models.User)
interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  member_code: string;
  role: string;
  is_active: boolean;
}

// GET /admin/wallet/:user_id -> { wallet, transactions } (models.Wallet)
interface WalletRow {
  id: number;
  user_id: number;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  chip_balance: number;
  blocked_balance: number;
  updated_at: string;
}

// GET /admin/wallet/:user_id/transactions -> { transactions } (WalletTransaction)
interface WalletTx {
  id: number;
  wallet_id: number;
  amount: number;
  type: string;
  reason: string | null;
  admin_id: number | null;
  created_at: string;
}

// ── Sayfa içinde tanımlı API çağrıları ────────────────────────────────────
const TX_LIMIT = 50;

async function searchUsersApi(q: string): Promise<{ users: AdminUserRow[]; total: number }> {
  const { data } = await api.get<{ users: AdminUserRow[]; total: number }>("/admin/users", {
    params: { q: q.trim(), limit: 20 },
  });
  return { users: data.users ?? [], total: data.total ?? 0 };
}

async function getWalletApi(userId: number): Promise<{ wallet: WalletRow; transactions: WalletTx[] }> {
  const { data } = await api.get<{ wallet: WalletRow; transactions: WalletTx[] }>(`/admin/wallet/${userId}`);
  return data;
}

async function listTransactionsApi(userId: number, limit: number, offset: number): Promise<WalletTx[]> {
  const { data } = await api.get<{ transactions: WalletTx[] }>(`/admin/wallet/${userId}/transactions`, {
    params: { limit, offset },
  });
  return data.transactions ?? [];
}

// POST /admin/wallet/adjust -> { message, wallet }
// Gövde: { user_id, amount, action: add|subtract|block|unblock, reason }
async function adjustWalletApi(body: {
  user_id: number;
  amount: number;
  action: string;
  reason: string;
}): Promise<WalletRow> {
  const { data } = await api.post<{ wallet: WalletRow }>("/admin/wallet/adjust", body);
  return data.wallet;
}

// İç transfer hareketi (GET /admin/wallet/transfers -> { transfers, total })
interface TransferRow {
  id: number;
  user_id: number;
  user_name: string;
  amount: number;
  type: string;
  reason: string | null;
  created_at: string;
}

async function listTransfersApi(limit: number): Promise<{ transfers: TransferRow[]; total: number }> {
  const { data } = await api.get<{ transfers: TransferRow[]; total: number }>("/admin/wallet/transfers", {
    params: { limit },
  });
  return { transfers: data.transfers ?? [], total: data.total ?? 0 };
}

async function transferApi(body: {
  from_user_id: number;
  to_user_id: number;
  amount: number;
  reason: string;
}): Promise<void> {
  await api.post("/admin/wallet/transfer", body);
}

// ── Yardımcılar ───────────────────────────────────────────────────────────
const tl = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
  " TL";

const roleLabel = (r?: string | null) =>
  r === "super_admin" ? "Süper Admin" : r === "admin" ? "Admin" : "Üye";

const ADJUST_ACTIONS = [
  { value: "add", label: "Bakiye Ekle" },
  { value: "subtract", label: "Bakiyeden Düş" },
  { value: "block", label: "Bloke Et" },
  { value: "unblock", label: "Bloke Kaldır" },
];

// Cüzdan hareket türü -> etiket + rozet + tutar yönü
const TX_META: Record<string, { label: string; cls: string; dir: 1 | -1 }> = {
  manual_add: { label: "Manuel Ekleme", cls: "text-bg-success", dir: 1 },
  manual_subtract: { label: "Manuel Düşme", cls: "text-bg-danger", dir: -1 },
  manual_block: { label: "Bloke Ekleme", cls: "text-bg-warning", dir: 1 },
  manual_unblock: { label: "Bloke Kaldırma", cls: "text-bg-info", dir: 1 },
};

const txMeta = (type: string) =>
  TX_META[type] ?? { label: type || "—", cls: "text-bg-secondary", dir: 1 as 1 | -1 };

export default function CuzdanlarPage() {
  // ── Üye arama ──
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searching, setSearching] = useState(false);

  // ── Seçili üyenin cüzdanı ──
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [txs, setTxs] = useState<WalletTx[] | null>(null);
  const [walletError, setWalletError] = useState("");
  const [txLoading, setTxLoading] = useState(false);

  // ── Bakiye düzeltme formu ──
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAction, setAdjustAction] = useState("add");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustBusy, setAdjustBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // ── İç transfer ──
  const [tFrom, setTFrom] = useState("");
  const [tTo, setTTo] = useState("");
  const [tAmount, setTAmount] = useState("");
  const [tReason, setTReason] = useState("");
  const [tBusy, setTBusy] = useState(false);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);

  const loadTransfers = () => {
    listTransfersApi(50)
      .then((d) => setTransfers(d.transfers))
      .catch(() => {});
  };

  const resolveUserId = async (code: string): Promise<number> => {
    const d = await searchUsersApi(code);
    const u = d.users.find((x) => x.member_code === code.trim().toUpperCase()) ?? d.users[0];
    if (!u) throw new Error("Üye bulunamadı: " + code);
    return u.id;
  };

  const doTransfer = async () => {
    if (!tFrom.trim() || !tTo.trim() || !Number(tAmount) || Number(tAmount) <= 0) {
      setError("Gönderen kodu, alıcı kodu ve geçerli bir tutar girin.");
      return;
    }
    setTBusy(true);
    setError("");
    try {
      const fromId = await resolveUserId(tFrom.trim().toUpperCase());
      const toId = await resolveUserId(tTo.trim().toUpperCase());
      await transferApi({ from_user_id: fromId, to_user_id: toId, amount: Number(tAmount), reason: tReason });
      setNotice("Transfer tamamlandı.");
      setTFrom("");
      setTTo("");
      setTAmount("");
      setTReason("");
      loadTransfers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTBusy(false);
    }
  };

  useEffect(loadTransfers, []);

  const doSearch = async () => {
    if (!query.trim()) {
      setError("Arama için üye kodu, ad, e-posta veya telefon girin.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const d = await searchUsersApi(query);
      setUsers(d.users);
      setSearchTotal(d.total);
    } catch (err) {
      setError(getErrorMessage(err));
      setUsers([]);
      setSearchTotal(0);
    } finally {
      setSearching(false);
    }
  };

  const loadWallet = async (user: AdminUserRow) => {
    setSelected(user);
    setWallet(null);
    setTxs(null);
    setWalletError("");
    try {
      const d = await getWalletApi(user.id);
      setWallet(d.wallet);
      setTxs(d.transactions ?? []);
    } catch (err) {
      setWalletError(getErrorMessage(err));
    }
  };

  const loadMoreTxs = async () => {
    if (!selected || !txs) return;
    setTxLoading(true);
    setError("");
    try {
      const more = await listTransactionsApi(selected.id, TX_LIMIT, txs.length);
      setTxs((prev) => {
        const seen = new Set((prev ?? []).map((t) => t.id));
        return [...(prev ?? []), ...more.filter((t) => !seen.has(t.id))];
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTxLoading(false);
    }
  };

  const openAdjust = () => {
    setAdjustAction("add");
    setAdjustAmount("");
    setAdjustReason("");
    setError("");
    setAdjustOpen(true);
  };

  const submitAdjust = async () => {
    if (!selected) return;
    const amount = Number(adjustAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Tutar 0'dan büyük bir sayı olmalıdır.");
      return;
    }
    if (!adjustReason.trim()) {
      setError("İşlem gerekçesi zorunludur.");
      return;
    }
    setAdjustBusy(true);
    setError("");
    try {
      await adjustWalletApi({
        user_id: selected.id,
        amount,
        action: adjustAction,
        reason: adjustReason.trim(),
      });
      setAdjustOpen(false);
      setNotice("Bakiye işlemi tamamlandı — cüzdan güncellendi.");
      await loadWallet(selected);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAdjustBusy(false);
    }
  };

  const clearSelection = () => {
    setSelected(null);
    setWallet(null);
    setTxs(null);
    setWalletError("");
  };

  return (
    <PanelLayout>
      <PageHeader
        title="Cüzdanlar"
        subtitle="Üye cüzdanlarını görüntüleyin; bakiye ve bloke düzeltmelerini yönetin (süper admin)."
        breadcrumb={[{ text: "Genel Bakış", href: "/" }, { text: "Cüzdanlar" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* ── 1) Üye Arama ── */}
      <PageCard
        title="Üye Ara"
        subtitle="Üye kodu, ad, e-posta veya telefon ile arayın; sonucu seçerek cüzdanına gidin."
        className="mb-3"
      >
        <form
          className="d-flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void doSearch();
          }}
        >
          <input
            className="form-control"
            placeholder="Üye kodu / ad / e-posta / telefon"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={searching}>
            {searching ? (
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
            ) : (
              <MaterialIcon name="Search" size={15} className="me-1" />
            )}
            Ara
          </button>
        </form>

        {users !== null && (
          <div className="mt-3">
            <div className="text-muted small mb-2">{searchTotal} üye bulundu.</div>
            {users.length === 0 ? (
              <InfoAlert>Aranan kriterde üye bulunamadı.</InfoAlert>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Üye Kodu</th>
                      <th>Ad Soyad</th>
                      <th>E-posta</th>
                      <th>Rol</th>
                      <th>Durum</th>
                      <th className="text-end">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={cn(selected?.id === u.id && "table-active")}>
                        <td className="fw-semibold">{u.id}</td>
                        <td>
                          <span className="badge text-bg-light border">{u.member_code}</span>
                        </td>
                        <td>{u.name}</td>
                        <td className="text-muted small">{u.email}</td>
                        <td>
                          <span
                            className={cn(
                              "badge",
                              u.role === "super_admin"
                                ? "text-bg-danger"
                                : u.role === "admin"
                                  ? "text-bg-warning"
                                  : "text-bg-secondary"
                            )}
                          >
                            {roleLabel(u.role)}
                          </span>
                        </td>
                        <td>
                          <span className={cn("badge", u.is_active ? "text-bg-success" : "text-bg-secondary")}>
                            {u.is_active ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => void loadWallet(u)}>
                            <MaterialIcon name="Wallet" size={13} className="me-1" />
                            Cüzdanı Gör
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </PageCard>

      {/* ── 1b) Bakiye Transferi ── */}
      <PageCard title="Bakiye Transferi" subtitle="İki üye arasında bakiye transferi (süper admin)." className="mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label">Gönderen Üye Kodu</label>
            <input className="form-control" placeholder="TR…" value={tFrom} onChange={(e) => setTFrom(e.target.value)} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Alıcı Üye Kodu</label>
            <input className="form-control" placeholder="TR…" value={tTo} onChange={(e) => setTTo(e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label">Tutar (₺)</label>
            <input type="number" min={0} step="0.01" className="form-control" value={tAmount} onChange={(e) => setTAmount(e.target.value)} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Gerekçe</label>
            <input className="form-control" placeholder="Opsiyonel" value={tReason} onChange={(e) => setTReason(e.target.value)} />
          </div>
          <div className="col-md-1">
            <button className="btn btn-primary w-100" onClick={() => void doTransfer()} disabled={tBusy}>
              {tBusy ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Gönder"}
            </button>
          </div>
        </div>

        {transfers.length > 0 && (
          <div className="table-responsive mt-3">
            <table className="table table-sm table-hover mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Üye</th>
                  <th>Tutar</th>
                  <th>Tür</th>
                  <th>Gerekçe</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td className="fw-semibold">{t.user_name}</td>
                    <td className={t.amount < 0 ? "text-danger fw-semibold" : "text-success fw-semibold"}>
                      {t.amount < 0 ? "-" : "+"}{tl(Math.abs(t.amount))}
                    </td>
                    <td><span className="badge text-bg-light border">{t.type === "transfer_in" ? "Gelen" : "Giden"}</span></td>
                    <td className="text-muted">{t.reason ?? "—"}</td>
                    <td className="text-muted small">{t.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* ── 2) Seçili Üyenin Cüzdanı ── */}
      {selected && (
        <PageCard
          title={`Cüzdan — ${selected.name}`}
          subtitle={`Üye #${selected.id} · ${selected.member_code}`}
          className="mb-3"
          actions={
            <>
              <button className="btn btn-sm btn-outline-secondary" onClick={clearSelection}>
                <MaterialIcon name="ArrowLeft" size={13} className="me-1" />
                Başka Üye
              </button>
              {wallet && (
                <button className="btn btn-sm btn-primary" onClick={openAdjust}>
                  <MaterialIcon name="Tune" size={13} className="me-1" />
                  Bakiye İşlemi
                </button>
              )}
            </>
          }
        >
          {walletError ? (
            <ErrorAlert>{walletError}</ErrorAlert>
          ) : !wallet ? (
            <Loading text="Cüzdan yükleniyor…" />
          ) : (
            <>
              <div className="row g-3 mb-3">
                <div className="col-sm-6 col-lg">
                  <div className="small-box text-bg-success">
                    <div className="inner">
                      <h3>{tl(wallet.balance)}</h3>
                      <p>Kullanılabilir Bakiye</p>
                    </div>
                    <span className="small-box-icon" aria-hidden="true">
                      <MaterialIcon name="Wallet" size={60} />
                    </span>
                  </div>
                </div>
                <div className="col-sm-6 col-lg">
                  <div className="small-box text-bg-info">
                    <div className="inner">
                      <h3>{tl(wallet.total_earned)}</h3>
                      <p>Toplam Kazanç</p>
                    </div>
                    <span className="small-box-icon" aria-hidden="true">
                      <MaterialIcon name="TrendingUp" size={60} />
                    </span>
                  </div>
                </div>
                <div className="col-sm-6 col-lg">
                  <div className="small-box text-bg-warning">
                    <div className="inner">
                      <h3>{tl(wallet.total_withdrawn)}</h3>
                      <p>Çekilen Tutar</p>
                    </div>
                    <span className="small-box-icon" aria-hidden="true">
                      <MaterialIcon name="ArrowUpRight" size={60} />
                    </span>
                  </div>
                </div>
                <div className="col-sm-6 col-lg">
                  <div className="small-box text-bg-primary">
                    <div className="inner">
                      <h3>{tl(wallet.chip_balance)}</h3>
                      <p>Chip Bakiyesi</p>
                    </div>
                    <span className="small-box-icon" aria-hidden="true">
                      <MaterialIcon name="Coins" size={60} />
                    </span>
                  </div>
                </div>
                <div className="col-sm-6 col-lg">
                  <div className="small-box text-bg-danger">
                    <div className="inner">
                      <h3>{tl(wallet.blocked_balance)}</h3>
                      <p>Bloke Bakiye</p>
                    </div>
                    <span className="small-box-icon" aria-hidden="true">
                      <MaterialIcon name="Lock" size={60} />
                    </span>
                  </div>
                </div>
              </div>

              <h6 className="fw-semibold">
                <MaterialIcon name="History" size={16} className="me-1 text-primary" />
                Cüzdan Hareketleri
              </h6>
              {txs === null ? (
                <Loading text="Hareketler yükleniyor…" />
              ) : txs.length === 0 ? (
                <InfoAlert>Bu cüzdanda henüz hareket kaydı yok.</InfoAlert>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Tarih</th>
                          <th>İşlem Türü</th>
                          <th className="text-end">Tutar</th>
                          <th>Gerekçe</th>
                          <th>Admin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txs.map((t) => {
                          const m = txMeta(t.type);
                          return (
                            <tr key={t.id}>
                              <td className="text-muted small">{t.id}</td>
                              <td className="text-muted small">{new Date(t.created_at).toLocaleString("tr-TR")}</td>
                              <td>
                                <span className={cn("badge", m.cls)}>{m.label}</span>
                              </td>
                              <td className={cn("text-end fw-semibold", m.dir < 0 ? "text-danger" : "text-success")}>
                                {m.dir < 0 ? "−" : "+"}
                                {tl(t.amount)}
                              </td>
                              <td className="text-muted small">{t.reason || "—"}</td>
                              <td className="text-muted small">{t.admin_id ? `#${t.admin_id}` : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {txs.length % TX_LIMIT === 0 && txs.length > 0 && (
                    <div className="text-center mt-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        disabled={txLoading}
                        onClick={() => void loadMoreTxs()}
                      >
                        {txLoading ? (
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                        ) : (
                          <MaterialIcon name="ChevronDown" size={14} className="me-1" />
                        )}
                        Daha Fazla Yükle
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </PageCard>
      )}

      {/* ── 3) Bakiye Düzeltme Modalı ── */}
      <ConfirmModal
        open={adjustOpen}
        title="Bakiye İşlemi"
        confirmText="Uygula"
        busy={adjustBusy}
        onConfirm={() => void submitAdjust()}
        onCancel={() => setAdjustOpen(false)}
      >
        <div className="mb-3">
          <label className="form-label">İşlem Türü *</label>
          <select className="form-select" value={adjustAction} onChange={(e) => setAdjustAction(e.target.value)}>
            {ADJUST_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Tutar (₺) *</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="form-control"
            placeholder="0.00"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Gerekçe *</label>
          <input
            className="form-control"
            placeholder="Örn. Sehven eksik bakiye düzeltmesi"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
          />
        </div>
        <div className="alert alert-warning py-2 small mb-0">
          Bu işlem denetim (audit) loguna yazılır ve yalnızca süper admin yetkisiyle çalışır. Düşme/bloke işlemlerinde
          yetersiz bakiye durumunda istek reddedilir.
        </div>
      </ConfirmModal>
    </PanelLayout>
  );
}
