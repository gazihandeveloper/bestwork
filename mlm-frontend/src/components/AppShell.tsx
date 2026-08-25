"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import type { ReactNode } from "react";

const FloatingNavbar = dynamic(() => import("@/components/FloatingNavbar"), { ssr: true });
const BackofficeMenu = dynamic(() => import("@/components/BackofficeMenu"), { ssr: true });

// Backoffice düzeni: üstte yatay menü, içerik ortalanmış. Üst yüzen menü (SiteNav)
// layout'ta globaldir. Landing ("/"), shop, login ve register tam ekran düzen kullanır.
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const publicPaths = ["/", "/shop", "/product", "/login", "/register"];
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ pt: { xs: 12, md: 11 } }}>
      <Box
        component="main"
        sx={{ minHeight: "100vh", pb: { xs: 12, md: 4 }, bgcolor: "background.default" }}
      >
          <Box sx={{ width: "100%", px: { xs: 2, md: 3 }, pt: 2 }}>
            <BackofficeMenu />
            {children}
          </Box>
      </Box>
      <FloatingNavbar />
    </Box>
  );
}
