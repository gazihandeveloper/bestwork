"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createTheme } from "@mui/material/styles";
import { useAuth } from "@/hooks/useAuth";
import { getProfile, updateThemeColor } from "@/services/api";

const COLOR_KEY = "bestwork_color";
const HIDDEN_KEY = "bestwork_theme_hidden";
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

export function derivePalette(hex: string) {
  return {
    key: "custom",
    label: "Özel",
    primary: hex,
    primaryLight: mix(hex, 255, 0.35),
    primaryDark: mix(hex, 0, 0.25),
    secondary: mix(hex, 255, 0.6),
    secondaryLight: mix(hex, 255, 0.8),
    secondaryDark: mix(hex, 255, 0.4),
  };
}

interface ThemeContextValue {
  color: string;
  setColor: (hex: string) => void;
  previewColor: string | null;
  setPreviewColor: (hex: string | null) => void;
  hidden: boolean;
  setHidden: (v: boolean) => void;
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
  const [color, setColorState] = useState<string>(() => {
    if (typeof window === "undefined") return "#3B6B35";
    try {
      const saved = window.localStorage.getItem(COLOR_KEY);
      return saved && /^#[0-9a-fA-F]{6}$/.test(saved) ? saved : "#3B6B35";
    } catch {
      return "#3B6B35";
    }
  });
  // Sayfa boyanmadan önce inline script "—brand-color" CSS değişkenini koyar:
  // böylece seçilen renk ilk karede bile direkt uygulanır (yeşil flaş yok).
  const [color, setColorState] = useState<string>(() => {
    if (typeof window === "undefined") return "#3B6B35";
    try {
      const css = window.getComputedStyle(document.documentElement).getPropertyValue("--brand-color").trim();
      if (/^#[0-9a-fA-F]{6}$/.test(css)) return css;
      const saved = window.localStorage.getItem(COLOR_KEY);
      return saved && /^#[0-9a-fA-F]{6}$/.test(saved) ? saved : "#3B6B35";
    } catch {
      return "#3B6B35";
    }
  });
  const { user } = useAuth();
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [mode, setMode] = useState<"light" | "dark">(initialMode);
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(HIDDEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (user) {
      const t = setTimeout(() => setPreviewColor(null), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getProfile()
      .then((p) => {
        if (!active) return;
        const saved = p.theme_color;
        if (typeof saved === "string" && /^#[0-9a-fA-F]{6}$/.test(saved)) {
          setColorState(saved);
          try {
            window.localStorage.setItem(COLOR_KEY, saved);
            document.documentElement.style.setProperty("--brand-color", saved);
          } catch {
            /* yoksay */
          }
        }
        // Sunucuda renk yoksa kullanıcının yerelde seçtiği renk korunur (yeşile dönülmez).
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Giriş yapılmamışsa (anasayfa vb.) her zaman orijinal yeşil kullanılır;
  // login modalı önizlemesi (previewColor) bu kuralı geçici olarak ezer.
  const effectiveColor = previewColor ?? (user ? color : "#3B6B35");

  const palette = useMemo(() => derivePalette(effectiveColor), [effectiveColor]);

  // Gece/gündüz modu — ay/güneş düğmesi ile değiştirilir; aydınlıkta bembeyaz zemin
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
      shape: { borderRadius: 16 },
      typography: {
        fontFamily:
          "var(--font-roboto), Roboto, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 600 },
      },
      components: {
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: {
              textTransform: "none",
              borderRadius: 28,
              paddingInline: 20,
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 16,
              boxShadow: isDark ? "0 2px 10px rgba(0,0,0,0.45)" : "0 2px 10px rgba(0,0,0,0.08)",
            },
          },
        },
        MuiTextField: {
          defaultProps: { size: "small" },
        },
      },
    });
  }, [palette, mode]);

  const value = useMemo(
    () => ({
      color,
      setColor: (hex: string) => {
        setColorState(hex);
        try {
          window.localStorage.setItem(COLOR_KEY, hex);
          document.documentElement.style.setProperty("--brand-color", hex);
        } catch {
          /* yoksay */
        }
        if (user) {
          updateThemeColor(hex).catch(() => {});
        }
      },
      previewColor,
      setPreviewColor,
      hidden,
      setHidden: (v: boolean) => {
        setHidden(v);
        try {
          window.localStorage.setItem(HIDDEN_KEY, v ? "1" : "0");
        } catch {
          /* yoksay */
        }
      },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, theme, hidden, previewColor, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
