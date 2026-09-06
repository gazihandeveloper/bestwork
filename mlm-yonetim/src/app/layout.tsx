import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./adminlte-theme.css";
import "./login-template.css";
import { AuthProvider } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "BestWork Admin Paneli",
  description: "BestWork MLM izole yönetim paneli",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="stylesheet" href="/bestmanager/vendor/bootstrap.min.css" />
        <link rel="stylesheet" href="/bestmanager/vendor/overlayscrollbars.min.css" />
        <link rel="stylesheet" href="/bestmanager/vendor/apexcharts.min.css" />
        <link rel="stylesheet" href="/bestmanager/vendor/adminlte.min.css" />
        <link rel="stylesheet" href="/bestmanager/vendor/material-symbols.css" />
        <script defer src="/bestmanager/vendor/apexcharts.min.js" />
      </head>
      <body className={`${montserrat.variable} layout-fixed`}>
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
