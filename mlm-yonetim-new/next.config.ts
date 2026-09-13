import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "/bestmanager2",
  // Not: SVG'ler artık @svgr/webpack ile bileşene çevrilmiyor.
  // Tüm ikonlar @/components/icons altında yerel bileşen olarak durur.

  /* Kolay giriş: panel adresi yazılmadan gelen istekler yönlendirilir.
     - "/"            → kök adres (localhost:3007) paneli açsın
     - "/bestmanager2"→ panelin eski adı (varsayılan basePath) 404 vermesin
     basePath: false → kurallar kök yolda eşleşir (aksi hâlde Next, basePath'i
     başa ekler ve hiçbir istek eşleşmez). */
  async redirects() {
    const hedef = process.env.NEXT_PUBLIC_BASE_PATH || "/bestmanager2";
    const kok = { source: "/", destination: hedef, permanent: false, basePath: false } as const;
    if (hedef === "/bestmanager2") {
      // basePath zaten eski ad: yalnızca kök yönlendirilir (döngü olmaz)
      return [kok];
    }
    return [
      kok,
      { source: "/bestmanager2", destination: hedef, permanent: false, basePath: false } as const,
      { source: "/bestmanager2/:path*", destination: `${hedef}/:path*`, permanent: false, basePath: false } as const,
    ];
  },

  /* Yerel geliştirmede panel (3007) ile API (8090) farklı köken olduğu için
     oturum çerezi tarayıcı tarafından düşürülüyordu (401). Bu rewrite istekleri
     aynı kökene taşır. Yalnızca development'ta etkindir; üretimde panel zaten
     aynı alan adı üzerinden çağırdığı için bu kural devreye girmez. */
  ...(process.env.NODE_ENV === "development"
    ? {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: "http://127.0.0.1:8090/api/:path*",
              // basePath eklenmesin: panel '/api/...' yolunu kökten çağırıyor.
              basePath: false,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
