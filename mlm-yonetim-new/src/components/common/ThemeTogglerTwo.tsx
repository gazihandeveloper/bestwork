"use client";
import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { MoonIcon, SunIcon } from "@/components/icons";

export default function ThemeTogglerTwo() {
  const { toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="inline-flex size-14 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600"
    >
      <SunIcon className="hidden dark:block" size={20} />
      <MoonIcon className="dark:hidden" size={20} />
    </button>
  );
}
