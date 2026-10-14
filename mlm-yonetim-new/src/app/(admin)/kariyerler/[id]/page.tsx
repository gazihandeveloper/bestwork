"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminSpinner,
  AdminEmpty,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import { listCareers, getErrorMessage, type CareerRank } from "@/lib/api";

export default function KariyerDetayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params?.id ?? -1);

  const [career, setCareer] = useState<CareerRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listCareers()
      .then((list) => {
        const found = list.find((c) => c.id === id);
        if (found) setCareer(found);
        else setError("Kariyer bulunamadı.");
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div>
      <AdminHeader
        title={career ? `${career.name} — Üyeler` : "Kariyer Üyeleri"}
        subtitle={career ? `${career.count} üye bu kariyerde` : undefined}
        actions={
          <AdminBtn variant="outline" onClick={() => router.push("/kariyerler")}>
            ← Kariyerlere Dön
          </AdminBtn>
        }
      />

      {error && <AdminEmpty>{error}</AdminEmpty>}

      {loading ? (
        <AdminSpinner label="Üyeler yükleniyor…" />
      ) : career ? (
        career.members.length === 0 ? (
          <AdminCard>
            <AdminEmpty>Bu kariyerde üye yok.</AdminEmpty>
          </AdminCard>
        ) : (
          <AdminCard title="Üye Listesi" subtitle={`${career.members.length} kişi`}>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className={thCls}>#</th>
                    <th className={thCls}>Ad Soyad</th>
                    <th className={thCls}>Üye Kodu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {career.members.map((m, i) => (
                    <tr key={m.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className={tdCls}>{i + 1}</td>
                      <td className={tdCls}>
                        <span className="font-medium text-gray-800 dark:text-white/90">{m.name}</span>
                      </td>
                      <td className={tdCls}>
                        <span className="font-mono text-xs text-gray-500">{m.member_code}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )
      ) : null}
    </div>
  );
}
