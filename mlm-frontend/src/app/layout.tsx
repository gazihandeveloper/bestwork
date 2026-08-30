import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";
import SiteNav from "@/components/landing/SiteNav";
import Footer from "@/components/landing2/Footer";
import LoginDialog from "@/components/LoginDialog";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "Bestwork | Alışveriş Yap, Ağını Kur, Kazan",
  description:
    "Binary MLM komisyon sistemi ile e-ticareti birleştiren modern platform. Kayıt olun, sipariş verin, ekibinizi kurun ve kazanın.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Sunucuda modu cookie'den oku → SSR doğru modla çizilir (beyaz flaş yok)
  const ck = await cookies();
  const initialMode = (ck.get("bw_mode")?.value === "dark" ? "dark" : ck.get("bw_mode")?.value === "light" ? "light" : null) as "light" | "dark" | null;
  return (
    <html lang="tr" className={initialMode === "dark" ? "dark" : ""} style={{ colorScheme: initialMode === "dark" ? "dark" : "light" }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
      />
      <body className={`${plusJakarta.variable} ${plusJakarta.className}`}>
        <AppRouterCacheProvider>
          <Providers initialMode={initialMode}>
            <SiteNav />
            <AppShell>{children}</AppShell>
            <Footer />
            <LoginDialog />
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
