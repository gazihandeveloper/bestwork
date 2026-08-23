# Bestwork MLM | Binary MLM + E-ticaret Platformu

Binary MLM komisyon sistemi (referans, binary, matching/liderlik, perakende) ile e-ticareti
birleştiren tam yığın platform.

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Veritabanı | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Backend | Go 1.26 · Gin · pgx/v5 · go-redis/v9 · JWT (HS256) |
| Frontend | Next.js 16 (App Router) · TypeScript · MUI v9 (MD3 yeşil tema) · React Hook Form + Yup · d3.js |
| İş zamanlayıcı | robfig/cron (aylık kapanış: her ayın 1'i 00:00) |

## Proje Yapısı

```
Bestwork/
├── schema.sql              # Veritabanı şeması + paket/rütbe seed'leri
├── admin_seed.sql          # Varsayılan admin kullanıcısı
├── package_seed.sql        # Paket oranları seed scripti
├── docker-compose.yml      # Geliştirme: PostgreSQL + Redis
├── docker-compose.prod.yml # Üretim: PostgreSQL + Redis + API + Cron + Frontend
├── mlm-backend/            # Go REST API
│   ├── cmd/api             # Ana sunucu
│   ├── cmd/cron            # Aylık kapanış scheduler'ı
│   └── internal/           # config, database, models, services, handlers, middleware, auth
└── mlm-frontend/           # Next.js frontend
    └── src/
        ├── app/            # Sayfalar (App Router)
        ├── components/     # Sidebar, FloatingNavbar, AppBar, d3 ağacı vb.
        ├── contexts/ hooks/ lib/ services/ theme/
```

## Geliştirme Ortamı Kurulumu

### 1. Veritabanı + Redis (Docker)

```bash
docker compose up -d          # PostgreSQL :5432, Redis :6379
docker compose exec -T postgres psql -U mlm_user -d mlm_db < schema.sql
docker compose exec -T postgres psql -U mlm_user -d mlm_db < admin_seed.sql
```

### 2. Backend (Go)

```bash
cd mlm-backend
cp .env.example .env          # JWT_SECRET, GIN_MODE, CORS_ORIGINS vb.
go mod tidy
go run ./cmd/api              # http://localhost:8080
# Aylık kapanış cron'u (opsiyonel):
go run ./cmd/cron             # CRON_SCHEDULE env ile değiştirilebilir
```

### 3. Frontend (Next.js)

```bash
cd mlm-frontend
npm install
# .env.local: NEXT_PUBLIC_API_URL=http://localhost:8080/api
npm run dev                   # http://localhost:3000
```

### Yönetici Hesabı

Varsayılan yönetici hesabı oluşturulmaz. İlk yöneticiyi güçlü bir parola ile
oluşturmak için:

```bash
cd mlm-backend
ADMIN_NAME="System Admin" \
ADMIN_EMAIL="admin@example.com" \
ADMIN_PASSWORD="en-az-12-karakterli-guclu-bir-parola" \
go run ./cmd/createadmin
```

## Production Build

```bash
# Backend
cd mlm-backend && go build -o bin/api ./cmd/api && GIN_MODE=release ./bin/api

# Frontend
cd mlm-frontend && npm run build && npm run start   # http://localhost:3000
```

## Docker (Tüm Sistem Tek Komutla)

```bash
docker compose -f docker-compose.prod.yml up -d --build
# API :8080 · Frontend :3000 · Cron (otomatik); PostgreSQL ve Redis hosta açılmaz.
docker compose -f docker-compose.prod.yml down
```

Yeni bir veritabanında `schema.sql` ve `admin_seed.sql` otomatik import edilir
(initdb mount). Önemli env değişkenleri: `JWT_SECRET`, `GIN_MODE=release`,
`CORS_ORIGINS`, `CRON_SCHEDULE`, `NEXT_PUBLIC_API_URL`.

## Özellikler ve İş Kuralları Özeti

- **Üyelik:** TR90 + 6 hane otomatik üye kodu (giriş + referans kodu). `customer` rolü
  müşteri kaydıdır (binary'ye girmez, sponsor zorunlu).
- **Paketler:** Starter → Platin (PV birikimiyle otomatik seviye atlama; Platin %25 indirim).
- **Komisyonlar:** Referans (anlık), Binary (aylık kapanışta toplu eşleşme, flashout limiti),
  Matching (5 nesil: %20/%10/%10/%10/%5), Retail (müşteri siparişlerinden).
- **Rütbeler:** Jade → Ambassador (bacak PV eşikleri), kalıcı; `rank_progress` ile izlenir.
- **Aylık kapanış:** `monthly_jobs` tablosu ile idempotent; chip kesintisi (%5) ve binary
  sayaç sıfırlama aynı guard mekanizmasıyla korunur.
- **Ödemeler:** Kredi kartı (anında işlem) ve EFT/HAVALE (bildirim → admin onayı → işlemler;
  red → sipariş iptali + stok iadesi).
- **Para çekme:** Minimum 750 TL, admin onayı/reddi.
- **Şeffaflık:** Binary hareketleri, komisyon geçmişi, sponsorluk ağacı (d3 interaktif),
  perakende kazanç raporu, kariyer takibi.

## API Özeti

| Grup | Endpoint'ler |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/change-password` |
| Kullanıcı | `GET /api/user/me`, `/user/sponsored`, `/user/career` |
| Ürün/Paket | `GET/POST /api/products`, `PUT/DELETE /api/products/:id`, `GET/POST/PUT/DELETE /api/packages`, `GET /api/ranks` |
| Sipariş | `POST/GET /api/orders`, `GET /api/orders/:id` |
| Binary/MLM | `GET /api/tree`, `/api/sponsor-tree`, `/api/binary-transactions`, `GET/POST /api/pending-pool`, `POST /api/pending-pool/place` |
| Kazanç | `GET /api/commissions`, `/api/retail-earnings`, `/api/dashboard`, `/api/wallet`, `POST /api/wallet/withdraw` |
| Ödeme Bildirimi | `GET/POST /api/payment-notifications`, `POST /api/upload` |
| Admin | `/api/admin/dashboard`, `/api/admin/withdrawals`, `/api/admin/pending-pool`, `/api/admin/payment-notifications`, `/api/admin/binary-transactions`, `POST /api/admin/monthly-close`, `POST /api/cron/monthly-reset` |
| Diğer | `GET /api/bank-accounts`, `GET/POST/PUT/DELETE /api/beneficiaries`, `GET /health` |

## Güvenlik Notları

- Tüm korumalı route'lar JWT (Bearer, 24 saat); admin route'ları `role=admin` kontrolüne tabidir.
- Sahiplik kontrolleri: sipariş, banka, varis, sponsorluk ağacı (admin hariç yalnızca kendi kayıtları).
- Tüm SQL sorguları parametreli (pgx); SQL injection riski yok.
- Dosya yükleme: 5MB limit + uzantı beyaz listesi (jpg/png/pdf); uploads/ klasörüne yazılır.
- CORS: yalnızca `CORS_ORIGINS`'te izin verilen origin'ler.
- `JWT_SECRET` üretimde mutlaka değiştirilmeli.
# BestWork
