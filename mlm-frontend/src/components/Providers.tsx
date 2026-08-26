"use client";

import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, useThemeContext } from "@/contexts/ThemeContext";

export default function Providers({
  children,
  initialColor,
}: {
  children: ReactNode;
  initialColor?: string | null;
}) {
  return (
    <AuthProvider>
      <ThemeProvider initialColor={initialColor}>
        <ThemeContent>{children}</ThemeContent>
      </ThemeProvider>
    </AuthProvider>
  );
}

function ThemeContent({ children }: { children: ReactNode }) {
  const { theme } = useThemeContext();
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
