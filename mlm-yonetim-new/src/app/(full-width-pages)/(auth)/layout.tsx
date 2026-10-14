import { ThemeProvider } from "@/context/ThemeContext";
import type { ReactNode } from "react";

// Giriş/kayıt sayfaları için zemin: koyu yeşil kurumsal gradyan + dekoratif ışıklar.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-10"
      style={{
        backgroundImage:
          "linear-gradient(135deg, #07271C 0%, #0E4E34 45%, #1E8B5A 100%)",
      }}
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-black/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <ThemeProvider>{children}</ThemeProvider>
    </div>
  );
}
