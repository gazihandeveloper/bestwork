// m3.material.io'dan çıkarılmış pastel vurgular + accent (tek izinli ad-hoc hex'ler)
export const PASTELS = {
  mint: "#D8F0DC",
  sage: "#DDE8D9",
  peach: "#FBE0D6", // sıcaklık için kalsın (peach+yeşil uyumlu)
} as const;

// M3 resmi elevation gölgeleri (light theme) — yumuşatılmış
export const ELEVATION = {
  l1: "0 1px 2px rgba(0,0,0,0.16), 0 1px 2px 1px rgba(0,0,0,0.06)",
  l2: "0 1px 2px rgba(0,0,0,0.18), 0 2px 4px 2px rgba(0,0,0,0.08)",
  l3: "0 2px 4px rgba(0,0,0,0.18), 0 4px 8px 3px rgba(0,0,0,0.10)",
  l4: "0 3px 6px rgba(0,0,0,0.18), 0 6px 12px 4px rgba(0,0,0,0.12)",
  l5: "0 4px 8px rgba(0,0,0,0.18), 0 8px 16px 6px rgba(0,0,0,0.14)",
} as const;

// M3 motion tokenları
export const MOTION = {
  standard: "cubic-bezier(0.2, 0, 0, 1)", // M3 standard (emphasized) easing
  emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  emphasizedDecelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  emphasizedAccelerate: "cubic-bezier(0.3, 0, 0.8, 0.15)",
  short: 200, // ms
  medium: 400,
  long: 500,
} as const;

// m3.material.io'nun koyu footer'ı için izinli tokenlar
export const FOOTER_BG = "#1F1F1F";
export const FOOTER_TEXT = "#E6E1E3";
