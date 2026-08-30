"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import {
  fileUrl,
  getTree,
  getUserCard,
  getErrorMessage,
  placePendingByCode,
  listPendingUsers,
  lookupUserByCode,
  type UserInfoCard,
} from "@/services/api";
import type { TreeNode, User } from "@/services/api";
import { BinaryTreeRenderer } from "./renderer";
import { ANIM_MS, LAZY_DEPTH, graftChildren, setCollapsedBelowRoot, toBTNode, type BTNode, type TreeColors } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** TreeColors'u Tailwind/CSS değişkenlerinden türetir (tema değişince renkler de değişir). */
function deriveTreeColors(): TreeColors {
  const cssVar = (name: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };
  return {
    root: cssVar("--primary-dark", "#355310"),
    left: cssVar("--primary", "#476F16"),
    right: cssVar("--secondary", "#B5C5A2"),
    text: cssVar("--foreground", "#1F1F1F"),
    subtext: cssVar("--muted-foreground", "#625D63"),
    card: cssVar("--card", "#FFFFFF"),
    divider: "#E3E2E5",
    placeholder: cssVar("--muted-foreground", "#625D63"),
    statusActive: "#2E7D32",
    statusPassive: "#D3381F",
    legLeft: cssVar("--primary", "#476F16"),
    legRight: cssVar("--secondary", "#B5C5A2"),
  };
}

interface BinaryTreeProps {
  data: TreeNode;
  depth: number;
  /** "YYYY-MM" biçiminde as-of dönemi; bu aydan önce kayıt olanlar gösterilir. */
  period?: string;
  onPeriodChange?: (p: string) => void;
  /** Sistemdeki en eski üye kayıt ayı ("YYYY-MM") — dönem listesi buradan başlar. */
  minMonth?: string;
}

/** currentMonth geçerli ayı "YYYY-MM" biçiminde verir. */
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** periodOptions minMonth'tan bugüne kadar olan ayları üretir (sıralı, eskiden yeniye). */
function periodOptions(minMonth: string): string[] {
  const arr: string[] = [];
  const end = new Date();
  const start = /^\d{4}-\d{2}$/.test(minMonth) ? minMonth : currentMonth();
  let y = parseInt(start.slice(0, 4), 10);
  let m = parseInt(start.slice(5, 7), 10);
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth() + 1)) {
    arr.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return arr;
}

/**
 * BinaryTree — d3 tabanlı binary ağaç görünümü.
 * Sahne bir kez kurulur, tıklamalarda yalnızca değişen kısımlar güncellenir;
 * derinlik sınırındaki düğümler "+" rozeti ile sunucudan tembel yüklenir.
 */
export default function BinaryTree({ data, depth, period = "", onPeriodChange, minMonth = "" }: BinaryTreeProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rendererRef = useRef<BinaryTreeRenderer | null>(null);
  const rootRef = useRef<BTNode | null>(null);
  const [colorsVersion, setColorsVersion] = useState(0);
  const treeColors = useMemo(() => deriveTreeColors(), [colorsVersion]);

  // Tema değişince renkleri tazele (dark class togglenince)
  useEffect(() => {
    const observer = new MutationObserver(() => setColorsVersion((v) => v + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [placeTarget, setPlaceTarget] = useState<{ parentId: number; position: "L" | "R" } | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  // "i" bilgi modalı
  const [infoNode, setInfoNode] = useState<BTNode | null>(null);
  const [infoCard, setInfoCard] = useState<UserInfoCard | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState("");

  const handleNodeClick = useCallback(
    (node: BTNode) => {
      const renderer = rendererRef.current;
      const root = rootRef.current;
      if (!renderer || !root || node.placeholder || node.loading) return;

      if (node.boundary) {
        // Derinlik sınırı: alt ağacı sunucudan getirip mevcut ağaca aşıla
        node.loading = true;
        renderer.render(root, node.id);
        getTree(node.userId, LAZY_DEPTH, period)
          .then((res) => {
            graftChildren(node, res.tree, LAZY_DEPTH);
            renderer.render(root, node.id);
          })
          .catch((err) => {
            node.loading = false;
            renderer.render(root, node.id);
            setLoadError(getErrorMessage(err));
          });
        return;
      }

      if (node.children.length === 0) return;
      node.collapsed = !node.collapsed;
      renderer.render(root, node.id);
    },
    [],
  );

  // Boş bacağa tıklanınca yerleşim bekleyenler listesini çeker ve diyaloğu açar.
  const openPlaceDialog = useCallback((parentId: number, position: "L" | "R") => {
    setPlaceError("");
    setSelectedUserId(null);
    setPendingUsers([]);
    setPendingLoading(true);
    setPlaceTarget({ parentId, position });
    listPendingUsers()
      .then((users) => setPendingUsers(users))
      .catch((err) => setPlaceError(getErrorMessage(err)))
      .finally(() => setPendingLoading(false));
  }, []);

  // "i" bilgi düğmesi: üye detay kartını çeker ve modalı açar.
  const handleInfoClick = useCallback((node: BTNode) => {
    setInfoNode(node);
    setInfoCard(null);
    setInfoError("");
    setInfoLoading(true);
    getUserCard(node.userId)
      .then(setInfoCard)
      .catch((err) => setInfoError(getErrorMessage(err)))
      .finally(() => setInfoLoading(false));
  }, []);

  // Sahne kurulumu — yalnızca bir kez
  useEffect(() => {
    const svgEl = svgRef.current;
    const wrapEl = wrapRef.current;
    if (!svgEl || !wrapEl) return;

    const renderer = new BinaryTreeRenderer(
      svgEl,
      {
        onNodeClick: handleNodeClick,
        onHover: () => {},
        onHoverMove: () => {},
        onHoverEnd: () => {},
        onPlaceholderClick: openPlaceDialog,
        onInfoClick: handleInfoClick,
        // Otomatik sonsuz kaydırma kapatıldı; derinlik yalnızca "+" rozetiyle açılır
        onReachBottom: () => {},
      },
      () => {
        const area = svgEl.parentElement ?? wrapEl;
        return { w: area.clientWidth, h: area.clientHeight };
      },
      treeColors,
    );
    rendererRef.current = renderer;

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [handleNodeClick, openPlaceDialog, handleInfoClick, treeColors]);

  // Veri değişince ağacı kur ve sığdır
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    rootRef.current = toBTNode(data, depth);
    renderer.render(rootRef.current);
    // Kart animasyonu bittikten sonra sığdır; böylece ilk açılışta tam dolar
    const t = setTimeout(() => renderer.fit(false), ANIM_MS + 80);
    return () => clearTimeout(t);
  }, [data, depth]);

  // Arama: vurgula ve ilk eşleşmeye odaklan
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const timer = setTimeout(() => {
      const firstId = renderer.highlight(search);
      if (firstId) renderer.focusOn(firstId);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const handlePlaceSubmit = async () => {
    if (!placeTarget) return;
    const user = pendingUsers.find((u) => u.id === selectedUserId);
    if (!user) {
      setPlaceError("Yerleştirilecek üyeyi seçin.");
      return;
    }
    setPlacing(true);
    setPlaceError("");
    try {
      const placed = await placePendingByCode(user.member_code, placeTarget.parentId, placeTarget.position);
      setSuccessMsg(`${placed.name} (${placed.member_code}) ${placeTarget.position === "L" ? "sol" : "sağ"} hatta yerleştirildi.`);
      setPlaceTarget(null);
      // Ağacı yenile (gezinilen kökse onu tazele)
      const currentRootId = rootRef.current?.userId ?? data.user_id;
      const fetched = (await getTree(currentRootId, depth, period)).tree;
      rootRef.current = toBTNode(fetched, depth);
      rendererRef.current?.render(rootRef.current);
      requestAnimationFrame(() => rendererRef.current?.fit());
    } catch (err) {
      setPlaceError(getErrorMessage(err));
    } finally {
      setPlacing(false);
    }
  };

  const toggleAll = (collapsed: boolean) => {
    const renderer = rendererRef.current;
    const root = rootRef.current;
    if (!renderer || !root) return;
    // keepDepth=1: "Tümünü Kapat" kök + 2 seviyeyi (7 kişi) görünür bırakır
    setCollapsedBelowRoot(root, collapsed, 1);
    renderer.render(root);
    requestAnimationFrame(() => renderer.fit());
  };

  // Arama kutusunda Enter: üye kodu (TR90xxxxxx) yazıldıysa o üyeye git ve
  // altındaki 7 kişiyi (2 seviye) getir. Yüklü ağaçta varsa sadece odaklan.
  const handleSearchKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const q = search.trim();
    if (!q) return;
    if (/^TR90[0-9]{6}$/i.test(q)) {
      const renderer = rendererRef.current;
      if (!renderer) return;
      const firstId = renderer.highlight(q.toUpperCase());
      if (firstId) {
        renderer.focusOn(firstId);
        return;
      }
      try {
        const u = await lookupUserByCode(q.toUpperCase());
        const fetched = (await getTree(u.id, 2, period)).tree;
        rootRef.current = toBTNode(fetched, 2);
        renderer.render(rootRef.current);
        requestAnimationFrame(() => renderer.fit());
      } catch (err) {
        setLoadError(getErrorMessage(err));
      }
    }
  };

  const iconBtn =
    "text-muted-foreground hover:bg-accent hover:text-foreground flex size-11 cursor-pointer items-center justify-center rounded transition-colors";

  return (
    <div
      ref={wrapRef}
      className="border-border relative flex h-[640px] flex-col overflow-hidden rounded border bg-[#FFFFFF] md:h-[740px]"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(39,77,36,0.07) 1.2px, transparent 1.2px)",
        backgroundSize: "15px 15px",
      }}
    >
      {/* Tek satırlık kompakt kontrol çubuğu */}
      <div className="border-border flex flex-wrap items-center gap-1 border-b bg-background p-1.25">
        <Select
          value={period}
          onChange={(e) => onPeriodChange?.(e.target.value)}
          aria-label="Dönem"
          className="h-9 min-w-[104px]"
        >
          {periodOptions(minMonth).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
        <div className="relative">
          <MaterialIcon name="Search" className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Üye ara (TR90 kodu)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="h-9 w-[150px] pl-8 sm:w-[240px]"
          />
        </div>
        <div className="flex items-center gap-0.5">
          <Badge className="bg-[#355310] h-[22px] px-2 text-[11px] text-white">Kök</Badge>
          <Badge className="bg-primary h-[22px] px-2 text-[11px] text-white">Sol</Badge>
          <Badge className="bg-secondary text-secondary-foreground h-[22px] px-2 text-[11px]">Sağ</Badge>
        </div>
        <div className="flex-1" />
        <button type="button" title="Tümünü aç" aria-label="Tümünü aç" className={iconBtn} onClick={() => toggleAll(false)}>
          <MaterialIcon name="unfold_more" className="size-5" />
        </button>
        <button type="button" title="Tümünü kapat" aria-label="Tümünü kapat" className={iconBtn} onClick={() => toggleAll(true)}>
          <MaterialIcon name="unfold_less" className="size-5" />
        </button>
        <button type="button" title="Yaklaş" aria-label="Yaklaş" className={iconBtn} onClick={() => rendererRef.current?.zoomBy(1.3)}>
          <MaterialIcon name="zoom_in" className="size-5" />
        </button>
        <button type="button" title="Uzaklaş" aria-label="Uzaklaş" className={iconBtn} onClick={() => rendererRef.current?.zoomBy(0.77)}>
          <MaterialIcon name="zoom_out" className="size-5" />
        </button>
        <button type="button" title="Sığdır" aria-label="Sığdır" className={iconBtn} onClick={() => rendererRef.current?.fit()}>
          <MaterialIcon name="fit_screen" className="size-5" />
        </button>
      </div>

      {/* Ağaç alanı */}
      <div className="relative min-h-0 flex-1">
        <svg
          ref={svgRef}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
        />
      </div>

      {/* Boş bacağa kodla yerleştirme */}
      <Dialog open={!!placeTarget} onOpenChange={(o) => !o && setPlaceTarget(null)}>
        <DialogContent className="max-w-xs">
          <DialogTitle className="flex items-center gap-1 text-lg font-extrabold">
            <MaterialIcon name="UserPlus" className="text-primary size-5" />
            {placeTarget?.position === "L" ? "Sol" : "Sağ"} Hatta Üye Yerleştir
            <div className="flex-1" />
            <button
              type="button"
              aria-label="Kapat"
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 cursor-pointer items-center justify-center rounded transition-colors"
              onClick={() => setPlaceTarget(null)}
            >
              <MaterialIcon name="X" className="size-4" />
            </button>
          </DialogTitle>
          <p className="text-muted-foreground mb-1.5 text-sm">
            Bu boş bacağa yerleştirilecek üyeyi listeden seçin.
            (Alışveriş yapmamış üyeler yerleştirilemez.)
          </p>

          {placeError && !pendingLoading && (
            <div className="border-destructive/50 bg-destructive/10 text-destructive mb-1.5 rounded border px-3 py-2 text-sm font-medium">
              {placeError}
            </div>
          )}

          {pendingLoading ? (
            <div className="flex justify-center py-4">
              <MaterialIcon name="Loader2" className="text-primary size-7 animate-spin" />
            </div>
          ) : pendingUsers.length === 0 && !placeError ? (
            <p className="text-muted-foreground py-3 text-center text-sm">
              Yerleşim bekleyen üyeniz yok.
            </p>
          ) : (
            <div className="max-h-[260px] overflow-auto">
              {pendingUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(u.id);
                    setPlaceError("");
                  }}
                  className={cn(
                    "flex w-full cursor-pointer flex-col items-start rounded px-3 py-2 text-left transition-colors",
                    selectedUserId === u.id ? "bg-primary/10 text-primary" : "hover:bg-accent"
                  )}
                >
                  <span className="text-sm font-semibold">{u.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {u.member_code} · {u.is_active ? "Aktif" : "Pasif"}
                  </span>
                </button>
              ))}
            </div>
          )}

          <Button
            className="mt-2 w-full"
            disabled={placing || pendingLoading || selectedUserId === null}
            onClick={handlePlaceSubmit}
          >
            {placing ? <MaterialIcon name="Loader2" className="size-5 animate-spin" /> : "Yerleştir"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* "i" — üye bilgi modalı */}
      <Dialog open={!!infoNode} onOpenChange={(o) => !o && setInfoNode(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="flex items-center gap-1.5 pb-1">
            {infoNode && (
              <>
                <span className="bg-primary flex size-[46px] items-center justify-center rounded text-[19px] font-extrabold text-white">
                  {infoNode.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fileUrl(infoNode.imagePath) ?? ""}
                      alt=""
                      className="size-full rounded object-cover"
                    />
                  ) : (
                    (infoNode.name.charAt(0) || "?").toLocaleUpperCase("tr-TR")
                  )}
                </span>
                <span>
                  <span className="block text-lg leading-tight font-extrabold">{infoNode.name}</span>
                  <span className="text-muted-foreground text-xs font-bold">{infoNode.memberCode}</span>
                </span>
              </>
            )}
            <div className="flex-1" />
            <button
              type="button"
              aria-label="Kapat"
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 cursor-pointer items-center justify-center rounded transition-colors"
              onClick={() => setInfoNode(null)}
            >
              <MaterialIcon name="X" className="size-4" />
            </button>
          </DialogTitle>
          <div className="border-border border-t pt-3">
            {infoLoading ? (
              <div className="flex justify-center py-6">
                <MaterialIcon name="Loader2" className="text-primary size-8 animate-spin" />
              </div>
            ) : infoError ? (
              <div className="border-destructive/50 bg-destructive/10 text-destructive rounded border px-3 py-2 text-sm font-medium">
                {infoError}
              </div>
            ) : infoCard ? (
              <MemberInfoTable card={infoCard} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bildirimler */}
      {successMsg && (
        <Toast msg={successMsg} onClose={() => setSuccessMsg("")} type="success" />
      )}
      {loadError && (
        <Toast msg={loadError} onClose={() => setLoadError("")} type="error" />
      )}
    </div>
  );
}

function Toast({ msg, onClose, type }: { msg: string; onClose: () => void; type: "success" | "error" }) {
  return (
    <div className="fixed bottom-5 left-1/2 z-[1400] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div
        className={cn(
          "flex items-center gap-2 rounded px-4 py-3 text-sm font-semibold shadow-lg",
          type === "success" ? "bg-foreground text-background" : "bg-destructive text-white"
        )}
      >
        {type === "success" ? (
          <MaterialIcon name="check_circle" className="size-5 shrink-0" />
        ) : (
          <MaterialIcon name="error" className="size-5 shrink-0" />
        )}
        <span className="flex-1">{msg}</span>
        <button
          type="button"
          aria-label="Kapat"
          className="cursor-pointer text-lg leading-none opacity-70 hover:opacity-100"
          onClick={onClose}
        >
          <MaterialIcon name="X" className="size-4" />
        </button>
      </div>
    </div>
  );
}

const nfInt = new Intl.NumberFormat("tr-TR");
const nfMoney = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

/** Üye bilgi modalının "güzel tablo" içeriği. */
function MemberInfoTable({ card }: { card: UserInfoCard }) {
  const fmt = (v: number) => nfInt.format(v);
  const tl = (v: number) => `₺${nfMoney.format(v)}`;

  const pvTotal = card.total_pv_left + card.total_pv_right;
  const pctL = pvTotal > 0 ? Math.round((card.total_pv_left / pvTotal) * 100) : 100;
  const pctR = 100 - pctL;
  const weak =
    card.total_pv_left < card.total_pv_right
      ? "SOL"
      : card.total_pv_right < card.total_pv_left
        ? "SAĞ"
        : "EŞİT";
  // Rütbe kısaltması: 12 karakterden uzun rütbeler ilk 12 harf + "." olur
  const fullRank = (card.rank ?? "GİRİŞİMCİ").toLocaleUpperCase("en-US");
  const rank = fullRank.length > 12 ? `${fullRank.slice(0, 12)}.` : fullRank;

  const pair = (k1: string, v1: string, k2: string, v2: string) => (
    <tr className="border-border border-b">
      <th scope="row" className="text-muted-foreground w-[15%] py-1.1 text-left text-xs font-bold">
        {k1}
      </th>
      <td className="w-[35%] py-1.1 text-right text-xs font-extrabold">{v1}</td>
      <th scope="row" className="text-muted-foreground w-[15%] py-1.1 text-left text-xs font-bold">
        {k2}
      </th>
      <td className="w-[35%] py-1.1 text-right text-xs font-extrabold">{v2}</td>
    </tr>
  );

  const full = (k: string, v: string) => (
    <tr className="border-border border-b">
      <th scope="row" className="text-muted-foreground w-[15%] py-1.1 text-left text-xs font-bold">
        {k}
      </th>
      <td colSpan={3} className="py-1.1 text-right text-xs font-extrabold">
        {v}
      </td>
    </tr>
  );

  return (
    <div>
      {/* Rozetler: rütbe · durum · paket */}
      <div className="mb-1.5 flex flex-wrap gap-1">
        <Badge className="bg-primary text-white font-extrabold">{rank}</Badge>
        <Badge
          className={cn(
            "font-extrabold",
            card.is_active ? "bg-[#E3F3E8] text-[#1B7A3D]" : "bg-[#FBE7E7] text-[#C62828]"
          )}
        >
          {card.is_active ? "AKTİF" : "PASİF"}
        </Badge>
        {card.package ? (
          <Badge variant="outline" className="border-border font-bold">
            {card.package.toLocaleUpperCase("tr-TR")}
          </Badge>
        ) : null}
      </div>

      {/* Bacak dağılımı */}
      <div className="bg-accent/50 mb-2 flex items-center justify-center gap-1.5 rounded py-1.25">
        <span className="flex items-center gap-0.5">
          <span className="bg-[#2E7D32] size-2.5 rounded-full" />
          <span className="text-sm font-extrabold">SOL %{pctL}</span>
        </span>
        <span className="text-muted-foreground text-sm">|</span>
        <span className="text-muted-foreground text-sm">
          Zayıf bacak: <span className="text-foreground font-extrabold">{weak}</span>
        </span>
        <span className="text-muted-foreground text-sm">|</span>
        <span className="flex items-center gap-0.5">
          <span className="bg-[#B4552D] size-2.5 rounded-full" />
          <span className="text-sm font-extrabold">SAĞ %{pctR}</span>
        </span>
      </div>

      <table className="w-full text-sm">
        <tbody>
          {pair("SOL.CV", fmt(card.total_cv_left), "SAĞ.CV", fmt(card.total_cv_right))}
          {pair("KİŞ.", tl(card.wallet_balance), "EK.C.", tl(card.chip_balance))}
          {pair("SOL.EK", fmt(card.left_team_count), "SAĞ.EK", fmt(card.right_team_count))}
          {pair("SOL.PV", fmt(card.total_pv_left), "SAĞ.PV", fmt(card.total_pv_right))}
          {full("ALT EKİP", fmt(card.total_team_count))}
          {full("KARİYER", rank)}
          {full("SPONSOR", card.sponsor_name ?? "—")}
        </tbody>
      </table>
    </div>
  );
}
