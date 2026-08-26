"use client";

import { createContext, useContext, useMemo, useState } from "react";
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">(initialMode);

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
          main: isDark ? mix(palette.primary, 0, 0.28) : palette.secondary,
          light: isDark ? mix(palette.primary, 255, 0.72) : palette.secondaryLight,
          dark: isDark ? mix(palette.primary, 0, 0.5) : palette.secondaryDark,
          contrastText: isDark ? "#E4F0E0" : "#1A3A16",
        },
        background: isDark
          ? { default: "#121A10", paper: "#1B2519" }
          : { default: "#FFFFFF", paper: "#FFFFFF" },
        text: isDark
          ? { primary: "#EEF4EC", secondary: "#AABBA7" }
          : { primary: "#1F1F1F", secondary: "#625D63" },
        divider: isDark ? "#33463A" : "#C6CCC6",
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
