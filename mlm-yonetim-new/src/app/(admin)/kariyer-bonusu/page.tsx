"use client";

import { useEffect, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminAlert,
  AdminSpinner,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import { listRanks, updateRank, getErrorMessage, type Rank, type RankInput } from "@/lib/api";

const fmt = (v: number) => Number(v || 0).toLocaleString("tr-TR");

export default function CareerBonusPage() {
  const [ranks, setRanks] = useState<Rank[] | null>(null);
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = () => {
    listRanks()
      .then((rs) => {
        setRanks(rs);
        const map: Record<number, number> = {};
        rs.forEach((r) => (map[r.id] = r.career_bonus_amount));
        setAmounts(map);
      })
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    load();
  }, []);

  const saveOne = async (r: Rank) => {
    setSavingId(r.id);
    setError("");
    setNotice("");
    try {
      const input: RankInput = {
        name: r.name,
        required_left_pv: r.required_left_pv,
        required_right_pv: r.required_right_pv,
        monthly_binary_limit: r.monthly_binary_limit,
        required_downline_rank_id: r.required_downline_rank_id,
        required_downline_count: r.required_downline_count,
        personal_activity_pv: r.personal_activity_pv,
        career_bonus_amount: Number(amounts[r.id] ?? 0),
      };
      await updateRank(r.id, input);
      setNotice(`${r.name} kariyer primi güncellendi.`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  if (error && ranks === null) return <AdminAlert kind="error">{error}</AdminAlert>;
  if (ranks === null) return <AdminSpinner label="Kariyer seviyeleri yükleniyor…" />;

  return (
    <div>
      <AdminHeader
        title="Kariyer Bonusu"
        subtitle="Her kariyer seviyesine ilk kez ulaşıldığında ödenecek TEK SEFERLİK primi (₺) belirleyin."
      />

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && ranks !== null && <AdminAlert kind="error">{error}</AdminAlert>}

      <AdminCard title={`Kariyer Primleri (${ranks.length} seviye)`} subtitle="Ömür boyu yalnızca ilk kez ulaşımda ödenir.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className={thCls}>Kariyer</th>
                <th className={thCls}>Sol / Sağ PV</th>
                <th className={thCls}>Aylık Binary Limiti</th>
                <th className={thCls}>Kişisel Aktivite</th>
                <th className={thCls}>Kariyer Primi (₺)</th>
                <th className={`${thCls} text-right`}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {ranks.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td className={`${tdCls} font-medium text-gray-800 dark:text-white/90`}>{r.name.toUpperCase()}</td>
                  <td className={`${tdCls} text-gray-500 dark:text-gray-400`}>
                    {fmt(r.required_left_pv)} / {fmt(r.required_right_pv)}
                  </td>
                  <td className={`${tdCls} text-gray-500 dark:text-gray-400`}>{fmt(r.monthly_binary_limit)} ₺</td>
                  <td className={`${tdCls} text-gray-500 dark:text-gray-400`}>{fmt(r.personal_activity_pv)} PV</td>
                  <td className={tdCls}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-gray-800 dark:bg-transparent"
                      value={amounts[r.id] ?? 0}
                      onChange={(e) => setAmounts({ ...amounts, [r.id]: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className={`${tdCls} text-right`}>
                    <AdminBtn size="xs" onClick={() => saveOne(r)} disabled={savingId === r.id}>
                      {savingId === r.id ? "..." : "Kaydet"}
                    </AdminBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Prim, üyelikte ömür boyu yalnızca o kariyere İLK kez ulaşıldığında bir kez ödenir ve cüzdana “career” olarak işlenir.
        </p>
      </AdminCard>
    </div>
  );
}
