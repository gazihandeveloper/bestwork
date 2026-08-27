"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Network, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { path: "/shop", label: "Alışveriş", icon: ShoppingCart },
  { path: "/tree", label: "Ağaç", icon: Network },
  { path: "/pending", label: "Bekleyenler", icon: Users },
  { path: "/profile", label: "Profil", icon: User },
];

// Yüzen alt navigasyon (mobil). Masaüstünde gizlenir (üst bar kullanılır).
export default function FloatingNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      aria-label="Mobil alt navigasyon"
      className="bg-[#16331B] fixed bottom-4 left-1/2 z-[1100] w-[min(92%,460px)] -translate-x-1/2 rounded shadow-[0_10px_30px_-8px_rgba(0,0,0,0.55)] ring-1 ring-white/10 md:hidden"
    >
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          // /dashboard tam eşleşme; diğer sekmeler alt yol ile başlayanları da kapsar
          const isActive =
            tab.path === "/dashboard"
              ? pathname === tab.path
              : pathname === tab.path || pathname.startsWith(tab.path + "/");

          return (
            <button
              key={tab.path}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => router.push(tab.path)}
              className={cn(
                "relative flex min-h-[56px] flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded px-1 py-2 transition-colors duration-200",
                isActive ? "text-white" : "text-white/55 hover:text-white/85"
              )}
            >
              {/* Aktif sekme — üstte yeşil çizgi */}
              <span
                aria-hidden
                className={cn(
                  "bg-[#A5D6A7] absolute inset-x-3 top-0 h-[3px] rounded-b-sm transition-opacity duration-200",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn("size-6", isActive && "text-[#A5D6A7]")}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span
                className={cn(
                  "text-[10px] leading-none font-semibold tracking-tight",
                  isActive ? "font-bold" : "font-semibold"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
