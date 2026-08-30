import type { NextConfig } from "next";

// BestWork MLM izole yönetim paneli — canlıda /bestmanager altında yayınlanır,
// geliştirmede port 3005'te aynı yolda çalışır.
const nextConfig: NextConfig = {
  basePath: "/bestmanager",
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    // Yerel geliştirmede /api isteklerini canlı API'ye yönlendir (CORS + çerez sorununu çözer)
    return [
      {
        source: "/api/:path*",
        destination: "https://mahmutgazihanarslan.com.tr/api/:path*",
      },
    ];
  },
};

export default nextConfig;
