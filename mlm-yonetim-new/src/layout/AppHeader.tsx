"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import Link from "next/link";
import React, { useState } from "react";
import { Menu, X, EllipsisVertical } from "lucide-react";
import SessionTimer from "@/components/header/SessionTimer";

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  // z-index kuralı: header z-40'ta KALIR; modallar (z-[60]+) ve sidebar (z-50)
  // her zaman header'ın üstünde görünür. Header z-index'ini YÜKSELTMEYİN —
  // aksi halde tüm modallar header'ın altında kalır.
  return (
    <header className="sticky top-0 flex w-full bg-white border-gray-200 z-40 dark:border-gray-800 dark:bg-[#1E293B] lg:border-b">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <X size={18} strokeWidth={1.75} />
            ) : (
              <Menu size={18} strokeWidth={1.75} />
            )}
            {/* Cross Icon */}
          </button>

          <Link href="/" className="lg:hidden">
            <span className="flex -translate-x-5 flex-col items-center text-center leading-none">
              {/* Marka logosu — e-ticaret sitesindeki logo ile aynı (Helvetica + ince kontur), ® Georgia serif */}
              <span
                className="text-[22px] font-extrabold tracking-tight text-[#101828] dark:text-white"
                style={{ fontFamily: "Helvetica, Arial, sans-serif", WebkitTextStroke: "0.5px currentColor" }}
              >
                BEST<span className="ml-0.5">WORK</span>
                <span
                  className="relative top-[-0.5em] ml-0.5 align-super text-[0.6em] font-bold text-[#101828] dark:text-white"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  ®
                </span>
              </span>
              <span className="mt-1 -translate-x-2 text-[10px] font-bold tracking-[0.18em] text-gray-700 dark:text-gray-300">
                YÖNETİM MERKEZİ
              </span>
            </span>
          </Link>

          <button
            onClick={toggleApplicationMenu}
            className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <EllipsisVertical size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
        >
          <div className="flex items-center gap-2 2xsm:gap-3">
            {/* Oturum süresi (30 dk otomatik çıkış) */}
            <SessionTimer />
            {/* Dark Mode Toggler */}
            <ThemeToggleButton />
          </div>
          {/* User Area */}
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
