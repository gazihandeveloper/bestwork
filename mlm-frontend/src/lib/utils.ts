import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui yardımcısı: koşullu sınıfları birleştirir, çakışan Tailwind
// sınıflarında sonuncuyu kazandırır.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
