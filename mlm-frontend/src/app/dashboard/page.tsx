"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Copy,
  Link as LinkIcon,
  BarChart3,
  Camera,
  Medal,
  BadgeCheck,
  UserPlus,
  SignalHigh,
  Users,
  Scale,
  ChartLine,
  Info,
  Wallet,
  Clock,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { getDashboard, getRanks, getMe, listSponsored, listPendingUsers, getProfile, updateProfileImage, uploadFile, fileUrl, getErrorMessage } from "@/services/api";
import { BASE_PATH } from "@/lib/api";
import type { UserDashboard, Rank, User } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const fmt2 = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmt = (v: number) => v.toLocaleString("tr-TR");

interface StatBlockProps {
  label: string;
  value: string;
  kalan?: string;
  kalanBoxes?: { leftLabel?: string; rightLabel?: string; left: string; right: string };
  progress?: number;
  steps?: { filled: number; total: number };
  icon: React.ReactNode;
  big?: boolean;
  info?: string;
  flipped?: boolean;
  onFlip?: () => void;
  onClick?: () => void;
}

// İstatistik kartı — köşeli (4px), düz, tıklanabilir, bilgi için çevrilebilir.
function StatBlock({ label, value, kalan, kalanBoxes, progress, steps, icon, big, info, flipped, onFlip, onClick }: StatBlockProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "border-border bg-card text-foreground relative h-full rounded border shadow-sm transition-shadow hover:shadow-md",
        onClick && "cursor-pointer"
      )}
      style={{ perspective: 1000 }}
    >
      <div
        className="relative h-full w-full transition-transform duration-600"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Ön yüz */}
        <div className="h-full" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
          <div className="relative flex min-h-[178px] flex-col p-2">
            {/* Bilgi butonu */}
            <div className="absolute top-3 right-3 z-[1] flex items-center justify-center">
              <button
                type="button"
                aria-label={`${label} hakkında bilgi`}
                onClick={(e) => {
                  e.stopPropagation();
                  onFlip?.();
                }}
                className="cursor-pointer border-none bg-transparent p-0"
              >
                <Info className="text-primary size-[28px] transition duration-200 hover:scale-115" />
              </button>
            </div>

            <div className="bg-secondary text-primary-dark mb-1 flex size-[38px] items-center justify-center rounded">
              {icon}
            </div>
            <p className="text-muted-foreground text-sm font-bold tracking-wide uppercase">
              {label.toLocaleUpperCase("tr-TR")}
            </p>
            <p
              className="text-primary-dark mt-0.5 font-extrabold leading-tight"
              style={{ fontSize: big ? "2.4rem" : "1.7rem" }}
            >
              {value}
            </p>

            {steps && (
              <div className="mt-auto flex items-center gap-0.5 pt-1">
                {Array.from({ length: steps.total }, (_, i) => {
                  const filled = i < steps.filled;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "h-2 flex-grow rounded transition-colors duration-300",
                        filled ? "bg-primary" : "bg-secondary-light"
                      )}
                    />
                  );
                })}
              </div>
            )}

            {kalanBoxes && (
              <div className="mt-auto flex gap-1 pt-1">
                {[
                  { label: kalanBoxes.leftLabel ?? "Sol Hat", value: kalanBoxes.left },
                  { label: kalanBoxes.rightLabel ?? "Sağ Hat", value: kalanBoxes.right },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="bg-primary flex flex-grow items-center justify-center gap-0.5 rounded px-0.75 py-0.1 text-center"
                  >
                    <span className="text-[10.5px] font-bold leading-tight text-white/85">{b.label}</span>
                    <span className="text-[12.5px] leading-tight font-extrabold text-white">{b.value}</span>
                  </div>
                ))}
              </div>
            )}

            {kalan && (
              <p className="text-muted-foreground mt-auto block pt-1 text-[13px] font-semibold">
                Kalan: {kalan}
              </p>
            )}

            {progress !== undefined && (
              <div className="mt-1">
                <div className="bg-secondary-light h-[7px] w-full overflow-hidden rounded">
                  <div
                    className="bg-primary h-full rounded transition-[width] duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Arka yüz (bilgi) */}
        {info && (
          <div
            className="bg-secondary-light text-primary-dark absolute inset-0 flex flex-col items-center justify-center gap-1 rounded p-2.5 text-center"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <Info className="size-[30px]" />
            <p className="text-lg font-extrabold">{value}</p>
            <p className="max-w-[220px] text-sm font-semibold">{info}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFlip?.();
              }}
              className="bg-background text-primary-dark mt-1 cursor-pointer rounded border border-primary px-2 py-0.75 text-[13px] font-bold hover:bg-secondary"
            >
              Geri Dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user: contextUser } = useAuth();
  const [me, setMe] = useState<User | null>(contextUser);
  const [data, setData] = useState<UserDashboard | null>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [sponsoredCount, setSponsoredCount] = useState(0);
  const [copied, setCopied] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const flip = (label: string) =>
    setFlippedCard((prev) => (prev === label ? null : label));

  const openPendingModal = () => {
    setPendingOpen(true);
    setPendingLoading(true);
    listPendingUsers()
      .then(setPendingUsers)
      .catch((err) => setMsg(getErrorMessage(err)))
      .finally(() => setPendingLoading(false));
  };

  const [error, setError] = useState("");

  const refresh = () => {
    Promise.all([getDashboard(), getMe(), listPendingUsers()])
      .then(([d, u, sp]) => {
        setData(d);
        setMe(u);
        setPendingCount(sp.length);
      })
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    Promise.all([getDashboard(), getRanks(), listSponsored(), listPendingUsers()])
      .then(([d, r, sp, pend]) => {
        setData(d);
        setRanks(r);
        setSponsoredCount(sp.length);
        setPendingCount(pend.length);
      })
      .catch((err) => setError(getErrorMessage(err)));

    getProfile()
      .then((p) => {
        const img = p.profile_image;
        if (typeof img === "string") setProfileImage(img);
      })
      .catch(() => {});

    // Anlık kazanç ve bakiyeler 5 sn'de bir + sayfa odaklanınca güncellenir.
    const id = setInterval(refresh, 5000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/10 text-destructive my-4 rounded border px-4 py-3 text-sm font-medium">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="text-primary size-10 animate-spin" />
      </div>
    );
  }

  const d = data;

  const currentRankId = me?.current_rank_id;
  const rankIndex = currentRankId != null ? ranks.findIndex((r) => r.id === currentRankId) : -1;

  const currentRankName = (d.user.rank || "GİRİŞİMCİ").toLocaleUpperCase("en-US");

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadFile(file);
      await updateProfileImage(path);
      setProfileImage(path);
      setMsg("Profil fotoğrafı güncellendi.");
    } catch {
      setMsg("Fotoğraf yüklenemedi.");
    } finally {
      setUploading(false);
    }
  };

  const copyText = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      setMsg("Kopyalanamadı.");
    }
  };

  const initials =
    (contextUser?.name ?? "?")
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toLocaleUpperCase("tr-TR") || "?";

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}${BASE_PATH}/register?ref=${me?.member_code ?? ""}`;

  return (
    <div className="w-full py-3">
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
        {/* Sol profil sidebar */}
        <div className="flex md:col-span-3">
          <div className="flex h-full w-full flex-col md:sticky md:top-24">
            <div className="border-border bg-card flex h-full w-full flex-col overflow-hidden rounded border">
              {/* Profil görseli — pastel zemin, hover'da kamera */}
              <div className="bg-secondary-light/60 group relative flex h-[210px] w-full shrink-0 items-center justify-center">
                {profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileUrl(profileImage) ?? ""}
                    alt={contextUser?.name ?? "Profil"}
                    className="block size-[140px] rounded-full border-4 border-background object-cover object-center shadow-sm transition-opacity group-hover:opacity-80"
                  />
                ) : (
                  <span className="bg-accent text-foreground flex size-[140px] items-center justify-center rounded-full border-4 border-background text-4xl font-extrabold shadow-sm">
                    {initials}
                  </span>
                )}
                <label
                  aria-label="Profil fotoğrafını değiştir"
                  className="absolute inset-0 flex cursor-pointer items-center justify-center"
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    hidden
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  />
                  <span className="bg-background/90 text-foreground flex size-11 items-center justify-center rounded-full shadow-lg opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                    {uploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
                  </span>
                </label>
              </div>

              {/* İçerik — isim soyisim, nötr */}
              <div className="flex flex-col items-center gap-1.5 p-3 pt-2.5 text-center">
                <h2 className="text-foreground text-xl leading-snug font-extrabold">
                  {contextUser?.name.toLocaleUpperCase("tr-TR")}
                </h2>

                <div className="border-border flex items-center gap-1 rounded border px-2 py-0.5">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 rounded-full",
                      me?.is_active ? "bg-[#2E7D32]" : "bg-destructive"
                    )}
                  />
                  <span className={cn("text-sm font-bold", me?.is_active ? "text-[#2E7D32]" : "text-destructive")}>
                    Aktif
                  </span>
                </div>

                <div className="mt-0.5 flex w-full flex-col gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(me?.member_code ?? "", "üye-id")}
                    className="text-foreground border-border w-full rounded normal-case hover:bg-accent"
                  >
                    Üye No: {me?.member_code}
                    <Copy className="size-3.5" />
                  </Button>
                  {d.user.rank && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push("/career")}
                      className="text-foreground border-border w-full rounded normal-case hover:bg-accent"
                    >
                      Rütbe: {d.user.rank}
                    </Button>
                  )}
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="text-primary border-primary w-full rounded normal-case font-bold hover:bg-primary/5"
                  >
                    <Link href="/success-report">
                      <BarChart3 className="size-4" />
                      Başarı Raporu
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Üye kayıt linki — alt */}
              <div className="mt-auto border-t border-border px-3 pt-2.5 pb-3">
                <p className="text-muted-foreground mb-1 block text-center text-[10px] font-bold tracking-[1.2px] uppercase">
                  Üye Kayıt Linkiniz
                </p>
                <div className="border-border flex items-center gap-1 rounded border px-1.5 py-1">
                  <LinkIcon className="text-muted-foreground size-4 shrink-0" />
                  <span className="text-muted-foreground font-mono text-xs flex-grow truncate">{referralLink}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(referralLink, "link")}
                    className="rounded px-2 text-[11px] normal-case"
                  >
                    <Copy className="size-3.5" />
                    {copied === "link" ? "Kopyalandı!" : "Kopyala"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* İstatistik blokları */}
        <div className="md:col-span-9">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            <StatBlock
              label="Ünvan"
              value={currentRankName}
              steps={{ filled: rankIndex + 1, total: 12 }}
              icon={<Medal />}
              info={`${currentRankName} — Sistemdeki en yüksek kariyer unvanınız.`}
              flipped={flippedCard === "Ünvan"}
              onFlip={() => flip("Ünvan")}
              onClick={() => router.push("/career")}
            />
            <StatBlock
              label="Güncel Kariyeriniz"
              value={currentRankName}
              icon={<BadgeCheck />}
              info="Bu ayki güncel kariyeriniz."
              flipped={flippedCard === "Güncel Kariyeriniz"}
              onFlip={() => flip("Güncel Kariyeriniz")}
              onClick={() => router.push("/career")}
            />
            <StatBlock
              label="Seviyeniz"
              value={d.user.package ? d.user.package.toLocaleUpperCase("tr-TR") : "BRONZ"}
              icon={<SignalHigh />}
              info="Kazanç oranlarınızı belirleyen paketiniz."
              flipped={flippedCard === "Seviyeniz"}
              onFlip={() => flip("Seviyeniz")}
            />
            <StatBlock
              label="Sponsor Olduklarım"
              value={String(sponsoredCount)}
              icon={<UserPlus />}
              info="Doğrudan kaydettiğiniz 1. hat üyeleriniz."
              flipped={flippedCard === "Sponsor Olduklarım"}
              onFlip={() => flip("Sponsor Olduklarım")}
              onClick={() => router.push("/sponsor-tree")}
            />
            <StatBlock
              label="Ekibim"
              value={`${fmt(d.left_team_count)} / ${fmt(d.right_team_count)}`}
              kalanBoxes={{
                leftLabel: "Sol Hat",
                rightLabel: "Sağ Hat",
                left: fmt(d.left_team_count),
                right: fmt(d.right_team_count),
              }}
              icon={<Users />}
              info="Binary ağacınızdaki toplam üye sayısı."
              flipped={flippedCard === "Ekibim"}
              onFlip={() => flip("Ekibim")}
              onClick={() => router.push("/tree")}
            />
            <StatBlock
              label="Anlık Eşleşme"
              value={`${fmt(d.monthly_matched_cv)} CV`}
              kalanBoxes={{
                leftLabel: "Sol Hat",
                rightLabel: "Sağ Hat",
                left: fmt(d.leg_cv_left_total),
                right: fmt(d.leg_cv_right_total),
              }}
              icon={<Scale />}
              info="Kısa kol ile eşleşen puanınız."
              flipped={flippedCard === "Anlık Eşleşme"}
              onFlip={() => flip("Anlık Eşleşme")}
              onClick={() => router.push("/binary-transactions")}
            />
            <StatBlock
              label="Kişisel Toplam Kazanç"
              value={`${fmt2(d.wallet.total_earned)} ₺`}
              icon={<ChartLine />}
              info="Sisteme katılımınızdan beri toplam kazancınız."
              flipped={flippedCard === "Kişisel Toplam Kazanç"}
              onFlip={() => flip("Kişisel Toplam Kazanç")}
              onClick={() => router.push("/commissions")}
            />
            <StatBlock
              label="Yerleşim Bekleyen"
              value={String(pendingCount)}
              icon={<Clock />}
              info="Ağaca yerleştirilmeyi bekleyen üyeler."
              flipped={flippedCard === "Yerleşim Bekleyen"}
              onFlip={() => flip("Yerleşim Bekleyen")}
              onClick={openPendingModal}
            />
            <StatBlock
              label="Anlık Kazanç"
              value={`${fmt2(d.monthly_earned)} ₺`}
              icon={<Wallet />}
              info="Bu cari dönemde oluşan güncel hakedişiniz."
              flipped={flippedCard === "Anlık Kazanç"}
              onFlip={() => flip("Anlık Kazanç")}
              onClick={() => router.push("/commissions?type=binary")}
            />
          </div>
        </div>
      </div>

      {/* Yerleşim bekleyenler modalı */}
      <Dialog open={pendingOpen} onOpenChange={setPendingOpen}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-primary-dark text-lg font-extrabold">
              Yerleşim Bekleyen Üyeler
            </DialogTitle>
            <button
              aria-label="Kapat"
              onClick={() => setPendingOpen(false)}
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 cursor-pointer items-center justify-center rounded transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
          {pendingLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="text-primary size-8 animate-spin" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">Yerleşim bekleyen üye yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead>
                  <tr className="bg-primary text-left text-white">
                    <th className="px-3 py-2 font-bold">Üye No</th>
                    <th className="px-3 py-2 font-bold">Ad Soyad</th>
                    <th className="px-3 py-2 font-bold">Kayıt Tarihi</th>
                    <th className="px-3 py-2 font-bold">Aktiflik Tarihi</th>
                    <th className="px-3 py-2 text-center font-bold">Ağaca Yerleştir</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((u) => (
                    <tr key={u.id} className="border-border hover:bg-accent/40 border-b transition-colors">
                      <td className="px-3 py-2 font-bold">{u.member_code}</td>
                      <td className="px-3 py-2">{u.name}</td>
                      <td className="px-3 py-2">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {u.pending_since
                          ? new Date(u.pending_since).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          size="sm"
                          onClick={() => {
                            setPendingOpen(false);
                            router.push("/tree");
                          }}
                        >
                          Ağaca Yerleştir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bildirim */}
      {msg && (
        <div className="fixed bottom-5 left-1/2 z-[1400] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="bg-foreground text-background flex items-center gap-2 rounded px-4 py-3 text-sm font-semibold shadow-lg">
            <CheckCircle2 className="size-5 shrink-0" />
            <span className="flex-1">{msg}</span>
            <button
              aria-label="Kapat"
              className="cursor-pointer text-lg leading-none opacity-70 hover:opacity-100"
              onClick={() => setMsg("")}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
