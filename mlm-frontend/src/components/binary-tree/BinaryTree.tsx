"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
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
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import ZoomOutRoundedIcon from "@mui/icons-material/ZoomOutRounded";
import FitScreenRoundedIcon from "@mui/icons-material/FitScreenRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import UnfoldLessRoundedIcon from "@mui/icons-material/UnfoldLessRounded";
import { useTheme } from "@mui/material/styles";
import { fileUrl, getTree, getErrorMessage, placePendingByCode, listPendingUsers } from "@/services/api";
import type { TreeNode, User } from "@/services/api";
import { BinaryTreeRenderer } from "./renderer";
import { ANIM_MS, LAZY_DEPTH, graftChildren, setCollapsedBelowRoot, toBTNode, type BTNode } from "./types";

interface BinaryTreeProps {
  data: TreeNode;
  depth: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * BinaryTree — d3 tabanlı binary ağaç görünümü.
 * Sahne bir kez kurulur, tıklamalarda yalnızca değişen kısımlar güncellenir;
 * derinlik sınırındaki düğümler "+" rozeti ile sunucudan tembel yüklenir.
 */
export default function BinaryTree({ data, depth }: BinaryTreeProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<BinaryTreeRenderer | null>(null);
  const rootRef = useRef<BTNode | null>(null);
  const loadingRef = useRef(false);
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";

  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [placeTarget, setPlaceTarget] = useState<{ parentId: number; position: "L" | "R" } | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [showMoreLoading, setShowMoreLoading] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const showMoreRef = useRef(false);

  const showTooltip = useCallback((event: MouseEvent, node: BTNode) => {
    const el = tooltipRef.current;
    if (!el || node.placeholder) return;
    const img = fileUrl(node.imagePath);
    el.innerHTML = `
      ${img ? `<img src="${escapeHtml(img)}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 6px;">` : ""}
      <div style="font-weight:800">${escapeHtml(node.name)}</div>
      <div style="color:#A5D6A7;font-size:11px">#${escapeHtml(node.memberCode)}</div>
      <div style="margin-top:6px;font-size:11px">Hat: ${node.position === "L" ? "Sol" : node.position === "R" ? "Sağ" : "Kök"}</div>
      <div style="font-size:11px">Ünvan: ${escapeHtml(node.rank || "GİRİŞİMCİ")}</div>
      <div style="font-size:11px">Paket: ${escapeHtml(node.packageName || "-")}</div>
      <div style="font-size:11px">${node.pv.toLocaleString("tr-TR")} PV · ${node.cv.toLocaleString("tr-TR")} CV</div>
      ${node.boundary ? '<div style="margin-top:4px;font-size:10.5px;color:#FFCC80">Alt ekibi görmek için tıklayın</div>' : ""}`;
    el.style.display = "block";
    el.style.left = `${event.clientX + 14}px`;
    el.style.top = `${event.clientY + 14}px`;
  }, []);

  const moveTooltip = useCallback((event: MouseEvent) => {
    const el = tooltipRef.current;
    if (el && el.style.display === "block") {
      el.style.left = `${event.clientX + 14}px`;
      el.style.top = `${event.clientY + 14}px`;
    }
  }, []);

  const hideTooltip = useCallback(() => {
    const el = tooltipRef.current;
    if (el) el.style.display = "none";
  }, []);

  const handleNodeClick = useCallback(
    (node: BTNode) => {
      const renderer = rendererRef.current;
      const root = rootRef.current;
      if (!renderer || !root || node.placeholder || node.loading) return;

      if (node.boundary) {
        // Derinlik sınırı: alt ağacı sunucudan getirip mevcut ağaca aşıla
        node.loading = true;
        renderer.render(root, node.id);
        getTree(node.userId, LAZY_DEPTH)
          .then((fetched) => {
            graftChildren(node, fetched, LAZY_DEPTH);
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

  // Aşağı doğru kaydırınca en derin yüklü seviyeye ulaşıldığında sonraki nesli
  // tembel yükler (infinite scroll). Bir seferde en fazla 12 sınır düğümü açılır.
  const loadNextGeneration = useCallback(() => {
    const renderer = rendererRef.current;
    const root = rootRef.current;
    if (!renderer || !root || loadingRef.current) return;

    const boundary: BTNode[] = [];
    const walk = (n: BTNode) => {
      if (n.placeholder) return;
      if (n.boundary) {
        boundary.push(n);
        return;
      }
      n.children.forEach(walk);
    };
    walk(root);
    if (boundary.length === 0) return;

    const batch = boundary.slice(0, 12);
    loadingRef.current = true;
    batch.forEach((node) => {
      node.loading = true;
    });
    renderer.render(root);

    Promise.all(
      batch.map((node) =>
        getTree(node.userId, LAZY_DEPTH)
          .then((fetched) => graftChildren(node, fetched, LAZY_DEPTH))
          .catch(() => undefined),
      ),
    ).finally(() => {
      loadingRef.current = false;
      rendererRef.current?.render(rootRef.current ?? root);
      // Yeni nesil geldi: ağacı otomatik sığdır (dibe ulaşan kullanıcı yeni seviyeyi görür)
      requestAnimationFrame(() => rendererRef.current?.fit());
    });
  }, []);

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

  // "Daha Fazla Göster" butonu: sınır düğümlerini bir seviye daha derinleştirir
  // (her basışta yeni kişiler eklenir, kademeli).
  const loadMoreLevels = useCallback(() => {
    const renderer = rendererRef.current;
    const root = rootRef.current;
    if (!renderer || !root || showMoreRef.current) return;

    const boundary: BTNode[] = [];
    const walk = (n: BTNode) => {
      if (n.placeholder) return;
      if (n.boundary) {
        boundary.push(n);
        return;
      }
      n.children.forEach(walk);
    };
    walk(root);

    if (boundary.length === 0) {
      setNoMore(true);
      return;
    }

    const batch = boundary.slice(0, 24);
    showMoreRef.current = true;
    setShowMoreLoading(true);
    batch.forEach((n) => {
      n.loading = true;
    });
    renderer.render(root);

    Promise.all(
      batch.map((n) =>
        getTree(n.userId, 1)
          .then((f) => graftChildren(n, f, 1))
          .catch(() => undefined),
      ),
    ).finally(() => {
      showMoreRef.current = false;
      setShowMoreLoading(false);
      rendererRef.current?.render(rootRef.current ?? root);
      requestAnimationFrame(() => rendererRef.current?.fit());
    });
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
        onHover: showTooltip,
        onHoverMove: moveTooltip,
        onHoverEnd: hideTooltip,
        onPlaceholderClick: openPlaceDialog,
        // Kademeli ilerleme yalnızca "Daha Fazla Göster" butonuyla yapılır
        onReachBottom: () => {},
      },
      () => {
        const area = svgEl.parentElement ?? wrapEl;
        return { w: area.clientWidth, h: area.clientHeight };
      },
      dark,
    );
    rendererRef.current = renderer;

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [handleNodeClick, showTooltip, moveTooltip, hideTooltip, loadNextGeneration, openPlaceDialog, dark]);

  // Veri değişince ağacı kur ve sığdır
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    rootRef.current = toBTNode(data, depth);
    setNoMore(false);
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
      // Ağacı yenile
      const fetched = await getTree(data.user_id, depth);
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
    setCollapsedBelowRoot(root, collapsed);
    renderer.render(root);
    requestAnimationFrame(() => renderer.fit());
  };

  return (
    <Box
      ref={wrapRef}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: dark ? "#0F1510" : "#FDFEFD",
        backgroundImage: dark
          ? "radial-gradient(circle, rgba(255,255,255,0.06) 1.2px, transparent 1.2px)"
          : "radial-gradient(circle, rgba(39,77,36,0.07) 1.2px, transparent 1.2px)",
        backgroundSize: "15px 15px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: { xs: 640, md: 740 },
      }}
    >
      {/* Kart içi kontrol çubuğu */}
      <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Stack direction="column" spacing={1.5}>
          {/* Arama — ortalanmış */}
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <TextField
              size="small"
              placeholder="İsim veya üye kodu ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: { xs: "100%", sm: 320 } }}
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
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center", rowGap: 1, justifyContent: "center" }}>
            <Button size="small" variant="outlined" startIcon={<UnfoldMoreRoundedIcon />} onClick={() => toggleAll(false)}>
              Tümünü Aç
            </Button>
            <Button size="small" variant="outlined" startIcon={<UnfoldLessRoundedIcon />} onClick={() => toggleAll(true)}>
            Tümünü Kapat
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button size="small" variant="outlined" startIcon={<ZoomInRoundedIcon />} onClick={() => rendererRef.current?.zoomBy(1.3)}>
            Yaklaş
          </Button>
          <Button size="small" variant="outlined" startIcon={<ZoomOutRoundedIcon />} onClick={() => rendererRef.current?.zoomBy(0.77)}>
            Uzaklaş
          </Button>
          <Button size="small" variant="contained" startIcon={<FitScreenRoundedIcon />} onClick={() => rendererRef.current?.fit()}>
            Sığdır
          </Button>
        </Stack>

        <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
          <Chip size="small" label="Kök" sx={{ bgcolor: "#274D24", color: "#fff", fontWeight: 700 }} />
          <Chip size="small" label="Sol Hat" sx={{ bgcolor: "#2E7D32", color: "#fff", fontWeight: 700 }} />
          <Chip size="small" label="Sağ Hat" sx={{ bgcolor: "#B4552D", color: "#fff", fontWeight: 700 }} />
          <Typography variant="caption" color="text.secondary">
            Karta tıklayın: aç/kapat · turuncu &quot;+&quot; rozet: alt ekibi yükle · sürükle &amp; tekerlekle yaklaş
          </Typography>
        </Box>
        </Stack>
      </Box>

      {/* Ağaç alanı */}
      <Box sx={{ flexGrow: 1, position: "relative", minHeight: 0 }}>
        <svg
          ref={svgRef}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
        />
      </Box>

      {/* Daha Fazla Göster — her basışta bir seviye yeni kişi eklenir */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          p: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Button
          variant="contained"
          startIcon={showMoreLoading ? undefined : <AddRoundedIcon />}
          onClick={loadMoreLevels}
          disabled={showMoreLoading || noMore}
          sx={{ minWidth: 220 }}
        >
          {showMoreLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : noMore ? (
            "Tümü Yüklendi"
          ) : (
            "Daha Fazla Göster"
          )}
        </Button>
      </Box>

      <div
        ref={tooltipRef}
        style={{
          display: "none",
          position: "fixed",
          zIndex: 1300,
          pointerEvents: "none",
          background: "#1B3A1E",
          color: "#fff",
          borderRadius: 12,
          padding: "8px 12px",
          fontSize: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          maxWidth: 230,
          textAlign: "center",
        }}
      />

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
                  sx={{ borderRadius: 2 }}
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
