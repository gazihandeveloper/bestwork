"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminHeader,
  AdminCard,
  AdminBtn,
  AdminBadge,
  AdminAlert,
  AdminSpinner,
  AdminEmpty,
  tdCls,
  thCls,
} from "@/components/admin/AdminUI";
import {
  fraudDuplicates,
  fraudMatches,
  fraudScan,
  getErrorMessage,
  type FraudGroup,
} from "@/lib/api";

// Rank filtresi yok; doğrudan taramaya dayalı güvenlik kontrol ekranı.

/** Değeri güvenli biçimde metne çevirir (döngüsel objeler dahil hata vermez). */
function safeString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return "[Nesne]";
    }
  }
  return String(v ?? "");
}

/** unknown[] içindeki tek bir satır için bilinen alanları çıkarır. */
function matchFields(x: unknown): string[] {
  if (Array.isArray(x)) {
    const nested = x.slice(0, 4).map((i) => matchFields(i)).filter((arr) => arr.length);
    return nested.length ? nested.flat().slice(0, 6) : ["(boş dizi)"];
  }
  if (x && typeof x === "object") {
    const record = x as Record<string, unknown>;
    const out: string[] = [];
    for (const key of ["id", "name", "member_code", "code", "reason", "score", "field", "value", "count", "message", "ip"]) {
      const v = record[key];
      if (v !== undefined && v !== null && String(v).length > 0) {
        out.push(`${key}: ${safeString(v)}`);
      }
    }
    if (!out.length) {
      const keys = Object.keys(record).slice(0, 5);
      if (keys.length) out.push(...keys.map((k) => `${k}: ${safeString(record[k])}`));
      else out.push("(boş nesne)");
    }
    return out;
  }
  const s = safeString(x);
  return s ? [s] : [];
}

/** Duplicate sinyali — backend'de hem {key,count,members} hem {field,value,count,accounts} dönebilir. */
function groupLabel(g: FraudGroup): string {
  const anyG = g as unknown as Record<string, unknown>;
  const field = typeof anyG.field === "string" ? anyG.field : undefined;
  const value = typeof anyG.value === "string" ? anyG.value : undefined;
  if (g.key) return g.key;
  if (field && value) return `${field}: ${value}`;
  if (field) return field;
  if (value) return value;
  return "Sinyal grubu";
}

function groupAccounts(g: FraudGroup): string[] {
  const anyG = g as unknown as Record<string, unknown>;
  if (!Array.isArray(anyG.accounts)) return [];
  return (anyG.accounts as unknown[]).map((a) => `#${String(a)}`);
}

function fmtFieldLabel(f: string): string {
  const map: Record<string, string> = {
    tc: "TC Kimlik",
    iban: "IBAN",
    phone: "Telefon",
    email: "E-posta",
    ip: "IP Adresi",
    member_code: "Üye No",
  };
  return map[f] ?? f;
}

export default function GuvenlikPage() {
  const [groups, setGroups] = useState<FraudGroup[] | null>(null);
  const [matches, setMatches] = useState<unknown[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAll = useCallback(() => {
    Promise.all([
      fraudDuplicates(50),
      fraudMatches(50),
    ])
      .then(([g, m]) => {
        setGroups(g);
        setMatches(m);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const runScan = async () => {
    if (!window.confirm("Fraud taraması başlatılacak. Devam etmek istediğinize emin misiniz?")) return;
    setScanning(true);
    setError("");
    setNotice("");
    try {
      await fraudScan();
      setNotice("Fraud taraması tamamlandı; listeler güncellendi.");
      loadAll();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setScanning(false);
    }
  };

  if (groups === null || matches === null) {
    return <AdminSpinner label="Güvenlik verileri yükleniyor…" />;
  }

  return (
    <div>
      <AdminHeader
        title="Güvenlik / Fraud"
        subtitle="Şüpheli çoklu kayıt, aynı IP veya ödeme bilgisi sinyalleri ve tarama sonuçları."
        actions={
          <>
            <AdminBadge color={groups.length > 0 ? "red" : "green"}>
              {groups.length} sinyal
            </AdminBadge>
            <AdminBtn variant="primary" disabled={scanning} onClick={() => void runScan()}>
              {scanning ? "Taranıyor…" : "Fraud Tara"}
            </AdminBtn>
          </>
        }
      />

      <AdminAlert kind="warning">
        Bu ekran, sistemdeki şüpheli birden çok kayıt, aynı IP / TC / IBAN / telefon kullanımı gibi
        duplicate sinyallerini ve tarama sonuçlarını listeler. Uyarılar manuel inceleme içindir;
        otomatik aksiyon alınmaz.
      </AdminAlert>

      {notice && <AdminAlert kind="success">{notice}</AdminAlert>}
      {error && <AdminAlert kind="error">{error}</AdminAlert>}

      <div className="mb-5">
        <AdminCard
          title="Şüpheli Eşleşmeler / Duplicate Sinyalleri"
          subtitle={`Toplam ${groups.length} sinyal grubu — aynı bilgiyle birden çok hesap.`}
        >
          {groups.length === 0 ? (
            <AdminEmpty>Şu anda şüpheli duplicate sinyali yok.</AdminEmpty>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th className={thCls}>Sinyal</th>
                    <th className={thCls}>Hesap Sayısı</th>
                    <th className={thCls}>Üyeler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {groups.map((g, i) => (
                    <tr key={`${g.key || "grp"}-${i}`} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className={`${tdCls} font-medium text-gray-800 dark:text-white/90`}>
                        <div>{fmtFieldLabel(groupLabel(g))}</div>
                      </td>
                      <td className={tdCls}>
                        <AdminBadge color={g.count >= 5 ? "red" : g.count >= 2 ? "amber" : "gray"}>
                          {g.count} hesap
                        </AdminBadge>
                      </td>
                      <td className={`${tdCls} text-gray-600 dark:text-gray-400`}>
                        <GroupMembers g={g} />
                        {groupAccounts(g).length > 0 && (
                          <div className="mt-1 text-xs font-mono text-gray-500 dark:text-gray-400">
                            {groupAccounts(g).join(", ")}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      <AdminCard
        title="Tarama Sonuçları (matches)"
        subtitle={`${matches.length} eşleşme — bilinen alanlar (id, isim, gerekçe, puan) gösterilir.`}
      >
        {matches.length === 0 ? (
          <AdminEmpty>Tarama sonucu eşleşme yok.</AdminEmpty>
        ) : (
          <div className="space-y-2">
            {matches.map((m, i) => {
              const fields = matchFields(m);
              return (
                <div
                  key={i}
                  className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
                >
                  {fields.length === 0 ? (
                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                      {safeString(m)}
                    </span>
                  ) : (
                    <ul className="space-y-0.5 text-sm text-gray-700 dark:text-gray-300">
                      {fields.map((f, j) => (
                        <li key={j} className="font-mono text-xs">
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

function GroupMembers({ g }: { g: FraudGroup }) {
  if (!g.members || g.members.length === 0) return <span className="text-xs text-gray-400">—</span>;
  return (
    <ul className="space-y-0.5">
      {g.members.map((m) => (
        <li key={m.id} className="flex items-center gap-2">
          <span className="font-medium text-gray-700 dark:text-gray-300">{m.name}</span>
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{m.member_code}</span>
        </li>
      ))}
    </ul>
  );
}
