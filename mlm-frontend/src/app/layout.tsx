import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";
import SiteNav from "@/components/landing/SiteNav";
import LandingFooter from "@/components/landing/LandingFooter";
import CartDrawer from "@/components/CartDrawer";
import LoginDialog from "@/components/LoginDialog";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Bestwork | Alışveriş Yap, Ağını Kur, Kazan",
  description:
    "Binary MLM komisyon sistemi ile e-ticareti birleştiren modern platform. Kayıt olun, sipariş verin, ekibinizi kurun ve kazanın.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${roboto.variable} ${roboto.className}`}>
        <AppRouterCacheProvider>
          <Providers>
            <SiteNav />
            <AppShell>{children}</AppShell>
            <LandingFooter />
            <CartDrawer />
            <LoginDialog />
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
