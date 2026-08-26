import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";
import SiteNav from "@/components/landing/SiteNav";
import LandingFooter from "@/components/landing/LandingFooter";
import CartDrawer from "@/components/CartDrawer";
import LoginDialog from "@/components/LoginDialog";
import ThemeCustomizer from "@/components/ThemeCustomizer";
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
      <head>
        {/* Sayfa boyanmadan önce seçili tema rengini uygula (yeşil flaş yok) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var c=localStorage.getItem("bestwork_color");if(c&&/^#[0-9a-fA-F]{6}$/.test(c)){function m(t,r){var x=function(v){return Math.round(v+(t-v)*r).toString(16).padStart(2,"0")};return "#"+x(parseInt(c.slice(1,3),16))+x(parseInt(c.slice(3,5),16))+x(parseInt(c.slice(5,7),16));}var s=document.documentElement.style;s.setProperty("--brand-color",c);s.setProperty("--brand-color-light",m(255,0.35));s.setProperty("--brand-color-dark",m(0,0.25));}}catch(e){}`,
          }}
        />
      </head>
      <body className={`${roboto.variable} ${roboto.className}`}>
        <AppRouterCacheProvider>
          <Providers>
            <SiteNav />
            <AppShell>{children}</AppShell>
            <LandingFooter />
            <CartDrawer />
            <LoginDialog />
            <ThemeCustomizer />
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
