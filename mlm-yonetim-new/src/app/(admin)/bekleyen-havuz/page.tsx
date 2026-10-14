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
  listPendingPool,
  placePendingUser,
  lookupMember,
  getErrorMessage,
  type PendingUser,
} from "@/lib/api";

export default function BekleyenHavuzPage() {
  const [users, setUsers] = useState<PendingUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Yerleştirme Modalı Durumu
  const [selUser, setSelUser] = useState<PendingUser | null>(null);
  const [sponsorCode, setSponsorCode] = useState("");
  const [foundSponsor, setFoundSponsor] = useState<{ id: number; name: string; member_code: string } | null>(null);
  const [searchingSponsor, setSearchingSponsor] = useState(false);
  const [position, setPosition] = useState<"left" | "right" | "">("");
  const [placing, setPlacing] = useState(false);
  const [modalError, setModalError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await listPendingPool();
      setUsers(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLookup = async () => {
    const code = sponsorCode.trim();
    if (!code) {
      setModalError("Sponsor kodu giriniz.");
      return;
    }
    setSearchingSponsor(true);
    setModalError("");
    try {
      const sponsor = await lookupMember(code);
      setFoundSponsor(sponsor);
    } catch (err) {
      setFoundSponsor(null);
      setModalError(getErrorMessage(err));
    } finally {
      setSearchingSponsor(false);
    }
  };

  const handlePlace = async () => {
    if (!selUser) return;
    if (!foundSponsor) {
      setModalError("Lütfen geçerli bir sponsor bulunuz.");
      return;
    }
    if (!position) {
      setModalError("Lütfen bir konum (Sol/Sağ) seçiniz.");
      return;
    }

    setPlacing(true);
    setModalError("");
    try {
      await placePendingUser({
        user_id: selUser.user_id,
        sponsor_id: foundSponsor.id,
        position: position,
      });
      setNotice(`${selUser.name || `Üye #${selUser.user_id}`} başarıyla ${foundSponsor.name} sponsoru altına (${position === "left" ? "sol" : "sağ"}) yerleştirildi.`);
      setSelUser(null);
      setSponsorCode("");
      setFoundSponsor(null);
      setPosition("");
      load();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setPlacing(false);
    }
  };

  if (loading && users === null) {
    return <AdminSpinner label="Bekleyen havuzu yükleniyor…" />;
  }

  return (
    <div>
      <AdminHeader
        title="Bekleyen Havuz"
        subtitle="Kaydı tamamlanmış ancak henüz ağaca yerleştirilmemiş üyelerin yönetimi."
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminCard>
          <div className="text-sm text-gray-500 dark:text-gray-400">Havuzdaki Üye Sayısı</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white">
            {users?.length ?? 0}
          </div>
        </AdminCard>
      </div>

      <AdminCard title="Havuz Listesi">
        {users && users.length === 0 ? (
          <AdminEmpty>Havuzda bekleyen üye yok.</AdminEmpty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th className={thCls}>Üye</th>
                  <th className={thCls}>Bekleme Başlangıcı</th>
                  <th className={thCls}>Mevcut Sponsor (Varsa)</th>
                  <th className={`${thCls} text-right`}>İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users?.map((u) => (
                  <tr key={u.user_id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                    <td className={tdCls}>
                      <div className="font-medium text-gray-800 dark:text-white/90">
                        {u.name || `Üye #${u.user_id}`}
                      </div>
                      {u.member_code && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {u.member_code}
                        </div>
                      )}
                    </td>
                    <td className={tdCls}>
                      {u.pending_since ? new Date(u.pending_since).toLocaleString("tr-TR") : "—"}
                    </td>
                    <td className={tdCls}>
                      {u.sponsor_name ? (
                        <div>
                          <div className="text-gray-800 dark:text-white/90">{u.sponsor_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">#{u.sponsor_id}</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <AdminBtn size="xs" variant="outline" onClick={() => {
                        setSelUser(u);
                        setSponsorCode("");
                        setFoundSponsor(null);
                        setPosition("");
                        setModalError("");
                      }}>
                        Yerleştir
                      </AdminBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <AdminModal
        open={!!selUser}
        title={selUser ? `Üyeyi Yerleştir: ${selUser.name || `Üye #${selUser.user_id}`}` : ""}
        onClose={() => {
          if (!placing) setSelUser(null);
        }}
      >
        {selUser && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={labelCls}>Sponsor Üye Kodu</label>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="Örn: BW12345"
                    value={sponsorCode}
                    onChange={(e) => setSponsorCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  />
                  <AdminBtn onClick={handleLookup} disabled={searchingSponsor}>
                    {searchingSponsor ? "..." : "Ara"}
                  </AdminBtn>
                </div>
                {foundSponsor && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    <span>✓</span> {foundSponsor.name} ({foundSponsor.member_code})
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Konum</label>
                <select
                  className={inputCls}
                  value={position}
                  onChange={(e) => setPosition(e.target.value as "left" | "right")}
                >
                  <option value="">Seçiniz...</option>
                  <option value="left">Sol</option>
                  <option value="right">Sağ</option>
                </select>
              </div>
            </div>

            {modalError && <AdminAlert kind="error" className="py-2 text-xs">{modalError}</AdminAlert>}

            <div className="flex justify-end gap-2 pt-4">
              <AdminBtn variant="outline" onClick={() => setSelUser(null)} disabled={placing}>
                Vazgeç
              </AdminBtn>
              <AdminBtn onClick={handlePlace} disabled={placing || !foundSponsor || !position}>
                {placing ? "Yerleştiriliyor…" : "Yerleştir"}
              </AdminBtn>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
