import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export const ThemeToggleButton: React.FC = () => {
  const { toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-dark-900 h-11 w-11 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-[#1E293B] dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      <Sun className="hidden dark:block" size={20} strokeWidth={1.75} />
      <Moon className="dark:hidden" size={20} strokeWidth={1.75} />
    </button>
  );
};
