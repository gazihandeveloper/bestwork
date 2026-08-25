"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Fab from "@mui/material/Fab";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import BrushRoundedIcon from "@mui/icons-material/BrushRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Sağ alt köşe: fırça (tema rengi, giriş yapınca) + güneş/ay (tüm sistem için karanlık/aydınlık mod).
export default function ThemeCustomizer() {
  const { color, setColor } = useThemeContext();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement | null>(null);

  const pickFromStrip = (clientX: number) => {
    const el = stripRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setColor(hslToHex(Math.round(ratio * 360), 65, 42));
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: { xs: 84, md: 20 },
        right: 20,
        zIndex: 1400,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1,
      }}
    >
      {user && open && (
        <Paper
          elevation={6}
          sx={{
            p: 1.5,
            borderRadius: "20px",
            width: 240,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              Tema Rengi
            </Typography>
            <IconButton size="small" aria-label="Kapat" onClick={() => setOpen(false)}>
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* Renk skalası */}
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 0.5 }}>
            Renk Skalası
          </Typography>
          <Box
            ref={stripRef}
            role="slider"
            aria-label="Renk skalası"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                const ratio = 0.5;
                pickFromStrip((stripRef.current?.getBoundingClientRect().left ?? 0) + ratio * (stripRef.current?.getBoundingClientRect().width ?? 240));
              }
            }}
            onClick={(e) => pickFromStrip(e.clientX)}
            sx={{
              height: 28,
              borderRadius: "14px",
              cursor: "pointer",
              mb: 1.5,
              background:
                "linear-gradient(90deg, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)",
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "2px solid #1F1F1F",
                bgcolor: color,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1 }}>
              {color.toUpperCase()}
            </Typography>
            <Box
              component="label"
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "28px",
                px: 1.5,
                py: 0.75,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                bgcolor: "background.paper",
                color: "text.primary",
              }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  width: 0,
                  height: 0,
                  opacity: 0,
                  position: "absolute",
                  pointerEvents: "none",
                }}
              />
              Seç
            </Box>
          </Box>
        </Paper>
      )}

      {user && (
        <Tooltip title={open ? "Kapat" : "Tema rengi"}>
          <Fab
            color="primary"
            size="medium"
            aria-label="Tema rengini değiştir"
            onClick={() => setOpen((v) => !v)}
            sx={{ boxShadow: 4 }}
          >
            <BrushRoundedIcon />
          </Fab>
        </Tooltip>
      )}
    </Box>
  );
}
