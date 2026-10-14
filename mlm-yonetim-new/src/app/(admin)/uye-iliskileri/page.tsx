"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  inputCls,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import {
  getMemberCounts,
  listAdminUsers,
  getStatsSummary,
  getStatsLeaders,
  getErrorMessage,
  type MemberCounts,
  type AdminUser,
  type StatsSummaryData,
  type StatsLeaderRow,
} from "@/lib/api";

export default function UyeIliskileriPage() {
  const [summary, setSummary] = useState<StatsSummaryData | null>(null);
  const [counts, setCounts] = useState<MemberCounts | null>(null);
  const [sponsors, setSponsors] = useState<StatsLeaderRow[]>([]);
  const [searchResults, setSearchResults] = useState<AdminUser[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState({ general: true, search: false, leaders: true });
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadInitialData = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, general: true }));
    try {
      const [sum, cnt] = await Promise.all([getStatsSummary(), getMemberCounts()]);
      setSummary(sum);
      setCounts(cnt);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading((prev) => ({ ...prev, general: false }));
    }
  }, []);

  const loadLeaders = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, leaders: true }));
    try {
      const today = new Date().toISOString().split("T")[0];
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const data = await getStatsLeaders("sponsors", yearAgo, today, 10);
      setSponsors(data);
    } catch (err) {
      console.error("Leaders error:", getErrorMessage(err));
    } finally {
      setIsLoading((prev) => ({ ...prev, leaders: false }));
    }
  }, []);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    setIsLoading((prev) => ({ ...prev, search: true }));
    try {
      const d = await listAdminUsers({ q, limit: 50 });
      setSearchResults(d.users);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading((prev) => ({ ...prev, search: false }));
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      performSearch(searchTerm);
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [searchTerm, performSearch]);

  useEffect(() => {
    loadInitialData();
    loadLeaders();
  }, [loadInitialData, loadLeaders]);

  if (isLoading.general) {
    return <AdminSpinner label="Üye ilişkileri verileri hazırlanıyor..." />;
  }

  const passiveRatio = counts && counts.total > 0 
    ? ((counts.passive / counts.total) * 100).toFixed(1) 
    : "0.0";

  return (
    <div className="space-y-6">
      <AdminHeader 
        title="Üye İlişkileri" 
        subtitle="CRM görünümü üzerinden genel üye sağlığı, performanslı sponsorlar ve hızlı erişim araçları." 
      />

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      {/* Özet Kartları */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Toplam Üye" value={summary?.total_members || 0} color="blue" />
        <StatCard label="Aktif Üye" value={summary?.active_members || 0} color="green" />
        <StatCard label="Pasif Üye" value={summary?.passive_members || 0} color="red" />
        <StatCard label="Haftalık Yeni" value={summary?.new_this_week || 0} color="amber" />
        <StatCard label="Aylık Yeni" value={summary?.new_this_month || 0} color="purple" />
        <StatCard label="Pasiflik Oranı" value={`${passiveRatio}%`} color="gray" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sol Kolon: Hızlı Erişim ve Arama */}
        <div className="lg:col-span-2">
          <AdminCard 
            title="Hızlı Üye Erişimi" 
            subtitle="Ad, kod veya e-posta ile üyeye hızlıca ulaşın."
            actions={
              <input 
                className={inputCls} 
                placeholder="🔍 Ara..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            }
          >
            {!searchTerm && (
              <AdminEmpty>Sorgulamak istediğiniz üyeyi yukarıdaki kutudan aratabilirsiniz.</AdminEmpty>
            )}
            {isLoading.search && <AdminSpinner label="Aranıyor..." />}
            {!isLoading.search && searchTerm && (!searchResults || searchResults.length === 0) && (
              <AdminEmpty>Eşleşen sonuç bulunamadı.</AdminEmpty>
            )}
            {!isLoading.search && searchResults && searchResults.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th className={thCls}>Ad Soyad</th>
                      <th className={thCls}>Kod</th>
                      <th className={thCls}>Rol</th>
                      <th className={thCls}>Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {searchResults.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                        <td className={tdCls}>{u.name}</td>
                        <td className={`${tdCls} font-mono text-xs`}>{u.member_code}</td>
                        <td className={tdCls}>{u.role}</td>
                        <td className={tdCls}>
                          <AdminBadge color={u.is_active ? "green" : "red"}>
                            {u.is_active ? "Aktif" : "Pasif"}
                          </AdminBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </div>

        {/* Sağ Kolon: Performans / Sponsorlar */}
        <div>
          <AdminCard title="En İyi Sponsorlar" subtitle="Son 12 ayda en çok üye getirenler">
            {isLoading.leaders ? (
              <AdminSpinner label="Liste yükleniyor..." />
            ) : sponsors.length === 0 ? (
              <AdminEmpty>Henüz veri bulunamadı.</AdminEmpty>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-white/[0.02]">
                    <tr>
                      <th className={thCls}>Sponsor</th>
                      <th className={`${thCls} text-right`}>Getirdiği</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sponsors.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                        <td className={tdCls}>
                          <span className="mr-2 text-xs text-gray-400">{idx + 1}.</span>
                          {s.name || `#${s.id}`}
                        </td>
                        <td className={`${tdCls} text-right font-bold text-brand-600 dark:text-brand-400`}>
                          {s.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </div>
      </div>

      <AdminAlert kind="warning">
        <b>CRM Notları:</b> Üyelerin aktivite oranlarını artırmak için pasif üyelerle iletişime geçilmesi önerilir. 
        Performanslı sponsorlara özel motivasyon primleri tanımlanabilir.
      </AdminAlert>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: "blue" | "green" | "red" | "amber" | "purple" | "gray" }) {
  const colors = {
    blue: "border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400",
    green: "border-green-200 bg-green-50/50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400",
    red: "border-red-200 bg-red-50/50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
    amber: "border-amber-200 bg-amber-50/50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
    purple: "border-purple-200 bg-purple-50/50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400",
    gray: "border-gray-200 bg-gray-50/50 text-gray-700 dark:border-gray-500/20 dark:bg-gray-500/10 dark:text-gray-400",
  };

  return (
    <div className={`rounded-xl border px-4 py-4 transition-all hover:shadow-sm ${colors[color]}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value.toLocaleString("tr-TR")}</div>
    </div>
  );
}
