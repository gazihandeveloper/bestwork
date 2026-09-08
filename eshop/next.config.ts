import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'mahmutgazihanarslan.com.tr' },
    ],
  },
  async rewrites() {
    return [
      // Auth → BestWork
      { source: '/api/auth/login', destination: 'http://localhost:8090/api/eshop/auth/login' },
      { source: '/api/auth/register', destination: 'http://localhost:8090/api/eshop/auth/register' },
      { source: '/api/auth/refresh', destination: 'http://localhost:8090/api/eshop/auth/refresh' },
      { source: '/api/users/me', destination: 'http://localhost:8090/api/eshop/users/me' },
      // Katalog → BestWork
      { source: '/api/products/slug/:slug', destination: 'http://localhost:8090/api/eshop/products/slug/:slug' },
      { source: '/api/products', destination: 'http://localhost:8090/api/eshop/products' },
      { source: '/api/categories', destination: 'http://localhost:8090/api/eshop/categories' },
      // Hesabım (dashboard + sipariş + cüzdan) → BestWork
      { source: '/api/dashboard', destination: 'http://localhost:8090/api/eshop/dashboard' },
      { source: '/api/me', destination: 'http://localhost:8090/api/eshop/me' },
      { source: '/api/ranks', destination: 'http://localhost:8090/api/eshop/ranks' },
      { source: '/api/packages', destination: 'http://localhost:8090/api/eshop/packages' },
      { source: '/api/sponsored', destination: 'http://localhost:8090/api/eshop/sponsored' },
      { source: '/api/pending-pool', destination: 'http://localhost:8090/api/eshop/pending-pool' },
      { source: '/api/profile', destination: 'http://localhost:8090/api/eshop/profile' },
      { source: '/api/profile-image', destination: 'http://localhost:8090/api/eshop/profile-image' },
      { source: '/api/upload', destination: 'http://localhost:8090/api/upload' },
      { source: '/api/orders/:id', destination: 'http://localhost:8090/api/eshop/orders/:id' },
      { source: '/api/orders', destination: 'http://localhost:8090/api/eshop/orders' },
      { source: '/api/wallet/transactions', destination: 'http://localhost:8090/api/eshop/wallet/transactions' },
      { source: '/api/wallet', destination: 'http://localhost:8090/api/eshop/wallet' },
      // Kişisel menü uçları → BestWork ham API (banka / varis / kariyer / rapor)
      { source: '/api/bank-accounts', destination: 'http://localhost:8090/api/bank-accounts' },
      { source: '/api/bank-accounts/:id', destination: 'http://localhost:8090/api/bank-accounts/:id' },
      { source: '/api/beneficiaries', destination: 'http://localhost:8090/api/beneficiaries' },
      { source: '/api/beneficiaries/:id', destination: 'http://localhost:8090/api/beneficiaries/:id' },
      { source: '/api/career', destination: 'http://localhost:8090/api/user/career' },
      { source: '/api/commissions', destination: 'http://localhost:8090/api/commissions' },
      { source: '/api/binary-transactions', destination: 'http://localhost:8090/api/binary-transactions' },
      { source: '/api/auth/change-password', destination: 'http://localhost:8090/api/auth/change-password' },
      { source: '/api/tree', destination: 'http://localhost:8090/api/tree' },
      { source: '/api/pending-pool/place', destination: 'http://localhost:8090/api/pending-pool/place' },
      { source: '/api/payment-notifications', destination: 'http://localhost:8090/api/payment-notifications' },
      { source: '/api/retail-earnings', destination: 'http://localhost:8090/api/retail-earnings' },
      { source: '/api/tickets', destination: 'http://localhost:8090/api/tickets' },
    ];
  },
  async headers() {
    return [
      // HSTS: tum yanitlara (Cloudflare onunde de iletilir)
      { source: '/:path*', headers: [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] },
      // K4: kok sayfa HTML cache 1 yildan 5 dk'ya
      { source: '/', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }] },
      { source: '/products', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }] },
      { source: '/products/:slug', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }] },
      { source: '/about', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }] },
      { source: '/contact', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }] },
      { source: '/login', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }] },
      { source: '/register', headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }] },
    ]
  },
};

export default nextConfig;
