"use client";
import { useEffect, useState } from "react";
import { listTickets, resolveTicket, getTicket, replyTicket, type Ticket } from "@/lib/api";

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Açık", cls: "bg-blue-100 text-blue-700" },
  new: { label: "Yeni", cls: "bg-blue-100 text-blue-700" },
  resolved: { label: "Çözüldü", cls: "bg-green-100 text-green-700" },
  closed: { label: "Kapalı", cls: "bg-gray-100 text-gray-600" },
};

export default function DestekPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

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

  const code = (t: Ticket) => `BW-${t.member_code || "U" + t.user_id}-${t.id}`;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Destek Talepleri</h2>
          <p className="text-sm text-gray-500">Talebe tıklayın — yazışma açılır, yanıt yazabilirsiniz.</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-600">{tickets.length} talep</span>
      </div>

      {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-10 text-center text-gray-400">Yükleniyor...</div>
      ) : tickets.length === 0 ? (
        <div className="py-10 text-center text-gray-400">Henüz destek talebi yok.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-3 py-2 font-bold">Talep Kodu</th>
                <th className="px-3 py-2 font-bold">Ad Soyad</th>
                <th className="px-3 py-2 font-bold">Telefon</th>
                <th className="px-3 py-2 font-bold">Mesaj</th>
                <th className="px-3 py-2 font-bold">Durum</th>
                <th className="px-3 py-2 font-bold">Tarih</th>
                <th className="px-3 py-2 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const st = STATUS[t.status] ?? { label: t.status, cls: "bg-gray-100 text-gray-600" };
                const openRow = t.status === "open" || t.status === "new";
                return (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => open(t)} className="cursor-pointer font-mono font-bold text-brand-600 hover:underline">
                        {code(t)}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-800">{t.name} {t.surname}</td>
                    <td className="px-3 py-2 text-gray-600">{t.phone || "—"}</td>
                    <td className="max-w-[240px] px-3 py-2 text-gray-600">
                      <span className="line-clamp-1">{t.message.replace(/\n/g, " ")}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                      {new Date(t.created_at).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {openRow && (
                        <button type="button" disabled={busy === t.id} onClick={() => resolve(t.id)}
                          className="cursor-pointer rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
                          {busy === t.id ? "..." : "Çözüldü"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Yazışma modalı */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <div>
                <p className="font-mono text-sm font-bold text-brand-600">{code(selected)}</p>
                <p className="text-xs text-gray-400">{selected.name} {selected.surname}</p>
              </div>
              <div className="flex items-center gap-2">
                {(selected.status === "open" || selected.status === "new") && (
                  <button type="button" onClick={() => resolve(selected.id)}
                    className="cursor-pointer rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700">
                    Çözüldü
                  </button>
                )}
                <button type="button" onClick={() => setSelected(null)} className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">{selected.message}</p>
            </div>

            <div className="flex gap-2 border-t border-gray-100 p-4">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Yanıt yazın..."
                className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
              <button type="button" disabled={sending || !reply.trim()} onClick={sendReply}
                className="cursor-pointer rounded-lg bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50">
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
