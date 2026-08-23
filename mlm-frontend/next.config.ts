import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Uygulama https://enderaltintas.com/mlm altında yayınlanır
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "/mlm",
};

export default nextConfig;
