"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
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
    <div className="pt-[104px] md:pt-[112px]">
      <main className="bg-background min-h-screen pb-12 md:pb-4">
        <div className="w-full px-2 md:px-3 pt-2">
          <BackofficeMenu />
          {children}
        </div>
      </main>
      <FloatingNavbar />
    </div>
  );
}
