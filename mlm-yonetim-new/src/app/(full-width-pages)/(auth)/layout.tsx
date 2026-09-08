import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col  dark:bg-gray-900 sm:p-0">
          {children}
          <div className="lg:w-1/2 w-full h-full lg:grid items-center hidden" style={{ backgroundColor: "rgb(41, 165, 108)" }}>
            <div className="flex flex-col items-center justify-center h-full px-8">
              <Link href="/" className="block mb-4">
                <span className="flex flex-col items-center text-center leading-none">
                  <span className="text-5xl font-black tracking-tight text-white">
                    BestWork
                    <span className="align-top text-3xl font-black text-white">
                      ®
                    </span>
                  </span>
                  <span className="mt-1.5 text-sm font-bold tracking-[0.2em] text-white/85">
                    YÖNETİM MERKEZİ
                  </span>
                </span>
              </Link>
              <p className="text-center text-gray-400 dark:text-white/60">
                MLM e-ticaret platformunuz için izole yönetim paneli
              </p>
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
