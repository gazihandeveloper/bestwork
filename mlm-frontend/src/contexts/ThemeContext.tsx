"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createTheme } from "@mui/material/styles";

// Sabit marka rengi — renk seçimi kaldırıldı, yalnızca bu renk kullanılır.
const BRAND_COLOR = "#476F16";
const MODE_KEY = "bestwork_mode";

function initialMode(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem(MODE_KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function mix(hex: string, target: number, ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mixC = (c: number) => Math.round(c + (target - c) * ratio);
  return `#${[mixC(r), mixC(g), mixC(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function derivePalette(hex: string) {
  return {
    primary: hex,
    primaryLight: mix(hex, 255, 0.35),
    primaryDark: mix(hex, 0, 0.25),
    secondary: mix(hex, 255, 0.6),
    secondaryLight: mix(hex, 255, 0.8),
    secondaryDark: mix(hex, 255, 0.4),
  };
}

const palette = derivePalette(BRAND_COLOR);

interface ThemeContextValue {
  mode: "light" | "dark";
  toggleMode: () => void;
  theme: ReturnType<typeof createTheme>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext, ThemeProvider içinde kullanılmalıdır");
  return ctx;
}

export function ThemeProvider({
  children,
  initialMode: initialModeProp,
}: {
  children: ReactNode;
  initialMode?: "light" | "dark" | null;
}) {
  // Sunucudan (cookie) gelen mod önceliklidir → SSR bile doğru modla çizilir (beyaz flaş yok).
  const [mode, setMode] = useState<"light" | "dark">(
    () => (initialModeProp === "light" || initialModeProp === "dark" ? initialModeProp : initialMode()),
  );

  // Tailwind (.dark) sınıfını <html> üzerinde MUI moduyla senkron tutar.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    root.style.colorScheme = mode;
  }, [mode]);

  // Sabit marka rengi #476F16 — gece/gündüz moduna göre yalnızca zemin metni değişir
  const theme = useMemo(() => {
    const isDark = mode === "dark";
    return createTheme({
      palette: {
        mode,
        primary: {
          main: palette.primary,
          light: palette.primaryLight,
          dark: isDark ? mix(palette.primary, 255, 0.55) : palette.primaryDark,
          contrastText: "#ffffff",
        },
        secondary: {
          main: isDark ? "#2A2A2E" : palette.secondary,
          light: isDark ? "#3A3A3E" : palette.secondaryLight,
          dark: isDark ? "#1E1E20" : palette.secondaryDark,
          contrastText: isDark ? "#f9f9f9" : "#1A3A16",
        },
        background: isDark
          ? { default: "#09090b", paper: "#09090b" }
          : { default: "#FFFFFF", paper: "#FFFFFF" },
        text: isDark
          ? { primary: "#f9f9f9", secondary: "#b8bcc4" }
          : { primary: "#1F1F1F", secondary: "#625D63" },
        divider: isDark ? "#26262a" : "#C6CCC6",
        success: { main: isDark ? "#4CAF7D" : "#2E7D32" },
      },
      shape: { borderRadius: 11 },
      typography: {
        fontFamily:
          "var(--font-plus-jakarta), 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 600 },
      },
      components: {
        MuiButtonBase: {
          styleOverrides: {
            root: {
              "&:hover": { backgroundColor: "transparent" },
            },
          },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: {
              textTransform: "none",
              borderRadius: 20,
              paddingInline: 20,
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 11,
              boxShadow: isDark ? "0 2px 10px rgba(0,0,0,0.45)" : "0 2px 10px rgba(0,0,0,0.08)",
            },
          },
        },
        MuiTextField: {
          defaultProps: { size: "small" },
        },
      },
    });
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      toggleMode: () => {
        setMode((m) => {
          const next = m === "dark" ? "light" : "dark";
          try {
            window.localStorage.setItem(MODE_KEY, next);
            document.cookie = `bw_mode=${next}; max-age=31536000; path=/; SameSite=Lax`;
          } catch {
            /* yoksay */
          }
          return next;
        });
      },
      theme,
    }),
    [theme, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
