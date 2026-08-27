import type { NextConfig } from "next";

// Üretimde mahmutgazihanarslan.com.tr/bestwork altında yayınlanır.
// NEXT_PUBLIC_BASE_PATH=/bestwork verildiğinde basePath etkinleşir (link'ler otomatik
// /bestwork ile öneklenir); yerel geliştirmede boş bırakılır → uygulama kök yolda çalışır.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // Yerel geliştirmede /api isteklerini canlı API'ye yönlendir (CORS/çerez sorununu çözer:
  // çerez localhost domain'inde kalır, giriş sonrası geri atma yaşanmaz).
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/:path*",
        destination: "https://mahmutgazihanarslan.com.tr/api/:path*",
      },
    ];
  },
};

export default nextConfig;
