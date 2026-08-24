# BestWork — Yayın (Deploy) Akışı

## ⚠️ Kural: 3 Adımlı İş Akışı

Bu projede **her değişiklik** şu sırayla yapılmalıdır:

1. **Güncelle** → kodda değişiklik yap (backend / frontend).
2. **Git commit + push** → `git add -A && git commit -m "açıklama" && git push origin main`.
3. **Sunucuyu güncelle** → aşağıdaki deploy adımları (kolay yol: `./deploy.sh`).

> Adım 2 atlanırsa değişiklik GitHub'da kaybolur; adım 3 atlanırsa canlı site eski kalır.

## Sunucu

| | |
|---|---|
| Adres | `root@212.154.77.35` |
| İşletim sistemi | Ubuntu 26.04 · OpenLiteSpeed (`lshttpd`) · systemd |
| Node | v22 · PostgreSQL | 18 · Redis | 6379 (parolasız, ortak) |
| Uygulama yolu | `/var/www/mahmutgazihanarslan/bestwork/` |
| Backend | `backend/` (Go binary + migrations + uploads) |
| Frontend | `frontend/` (Next.js, basePath `/bestwork`) |

## systemd Servisleri

| Servis | Port | Açıklama |
|---|---|---|
| `bestwork-api` | 8090 | Go REST API |
| `bestwork-cron` | — | Aylık kapanış (her ayın 1'i) |
| `bestwork-frontend` | 3005 | Next.js |

## Veritabanı

- PostgreSQL: rol `bestwork` · DB `bestwork`
- Migration çalıştırıcı: `backend/bestwork-migrate` (idempotent)

## LiteSpeed Reverse Proxy (mahmutgazihanarslan vhost)

| Yol | Hedef |
|---|---|
| `/bestwork`, `/bestwork/` | frontend (3005) |
| `/api`, `/api/` | backend (8090) |
| `/uploads/` | backend (8090, statik) |
| `/health` | backend (8090) |

Vhost dosyası: `/usr/local/lsws/conf/vhosts/mahmutgazihanarslan/vhconf.conf`
(yedekler `vhconf.conf.bak.bestwork.*` ile alınır).

## Manuel Deploy

### Backend (Go)

```bash
# 1) linux/amd64 binary derle
cd mlm-backend
for b in api cron migrate createadmin; do
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /tmp/bestwork-$b ./cmd/$b
done

# 2) yükle
scp /tmp/bestwork-{api,cron,migrate,createadmin} root@212.154.77.35:/var/www/mahmutgazihanarslan/bestwork/backend/
scp -r migrations root@212.154.77.35:/var/www/mahmutgazihanarslan/bestwork/backend/

# 3) migration + restart
ssh root@212.154.77.35 "
  cd /var/www/mahmutgazihanarslan/bestwork/backend
  POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5432 POSTGRES_USER=bestwork \
  POSTGRES_PASSWORD=... POSTGRES_DB=bestwork ./bestwork-migrate
  systemctl restart bestwork-api bestwork-cron
"
```

### Frontend (Next.js)

```bash
# 1) kaynağı paketle (node_modules/.next hariç)
tar -czf /tmp/bw-front.tar.gz --exclude=node_modules --exclude=.next -C mlm-frontend .

# 2) yükle + build + restart
scp /tmp/bw-front.tar.gz root@212.154.77.35:/tmp/
ssh root@212.154.77.35 "
  cd /var/www/mahmutgazihanarslan/bestwork/frontend
  tar -xzf /tmp/bw-front.tar.gz
  NEXT_PUBLIC_API_URL=https://mahmutgazihanarslan.com.tr/api \
  NEXT_PUBLIC_BASE_PATH=/bestwork npm run build
  systemctl restart bestwork-frontend
"
```

## Sırlar

DB şifresi ve `JWT_SECRET`, systemd unit dosyalarında `Environment=` satırlarında tutulur:
- `/etc/systemd/system/bestwork-api.service`
- `/etc/systemd/system/bestwork-cron.service`
- `/etc/systemd/system/bestwork-frontend.service` (yalnızca `NEXT_PUBLIC_*`)

## Cloudflare (SSL + Performans)

Alan adı Cloudflare üzerinden (turuncu bulut) çözülür; tarayıcıya SSL'i Cloudflare verir.

- **SSL modu:** Panel → SSL/TLS → "Full" (origin'de artık doğru Let's Encrypt sertifikası var:
  `/etc/letsencrypt/live/mahmutgazihanarslan.com.tr/`, otomatik yenilenir) → "Full (strict)" de kullanılabilir.
- **Önbellekleme (performans):** Panel → Caching → Cache Rules:
  - `/bestwork/_next/static/*` → 30 gün (statik JS/CSS)
  - `/uploads/*` → 7 gün (görseller)
  - `/bestwork` HTML → 60 sn (TTC=1, public sayfa)
- **İsteğe bağlı:** CDN/WAF gerekmiyorsa DNS "DNS only" (gri bulut) yapılabilir → doğrudan origin'e gider
  (TTFB ~0.2 sn, Cloudflare katmanı kalkar).
- **Rate limit:** API, LiteSpeed'den gelen `X-Forwarded-For`'u okur (`TRUSTED_PROXIES=127.0.0.1`);
  Redis hız limitleri her kullanıcı IP'si için ayrı çalışır.

## Yayın URL'leri

- Site: https://mahmutgazihanarslan.com.tr/bestwork
- API:  https://mahmutgazihanarslan.com.tr/api
- Admin: admin@bestwork.com
