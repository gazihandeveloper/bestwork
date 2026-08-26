"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import Avatar from "@mui/material/Avatar";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import ZoomOutRoundedIcon from "@mui/icons-material/ZoomOutRounded";
import FitScreenRoundedIcon from "@mui/icons-material/FitScreenRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded";
import { useTheme, type Theme } from "@mui/material/styles";
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

/** deriveTreeColors karta uygulanan renkleri MUI temasından türetir (tema değişince renkler de değişir). */
function deriveTreeColors(theme: Theme): TreeColors {
  const p = theme.palette;
  const primary = p.primary.main;
  const secondary = p.secondary.main;
  return {
    root: p.primary.dark,
    left: primary,
    right: secondary,
    text: p.text.primary,
    subtext: p.text.secondary,
    card: p.background.paper,
    divider: "#E3E2E5",
    placeholder: p.text.secondary,
    statusActive: (p.success as { main: string }).main,
    statusPassive: (p.error as { main: string }).main,
    legLeft: primary,
    legRight: secondary,
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
  const theme = useTheme();
  const treeColors = useMemo(() => deriveTreeColors(theme), [theme]);

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

  return (
    <Box
      ref={wrapRef}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2.1,
        overflow: "hidden",
        bgcolor: "#FFFFFF",
        backgroundImage: "radial-gradient(circle, rgba(39,77,36,0.07) 1.2px, transparent 1.2px)",
        backgroundSize: "15px 15px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: { xs: 640, md: 740 },
      }}
    >
      {/* Tek satırlık kompakt kontrol çubuğu */}
      <Box sx={{ p: 1.25, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
          <Select
            size="small"
            value={period}
            onChange={(e) => onPeriodChange?.(e.target.value as string)}
            aria-label="Dönem"
            sx={{ minWidth: 104 }}
          >
            {periodOptions(minMonth).map((v) => (
              <MenuItem key={v} value={v}>
                {v}
              </MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            placeholder="Üye ara (TR90 kodu girin)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            sx={{ width: { xs: 150, sm: 240 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Chip size="small" label="Kök" sx={{ bgcolor: treeColors.root, color: "#fff", height: 22, fontSize: 11, fontWeight: 700 }} />
            <Chip size="small" label="Sol" sx={{ bgcolor: treeColors.left, color: "#fff", height: 22, fontSize: 11, fontWeight: 700 }} />
            <Chip size="small" label="Sağ" sx={{ bgcolor: treeColors.right, color: "#fff", height: 22, fontSize: 11, fontWeight: 700 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton size="small" title="Tümünü aç" aria-label="Tümünü aç" onClick={() => toggleAll(false)}>
            <UnfoldMoreRoundedIcon />
          </IconButton>
          <IconButton size="small" title="Tümünü kapat" aria-label="Tümünü kapat" onClick={() => toggleAll(true)}>
            <UnfoldLessRoundedIcon />
          </IconButton>
          <IconButton size="small" title="Yaklaş" aria-label="Yaklaş" onClick={() => rendererRef.current?.zoomBy(1.3)}>
            <ZoomInRoundedIcon />
          </IconButton>
          <IconButton size="small" title="Uzaklaş" aria-label="Uzaklaş" onClick={() => rendererRef.current?.zoomBy(0.77)}>
            <ZoomOutRoundedIcon />
          </IconButton>
          <IconButton size="small" title="Sığdır" aria-label="Sığdır" onClick={() => rendererRef.current?.fit()}>
            <FitScreenRoundedIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Ağaç alanı */}
      <Box sx={{ flexGrow: 1, position: "relative", minHeight: 0 }}>
        <svg
          ref={svgRef}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
        />
      </Box>

      {/* Boş bacağa kodla yerleştirme */}
      <Dialog open={!!placeTarget} onClose={() => setPlaceTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800 }}>
          <PersonAddAltRoundedIcon sx={{ color: "primary.main" }} />
          {placeTarget?.position === "L" ? "Sol" : "Sağ"} Hatta Üye Yerleştir
          <Box sx={{ flexGrow: 1 }} />
          <IconButton size="small" aria-label="Kapat" onClick={() => setPlaceTarget(null)}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Bu boş bacağa yerleştirilecek üyeyi listeden seçin.
            (Alışveriş yapmamış üyeler yerleştirilemez.)
          </Typography>

          {placeError && !pendingLoading && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {placeError}
            </Alert>
          )}

          {pendingLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : pendingUsers.length === 0 && !placeError ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              Yerleşim bekleyen üyeniz yok.
            </Typography>
          ) : (
            <List dense sx={{ maxHeight: 260, overflow: "auto" }}>
              {pendingUsers.map((u) => (
                <ListItemButton
                  key={u.id}
                  selected={selectedUserId === u.id}
                  onClick={() => {
                    setSelectedUserId(u.id);
                    setPlaceError("");
                  }}
                  sx={{ borderRadius: 1.4 }}
                >
                  <ListItemText
                    primary={u.name}
                    secondary={`${u.member_code} · ${u.is_active ? "Aktif" : "Pasif"}`}
                  />
                </ListItemButton>
              ))}
            </List>
          )}

          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 2 }}
            disabled={placing || pendingLoading || selectedUserId === null}
            onClick={handlePlaceSubmit}
          >
            {placing ? <CircularProgress size={22} color="inherit" /> : "Yerleştir"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* "i" — üye bilgi modalı */}
      <Dialog open={!!infoNode} onClose={() => setInfoNode(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
          {infoNode && (
            <>
              <Avatar
                src={infoNode.imagePath ? fileUrl(infoNode.imagePath) ?? undefined : undefined}
                sx={{ bgcolor: "primary.main", width: 46, height: 46, fontSize: 19, fontWeight: 800 }}
              >
                {(infoNode.name.charAt(0) || "?").toLocaleUpperCase("tr-TR")}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {infoNode.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {infoNode.memberCode}
                </Typography>
              </Box>
            </>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <IconButton size="small" aria-label="Kapat" onClick={() => setInfoNode(null)}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {infoLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : infoError ? (
            <Alert severity="error">{infoError}</Alert>
          ) : infoCard ? (
            <MemberInfoTable card={infoCard} />
          ) : null}
        </DialogContent>
      </Dialog>

      <Snackbar open={!!successMsg} autoHideDuration={4000} onClose={() => setSuccessMsg("")}>
        <Alert severity="success" onClose={() => setSuccessMsg("")}>
          {successMsg}
        </Alert>
      </Snackbar>

      <Snackbar open={!!loadError} autoHideDuration={4000} onClose={() => setLoadError("")}>
        <Alert severity="error" onClose={() => setLoadError("")}>
          {loadError}
        </Alert>
      </Snackbar>
    </Box>
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
  const rank = (card.rank ?? "GİRİŞİMCİ").toLocaleUpperCase("en-US");

  const pair = (k1: string, v1: string, k2: string, v2: string) => (
    <TableRow>
      <TableCell component="th" scope="row" sx={{ color: "text.secondary", fontWeight: 700, width: "15%" }}>
        {k1}
      </TableCell>
      <TableCell align="right" sx={{ fontWeight: 800, width: "35%" }}>
        {v1}
      </TableCell>
      <TableCell component="th" scope="row" sx={{ color: "text.secondary", fontWeight: 700, width: "15%" }}>
        {k2}
      </TableCell>
      <TableCell align="right" sx={{ fontWeight: 800, width: "35%" }}>
        {v2}
      </TableCell>
    </TableRow>
  );

  const full = (k: string, v: string) => (
    <TableRow>
      <TableCell component="th" scope="row" sx={{ color: "text.secondary", fontWeight: 700, width: "15%" }}>
        {k}
      </TableCell>
      <TableCell colSpan={3} align="right" sx={{ fontWeight: 800 }}>
        {v}
      </TableCell>
    </TableRow>
  );

  return (
    <Box>
      {/* Rozetler: rütbe · durum · paket */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: 1.5 }}>
        <Chip size="small" label={rank} sx={{ bgcolor: "primary.main", color: "#fff", fontWeight: 800 }} />
        <Chip
          size="small"
          label={card.is_active ? "AKTİF" : "PASİF"}
          sx={
            card.is_active
              ? { bgcolor: "#E3F3E8", color: "#1B7A3D", fontWeight: 800 }
              : { bgcolor: "#FBE7E7", color: "#C62828", fontWeight: 800 }
          }
        />
        {card.package ? (
          <Chip size="small" variant="outlined" label={card.package.toLocaleUpperCase("tr-TR")} sx={{ fontWeight: 700 }} />
        ) : null}
      </Stack>

      {/* Bacak dağılımı */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "center", justifyContent: "center", py: 1.25, mb: 2, borderRadius: 1.4, bgcolor: "action.hover" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: "#2E7D32" }} />
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            SOL %{pctL}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          |
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Zayıf bacak:{" "}
          <Box component="span" sx={{ fontWeight: 800, color: "text.primary" }}>
            {weak}
          </Box>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          |
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: "#B4552D" }} />
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            SAĞ %{pctR}
          </Typography>
        </Box>
      </Stack>

      <Table
        size="small"
        sx={{ "& .MuiTableCell-root": { borderBottom: "1px solid", borderColor: "divider", py: 1.1 } }}
      >
        <TableBody>
          {pair("SOL.CV", fmt(card.total_cv_left), "SAĞ.CV", fmt(card.total_cv_right))}
          {pair("KİŞ.", tl(card.wallet_balance), "EK.C.", tl(card.chip_balance))}
          {pair("SOL.EK", fmt(card.left_team_count), "SAĞ.EK", fmt(card.right_team_count))}
          {pair("SOL.PV", fmt(card.total_pv_left), "SAĞ.PV", fmt(card.total_pv_right))}
          {full("ALT EKİP", fmt(card.total_team_count))}
          {full("KARİYER", rank)}
          {full("SPONSOR", card.sponsor_name ?? "—")}
        </TableBody>
      </Table>
    </Box>
  );
}
