"use client";

import { useEffect, useMemo, useState } from "react";
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
  listCareers,
  listCareerMonthly,
  listCareerEarnings,
  listRanks,
  getErrorMessage,
  type CareerRank,
  type CareerMonthlyGroup,
  type CareerEarningUser,
  type Rank,
} from "@/lib/api";

const pad = (n: number) => String(n).padStart(2, "0");

const fmtDate = (s: string) => {
  const p = s.slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : s;
};

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";

const BOX_STYLES = [
  "border-brand-200 bg-brand-50/70 dark:border-brand-500/25 dark:bg-brand-500/10",
  "border-amber-200 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-500/10",
  "border-violet-200 bg-violet-50/70 dark:border-violet-500/25 dark:bg-violet-500/10",
  "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/25 dark:bg-emerald-500/10",
  "border-sky-200 bg-sky-50/70 dark:border-sky-500/25 dark:bg-sky-500/10",
  "border-rose-200 bg-rose-50/70 dark:border-rose-500/25 dark:bg-rose-500/10",
];

export default function KariyerBonusuPage() {
  const simdi = new Date();

  const [year, setYear] = useState(simdi.getFullYear());
  const [month, setMonth] = useState(simdi.getMonth() + 1);
  const [careerId, setCareerId] = useState<number | null>(null);
  const [order, setOrder] = useState<"top" | "bottom">("top");

  const [careers, setCareers] = useState<CareerRank[] | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [monthly, setMonthly] = useState<CareerMonthlyGroup[] | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [earnings, setEarnings] = useState<CareerEarningUser[] | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [error, setError] = useState("");

  const ayStr = `${year}-${pad(month)}`;
  const start = `${ayStr}-01`;
  const end = `${ayStr}-${pad(new Date(year, month, 0).getDate())}`;

  const YIL_SECENEKLERI: number[] = [];
  for (let y = simdi.getFullYear() - 4; y <= simdi.getFullYear() + 1; y++) {
    YIL_SECENEKLERI.push(y);
  }

  // Kariyer listesi + rütbe tanımı (kariyer bonusu tutarı)
  useEffect(() => {
    listCareers()
      .then((list) => {
        setCareers(list);
        setCareerId((cur) => cur ?? list[0]?.id ?? null);
      })
      .catch((e) => {
        setCareers([]);
        setError(getErrorMessage(e));
      });
    listRanks()
      .then(setRanks)
      .catch(() => setRanks([]));
  }, []);

  // Seçilen ayın kariyer kazanımları
  useEffect(() => {
    setMonthlyLoading(true);
    listCareerMonthly(start, end)
      .then(setMonthly)
      .catch((e) => {
        setMonthly([]);
        setError(getErrorMessage(e));
      })
      .finally(() => setMonthlyLoading(false));
  }, [start, end]);

  // Seçilen ayın kazanç listesi (kariyer üyelerine göre filtrelenir)
  useEffect(() => {
    setEarningsLoading(true);
    listCareerEarnings(start, end, order, 1000)
      .then(setEarnings)
      .catch((e) => {
        setEarnings([]);
        setError(getErrorMessage(e));
      })
      .finally(() => setEarningsLoading(false));
  }, [start, end, order]);

  const career = useMemo(
    () => careers?.find((c) => c.id === careerId) ?? null,
    [careers, careerId]
  );

  // Seçili rütbenin aylık kariyer bonusu tutarı
  const bonusTutari = useMemo(() => {
    const r = ranks.find((x) => x.id === careerId) ?? ranks.find((x) => x.name === career?.name);
    return r?.career_bonus_amount ?? 0;
  }, [ranks, careerId, career]);

  // Seçili kariyerin bu ay kariyer kazananları (kazanım tarihiyle)
  const monthlyUsers = useMemo(() => {
    const g = (monthly ?? []).find(
      (x) => x.rank_id === careerId || x.rank_name === career?.name
    );
    return g?.users ?? [];
  }, [monthly, careerId, career]);

  // Seçili kariyerin üyeleri + bu ayki kazançları
  const rows = useMemo(() => {
    const members = career?.members ?? [];
    const earnMap = new Map<number, CareerEarningUser>();
    for (const u of earnings ?? []) earnMap.set(u.id, u);
    const achMap = new Map<number, string>();
    for (const u of monthlyUsers) achMap.set(u.id, u.achieved_at);

    return members
      .map((m) => ({
        ...m,
        kazanc: earnMap.get(m.id)?.total ?? 0,
        achieved_at: achMap.get(m.id) ?? "",
      }))
      .sort((a, b) => b.kazanc - a.kazanc || a.name.localeCompare(b.name, "tr"));
  }, [career, earnings, monthlyUsers]);

  const toplamKazanc = rows.reduce((s, r) => s + r.kazanc, 0);
  const kazananSayisi = rows.filter((r) => r.kazanc > 0).length;
  const bonusButcesi = (career?.count ?? 0) * bonusTutari;
  const totalMembers = careers ? careers.reduce((s, c) => s + c.count, 0) : 0;

  return (
    <div>
      <AdminHeader
        title="Kariyer Bonusu"
        subtitle="Kariyer (rütbe) bazlı aylık kazanç ve kariyer bonusu görünümü."
      />

      <AdminAlert kind="warning">
        ℹ️ Veriler ilgili rapor ucundan gelir — kariyer kazanımları ve aylık kazançlar{" "}
        <b>Raporlar → Aylık Kariyer</b> ile aynı kaynaktan okunur.
      </AdminAlert>

      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      {/* Filtreler: kariyer + yıl/ay + sıralama */}
      <AdminCard
        title="Filtreler"
        subtitle="Kariyer ve dönem seçin — liste anında güncellenir"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Kariyer
            </label>
            <select
              className={inputCls}
              value={careerId ?? ""}
              onChange={(e) => setCareerId(parseInt(e.target.value, 10))}
              disabled={!careers || careers.length === 0}
            >
              {(careers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.count} üye)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Yıl
            </label>
            <select
              className={inputCls}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
            >
              {YIL_SECENEKLERI.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Ay
            </label>
            <select
              className={inputCls}
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {pad(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Sıralama
            </label>
            <select
              className={inputCls}
              value={order}
              onChange={(e) => setOrder(e.target.value as "top" | "bottom")}
            >
              <option value="top">En çok kazanan</option>
              <option value="bottom">En az kazanan</option>
            </select>
          </div>
        </div>
      </AdminCard>

      {/* Kariyer dağılımı özet kartları */}
      <div className="mt-5">
        <AdminCard
          title="Kariyer Dağılımı"
          subtitle={`Tüm zamanlar · ${careers?.length ?? 0} kategori · ${totalMembers} üye — kartlara tıklayarak kariyer seçin`}
        >
          {careers === null ? (
            <AdminSpinner label="Kariyer dağılımı yükleniyor…" />
          ) : careers.length === 0 ? (
            <AdminEmpty>Kariyer kaydı bulunamadı.</AdminEmpty>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
              {careers.map((cr, i) => {
                const secili = cr.id === careerId;
                const r = ranks.find((x) => x.id === cr.id) ?? ranks.find((x) => x.name === cr.name);
                const bonus = r?.career_bonus_amount ?? 0;
                return (
                  <button
                    key={cr.id}
                    type="button"
                    onClick={() => setCareerId(cr.id)}
                    className={`rounded-2xl border p-4 text-left transition hover:shadow-theme-sm ${
                      BOX_STYLES[i % BOX_STYLES.length]
                    } ${secili ? "ring-2 ring-brand-500" : ""}`}
                  >
                    <div className="truncate text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {cr.name}
                    </div>
                    <div className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">
                      {cr.count}
                    </div>
                    <div className="text-[10px] font-medium text-gray-400">
                      üye{bonus > 0 ? ` · ${tl(bonus)} bonus` : ""}
                    </div>
                    {secili && (
                      <div className="mt-2">
                        <AdminBadge color="blue">SEÇİLİ</AdminBadge>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </AdminCard>
      </div>

      {/* Seçili kariyerin aylık özeti + üye/kazanç listesi */}
      <div className="mt-5">
        <AdminCard
          title={career ? `${career.name} — Aylık Kazanç ve Bonus` : "Aylık Kazanç ve Bonus"}
          subtitle={`${fmtDate(start)} – ${fmtDate(end)} dönemi`}
          actions={
            bonusTutari > 0 ? (
              <AdminBadge color="purple">Aylık kariyer bonusu: {tl(bonusTutari)}</AdminBadge>
            ) : undefined
          }
        >
          {careers === null || monthlyLoading || earningsLoading ? (
            <AdminSpinner label="Aylık kazanç verileri yükleniyor…" />
          ) : !career ? (
            <AdminEmpty>Üye dağılımı bulunamadı.</AdminEmpty>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Kariyer Üyesi
                  </div>
                  <div className="mt-1 text-xl font-bold text-gray-800 dark:text-white/90">
                    {career.count}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Bu Ay Kazanan
                  </div>
                  <div className="mt-1 text-xl font-bold text-gray-800 dark:text-white/90">
                    {kazananSayisi}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Toplam Aylık Kazanç
                  </div>
                  <div className="mt-1 text-xl font-bold text-success-600 dark:text-success-400">
                    {tl(toplamKazanc)}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Kariyer Bonusu Bütçesi
                  </div>
                  <div className="mt-1 text-xl font-bold text-[#7239ea] dark:text-[#c5a6ff]">
                    {tl(bonusButcesi)}
                  </div>
                </div>
              </div>

              {rows.length === 0 ? (
                <AdminEmpty>Bu kariyerde üye yok.</AdminEmpty>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/[0.02]">
                      <tr>
                        <th className={thCls}>#</th>
                        <th className={thCls}>Üye</th>
                        <th className={thCls}>Üye Kodu</th>
                        <th className={thCls}>Kariyer Kazanım Tarihi</th>
                        <th className={`${thCls} text-right`}>Aylık Kazanç</th>
                        <th className={`${thCls} text-right`}>Kariyer Bonusu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {rows.map((u, i) => (
                        <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                          <td className={tdCls}>{i + 1}</td>
                          <td className={tdCls}>
                            <span className="font-medium text-gray-800 dark:text-white/90">
                              {u.name}
                            </span>
                          </td>
                          <td className={tdCls}>
                            <span className="font-mono text-xs text-gray-500">{u.member_code}</span>
                          </td>
                          <td className={tdCls}>
                            {u.achieved_at ? (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {fmtDate(u.achieved_at)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className={`${tdCls} text-right font-semibold`}>
                            {u.kazanc > 0 ? (
                              tl(u.kazanc)
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className={`${tdCls} text-right`}>
                            {bonusTutari > 0 ? (
                              <AdminBadge color="purple">{tl(bonusTutari)}</AdminBadge>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bu ay kariyer kazananları */}
              <div className="mt-5">
                <h4 className="mb-2.5 text-sm font-semibold text-gray-800 dark:text-white/90">
                  Bu Ay Kariyer Kazananları
                </h4>
                {monthlyLoading ? (
                  <AdminSpinner label="Kariyer kazanımları yükleniyor…" />
                ) : monthlyUsers.length === 0 ? (
                  <AdminEmpty>
                    {ayStr} döneminde bu kariyere yükselen üye yok.
                  </AdminEmpty>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {monthlyUsers.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300"
                      >
                        <span className="font-medium">{u.name}</span>
                        <span className="font-mono text-[10px] text-gray-400">
                          {u.member_code} · {fmtDate(u.achieved_at)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </AdminCard>
      </div>
    </div>
  );
}