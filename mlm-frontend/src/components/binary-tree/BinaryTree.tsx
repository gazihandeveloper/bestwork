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
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
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
import { fileUrl, getTree, getErrorMessage, placePendingByCode } from "@/services/api";
import type { TreeNode } from "@/services/api";
import { BinaryTreeRenderer } from "./renderer";
import { LAZY_DEPTH, graftChildren, setCollapsedBelowRoot, toBTNode, type BTNode } from "./types";

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

  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [placeTarget, setPlaceTarget] = useState<{ parentId: number; position: "L" | "R" } | null>(null);
  const [placeCode, setPlaceCode] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");

  const showTooltip = useCallback((event: MouseEvent, node: BTNode) => {
    const el = tooltipRef.current;
    if (!el || node.placeholder) return;
    const img = fileUrl(node.imagePath);
    el.innerHTML = `
      ${img ? `<img src="${escapeHtml(img)}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 6px;">` : ""}
      <div style="font-weight:800">${escapeHtml(node.name)}</div>
      <div style="color:#A5D6A7;font-size:11px">#${escapeHtml(node.memberCode)}</div>
      <div style="margin-top:6px;font-size:11px">Bacak: ${node.position === "L" ? "Sol" : node.position === "R" ? "Sağ" : "Kök"}</div>
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
        onPlaceholderClick: (parentId, position) => {
          setPlaceCode("");
          setPlaceError("");
          setPlaceTarget({ parentId, position });
        },
      },
      () => {
        const area = svgEl.parentElement ?? wrapEl;
        return { w: area.clientWidth, h: area.clientHeight };
      },
    );
    rendererRef.current = renderer;

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [handleNodeClick, showTooltip, moveTooltip, hideTooltip]);

  // Veri değişince ağacı kur ve sığdır
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    rootRef.current = toBTNode(data, depth);
    renderer.render(rootRef.current);
    // İlk yerleşim tamamlandıktan sonra sığdır
    requestAnimationFrame(() => renderer.fit(false));
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
    const code = placeCode.trim();
    if (!code) {
      setPlaceError("Üye kodu girin (TR90XXXXXX).");
      return;
    }
    setPlacing(true);
    setPlaceError("");
    try {
      const placed = await placePendingByCode(code, placeTarget.parentId, placeTarget.position);
      setSuccessMsg(`${placed.name} (${placed.member_code}) ${placeTarget.position === "L" ? "sol" : "sağ"} bacağa yerleştirildi.`);
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
        bgcolor: "#FDFEFD",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: { xs: 620, md: 700 },
      }}
    >
      {/* Kart içi kontrol çubuğu */}
      <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center", rowGap: 1 }}>
          <TextField
            size="small"
            placeholder="İsim veya üye kodu ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: "100%", sm: 260 } }}
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

        <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <Chip size="small" label="Kök" sx={{ bgcolor: "#274D24", color: "#fff", fontWeight: 700 }} />
          <Chip size="small" label="Sol Bacak" sx={{ bgcolor: "#2E7D32", color: "#fff", fontWeight: 700 }} />
          <Chip size="small" label="Sağ Bacak" sx={{ bgcolor: "#B4552D", color: "#fff", fontWeight: 700 }} />
          <Typography variant="caption" color="text.secondary">
            Karta tıklayın: aç/kapat · turuncu &quot;+&quot; rozet: alt ekibi yükle · sürükle &amp; tekerlekle yaklaş
          </Typography>
        </Box>
      </Box>

      {/* Ağaç alanı */}
      <Box sx={{ flexGrow: 1, position: "relative", minHeight: 0 }}>
        <svg
          ref={svgRef}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
        />
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
          {placeTarget?.position === "L" ? "Sol" : "Sağ"} Bacağa Üye Yerleştir
          <Box sx={{ flexGrow: 1 }} />
          <IconButton size="small" aria-label="Kapat" onClick={() => setPlaceTarget(null)}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Boş pozisyona yerleştirmek istediğiniz üyenin referans kodunu girin.
          </Typography>
          <TextField
            fullWidth
            label="Üye Kodu"
            placeholder="TR90XXXXXX"
            value={placeCode}
            onChange={(e) => setPlaceCode(e.target.value.toUpperCase())}
            error={!!placeError}
            helperText={placeError}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePlaceSubmit();
            }}
          />
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 2 }}
            disabled={placing}
            onClick={handlePlaceSubmit}
          >
            {placing ? <CircularProgress size={22} color="inherit" /> : "Ağaca Yerleştir"}
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
