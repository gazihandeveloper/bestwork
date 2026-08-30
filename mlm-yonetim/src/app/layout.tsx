import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./adminlte-theme.css";
import "./login-template.css";
import { AuthProvider } from "@/lib/auth";
import AuthGuard from "@/components/AuthGuard";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" />
        <script defer src="/bestmanager/vendor/apexcharts.min.js" />
      </head>
      <body className={`${sourceSans.variable} layout-fixed`}>
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
