"use client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  listTickets,
  resolveTicket,
  unresolveTicket,
  getTicket,
  replyTicket,
  claimTicket,
  lookupMember,
  type Ticket,
} from "@/lib/api";

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Açık", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  new: { label: "Yeni", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  in_progress: { label: "Beklemede", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  resolved: { label: "Çözüldü", cls: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  unresolved: { label: "Çözümlenemedi", cls: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
  closed: { label: "Kapalı", cls: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300" },
};

type StatColor = "blue" | "amber" | "green" | "red";
type Filter = "new" | "waiting" | "resolved" | "unresolved";

const CARD_STYLES: Record<StatColor, { card: string; icon: string; num: string }> = {
  blue: {
    card: "border-brand-100 dark:border-brand-500/20",
    icon: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
    num: "text-brand-600 dark:text-brand-400",
  },
  amber: {
    card: "border-warning-100 dark:border-warning-500/20",
    icon: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-300",
    num: "text-warning-600 dark:text-orange-300",
  },
  green: {
    card: "border-success-100 dark:border-success-500/20",
    icon: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
    num: "text-success-600 dark:text-success-400",
  },
  red: {
    card: "border-error-100 dark:border-error-500/20",
    icon: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
    num: "text-error-600 dark:text-error-400",
  },
};

function StatCard({
  label,
  value,
  color,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: StatColor;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const c = CARD_STYLES[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3.5 rounded-2xl border bg-white p-4 text-left shadow-theme-xs transition dark:bg-[#1E293B] ${c.card} ${
        active
          ? "ring-2 ring-brand-500/60 ring-offset-1 dark:ring-offset-[#1E293B]"
          : "hover:border-gray-300 dark:hover:border-gray-700"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${c.icon}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className={`text-2xl font-bold leading-tight ${c.num}`}>{value}</div>
        <div className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </button>
  );
}

export default function DestekPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter | null>("new");
  const [memberCode, setMemberCode] = useState<string | null>(null);
  const [memberInfo, setMemberInfo] = useState<{ id: number; name: string; member_code: string } | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState("");

  const load = () => {
    listTickets()
      .then(setTickets)
      .catch((e) => setError(e instanceof Error ? e.message : "Talepler yüklenemedi"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const open = async (t: Ticket) => {
    setSelected(t);
    try {
      const fresh = await getTicket(t.id);
      setSelected(fresh);
    } catch {
      /* list verisiyle devam */
    }
  };

  // TR kodu ile üye destek kayıtları modalını açar
  const openMemberModal = async (codeRaw: string) => {
    const k = codeRaw.trim().toUpperCase();
    if (!/^TR\d{5,}$/.test(k)) return;
    setMemberCode(k);
    setMemberInfo(null);
    setMemberError("");
    setMemberLoading(true);
    try {
      const u = await lookupMember(k);
      setMemberInfo(u);
    } catch (e) {
      setMemberError(e instanceof Error ? e.message : "Üye bulunamadı");
    } finally {
      setMemberLoading(false);
    }
  };

  const resolve = async (id: number) => {
    setBusy(id);
    setError("");
    try {
      await resolveTicket(id);
      load();
      if (selected && selected.id === id) setSelected({ ...selected, status: "resolved" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Talep çözülemedi");
    } finally {
      setBusy(null);
    }
  };

  const unresolve = async (id: number) => {
    setBusy(id);
    setError("");
    try {
      await unresolveTicket(id);
      load();
      if (selected && selected.id === id) setSelected({ ...selected, status: "unresolved" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Talep güncellenemedi");
    } finally {
      setBusy(null);
    }
  };

  const claim = async (id: number) => {
    setBusy(id);
    setError("");
    try {
      const fresh = await claimTicket(id);
      load();
      if (selected && selected.id === id) setSelected(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Talep üstlenilemedi");
    } finally {
      setBusy(null);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const fresh = await replyTicket(selected.id, reply.trim());
      setSelected(fresh);
      setReply("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yanıt gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const code = (t: Ticket) =>
    `BW-${t.member_code || (t.user_id ? "U" + t.user_id : "Misafir")}-${t.id}`;

  const counts = {
    newOnes: tickets.filter((t) => t.status === "open" || t.status === "new").length,
    waiting: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    unresolved: tickets.filter((t) => t.status === "unresolved" || t.status === "closed").length,
  };

  const matchesFilter = (t: Ticket) => {
    switch (filter) {
      case "new":
        return t.status === "open" || t.status === "new";
      case "waiting":
        return t.status === "in_progress";
      case "resolved":
        return t.status === "resolved";
      case "unresolved":
        return t.status === "unresolved" || t.status === "closed";
      default:
        return true;
    }
  };

  const q = query.trim().toLowerCase();
  const visible = tickets.filter(
    (t) =>
      matchesFilter(t) &&
      (q === "" ||
        code(t).toLowerCase().includes(q) ||
        String(t.id).includes(q) ||
        (t.member_code || "").toLowerCase().includes(q))
  );

  const toggleFilter = (f: Filter) => setFilter((prev) => (prev === f ? null : f));

  const filterLabel: Record<Filter, string> = {
    new: "Destek Talepleri (yeni açılanlar)",
    waiting: "Beklemede",
    resolved: "Çözümlendi",
    unresolved: "Çözümlenemedi",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">Destek Talepleri</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Talebe tıklayın — yazışma açılır, yanıt yazabilirsiniz.
          </p>
        </div>
        {/* Arama kutusu (sağ üst) */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.34-4.34" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && /^TR\d{5,}$/i.test(query.trim())) openMemberModal(query);
            }}
            placeholder="Talep kodu / ID / TR kodu ara…"
            className="h-10 w-56 rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              aria-label="Aramayı temizle"
            >
              ✕
            </button>
          )}
          {/^TR\d{5,}$/i.test(query.trim()) && (
            <button
              type="button"
              onClick={() => openMemberModal(query)}
              className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-semibold text-brand-600 shadow-lg transition hover:bg-gray-50 dark:border-gray-700 dark:bg-[#1E293B] dark:text-brand-400 dark:hover:bg-white/5"
            >
              🔍 {query.trim().toUpperCase()} — üye destek kayıtlarını aç
            </button>
          )}
        </div>
      </div>

      {/* 4 renkli özet kutusu — tıklayınca filtreler */}
      <div className="mb-2 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Destek Talepleri"
          value={counts.newOnes}
          color="blue"
          active={filter === "new"}
          onClick={() => toggleFilter("new")}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-6l-2 3h-4l-2-3H2" />
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
          }
        />
        <StatCard
          label="Beklemede"
          value={counts.waiting}
          color="amber"
          active={filter === "waiting"}
          onClick={() => toggleFilter("waiting")}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          }
        />
        <StatCard
          label="Çözümlendi"
          value={counts.resolved}
          color="green"
          active={filter === "resolved"}
          onClick={() => toggleFilter("resolved")}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="m8.5 12.5 2.5 2.5 5-5.5" />
            </svg>
          }
        />
        <StatCard
          label="Çözümlenemedi"
          value={counts.unresolved}
          color="red"
          active={filter === "unresolved"}
          onClick={() => toggleFilter("unresolved")}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          }
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>
          {filter
            ? `${filterLabel[filter]} · ${visible.length} kayıt`
            : `Tüm talepler · ${visible.length} kayıt`}
        </span>
        {filter && (
          <button
            type="button"
            onClick={() => setFilter(null)}
            className="rounded-full border border-gray-200 px-2.5 py-0.5 font-medium text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5"
          >
            Tümünü göster
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-gray-400 dark:text-gray-500">Yükleniyor...</div>
      ) : visible.length === 0 ? (
        <div className="py-10 text-center text-gray-400 dark:text-gray-500">
          {query || filter ? "Bu filtreye uyan talep bulunamadı." : "Henüz destek talebi yok."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-left text-gray-500">
                <th className="px-3 py-2 font-bold">Talep Kodu</th>
                <th className="px-3 py-2 font-bold">Ad Soyad</th>
                <th className="px-3 py-2 font-bold">Telefon</th>
                <th className="px-3 py-2 font-bold">Mesaj</th>
                <th className="px-3 py-2 font-bold">Sorumlu</th>
                <th className="px-3 py-2 font-bold">Durum</th>
                <th className="px-3 py-2 font-bold">Tarih</th>
                <th className="px-3 py-2 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const st = STATUS[t.status] ?? {
                  label: t.status,
                  cls: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
                };
                const openRow = t.status === "open" || t.status === "new";
                const canFinalize =
                  t.status === "open" || t.status === "new" || t.status === "in_progress";
                return (
                  <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => open(t)}
                        className="cursor-pointer font-mono font-bold text-brand-600 hover:underline"
                      >
                        {code(t)}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-800 dark:text-white/90">
                      {t.name} {t.surname}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.phone || "—"}</td>
                    <td className="max-w-[240px] px-3 py-2 text-gray-600 dark:text-gray-400">
                      <span className="line-clamp-1">{t.message.replace(/\n/g, " ")}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                      {t.assigned_name ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                          {t.assigned_name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {new Date(t.created_at).toLocaleString("tr-TR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {openRow && (
                          <button
                            type="button"
                            disabled={busy === t.id}
                            onClick={() => claim(t.id)}
                            className="cursor-pointer rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                          >
                            {busy === t.id ? "..." : t.assigned_name ? "Üstlenildi" : "Üstlen"}
                          </button>
                        )}
                        {canFinalize && (
                          <>
                            <button
                              type="button"
                              disabled={busy === t.id}
                              onClick={() => resolve(t.id)}
                              className="cursor-pointer rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {busy === t.id ? "..." : "Çözümlendi"}
                            </button>
                            <button
                              type="button"
                              disabled={busy === t.id}
                              onClick={() => unresolve(t.id)}
                              className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {busy === t.id ? "..." : "Çözümlenemedi"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Üye destek kayıtları modalı (TR kodu araması) */}
      {memberCode && (
        <div
          className="fixed inset-0 z-[1000000] flex items-center justify-center bg-gray-950/70 p-4"
          onClick={() => setMemberCode(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl dark:bg-[#1E293B]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
              <div>
                <p className="text-base font-bold text-gray-800 dark:text-white/90">Üye Destek Kayıtları</p>
                <p className="font-mono text-sm font-bold text-brand-600">{memberCode}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {memberLoading
                    ? "Üye aranıyor…"
                    : memberInfo
                      ? "👤 " + memberInfo.name
                      : memberError}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMemberCode(null)}
                className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {(() => {
                const list = tickets.filter(
                  (t) => (t.member_code || "").toUpperCase() === memberCode
                );
                if (list.length === 0) {
                  return (
                    <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                      Bu üyeye ait destek kaydı bulunamadı.
                    </p>
                  );
                }
                return (
                  <div className="flex flex-col gap-2.5">
                    {list.map((t) => {
                      const st = STATUS[t.status] ?? {
                        label: t.status,
                        cls: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
                      };
                      return (
                        <div
                          key={t.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 p-3.5 dark:border-gray-800"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-brand-600">
                                {code(t)}
                              </span>
                              <span className={"rounded-full px-2 py-0.5 text-[11px] font-bold " + st.cls}>
                                {st.label}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                {new Date(t.created_at).toLocaleString("tr-TR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="mt-1.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                              {t.message.replace(/\n/g, " ")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setMemberCode(null);
                              open(t);
                            }}
                            className="shrink-0 cursor-pointer rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
                          >
                            Görüşmeyi Aç
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Yazışma modalı */}
      {selected && (
        <div
          className="fixed inset-0 z-[1000000] flex items-center justify-center bg-gray-950/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl dark:bg-[#1E293B]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <div>
                <p className="font-mono text-sm font-bold text-brand-600">{code(selected)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {selected.name} {selected.surname}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Sorumlu: {selected.assigned_name || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(selected.status === "open" || selected.status === "new") && (
                  <button
                    type="button"
                    disabled={busy === selected.id}
                    onClick={() => claim(selected.id)}
                    className="cursor-pointer rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {busy === selected.id ? "..." : "Üstlen"}
                  </button>
                )}
                {(selected.status === "open" ||
                  selected.status === "new" ||
                  selected.status === "in_progress") && (
                  <>
                    <button
                      type="button"
                      onClick={() => resolve(selected.id)}
                      className="cursor-pointer rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                    >
                      Çözümlendi
                    </button>
                    <button
                      type="button"
                      onClick={() => unresolve(selected.id)}
                      className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                    >
                      Çözümlenemedi
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-gray-300">
                {selected.message}
              </p>
            </div>

            <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 p-4">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Yanıt yazın..."
                className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
              <button
                type="button"
                disabled={sending || !reply.trim()}
                onClick={sendReply}
                className="cursor-pointer rounded-lg bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
