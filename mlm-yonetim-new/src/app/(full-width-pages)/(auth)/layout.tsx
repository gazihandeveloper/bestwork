import { ThemeProvider } from "@/context/ThemeContext";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center px-4 py-10"
      style={{ backgroundColor: "rgb(41, 165, 108)" }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </div>
  );
}
