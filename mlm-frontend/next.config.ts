import type { NextConfig } from "next";

// Üretimde mahmutgazihanarslan.com.tr/mlm altında yayınlanır.
// NEXT_PUBLIC_BASE_PATH=/mlm verildiğinde basePath etkinleşir (link'ler otomatik
// /mlm ile öneklenir); yerel geliştirmede boş bırakılır → uygulama kök yolda çalışır.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = basePath ? { basePath } : {};

export default nextConfig;
