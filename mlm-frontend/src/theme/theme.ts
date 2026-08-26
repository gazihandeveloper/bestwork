"use client";

import { createTheme } from "@mui/material/styles";

// Material Design 3 — m3.material.io baseline yeşil paleti.
const theme = createTheme({
  palette: {
    primary: {
      main: "#3B6B35",
      light: "#7FA37C",
      dark: "#274D24",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#A3C79D", // adaçayı
      light: "#D3E8CD", // pastel yeşil container
      dark: "#74966E",
      contrastText: "#1A3A16",
    },
    background: {
      default: "#FFFFFF", // bembeyaz arka plan
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1F1F1F", // AYNEN kal (a11y)
      secondary: "#625D63", // AYNEN kal (a11y düzeltmesi)
    },
    divider: "#C6CCC6", // yeşil-gri outline
    success: { main: "#2E7D32" }, // semantik, değişmez
  },
  shape: {
    borderRadius: 11,
  },
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
          borderRadius: 20,
          paddingInline: 20,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 11,
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
  },
});

export default theme;
