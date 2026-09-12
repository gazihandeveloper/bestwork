# BestWork — Yerel Geliştirme Kurulumu (macOS / Apple Silicon)

Bu doküman, `bestwork` reposunu (eshop Next.js, mlm-backend Go, mlm-yonetim-new Next.js)
yerel macOS makinede ayağa kaldırmak içindir.

## 0) Mimari notu (önemli)

- **Üretim sunucusu:** Ubuntu, **Intel x86_64** (OpenLiteSpeed + systemd).
- **Yerel makine:** **Apple Silicon (arm64)**.
- Sunucudaki derlenmiş çıktılar (`bestwork-api`, `bestwork-cron`, `bestwork-migrate`,
  `*.exe`, `.next/`, `node_modules/`) **taşınmaz**. Hepsi kaynaktan yerel (arm64) derlenir.
- PostgreSQL dump'ı PG **18.6** custom-format'tır → yerelde de **PostgreSQL 18** kullanılmalıdır.

## 1) Gerekli araçlar

| Araç | Sürüm |
|---|---|
| git | 2.50+ |
| Homebrew | 6.x |
| Node.js | v24.21.0 |
| npm | 11.19.0 |
| Go | 1.27.1 (proje `go 1.26.6`) |
| PostgreSQL | 18.6 |
| Redis | 8.10.1 |
| rsync (GNU) | 3.5.0 (opsiyonel) |

## 2) Kurulum (Homebrew)

```bash
brew install go postgresql@18 redis rsync
# opsiyonel: brew install hudochenkov/sshpass/sshpass
```

Brew prefix'leri:

```bash
brew --prefix postgresql@18   # /opt/homebrew/opt/postgresql@18
brew --prefix go              # /opt/homebrew/opt/go
brew --prefix redis           # /opt/homebrew/opt/redis
```

## 3) Repoyu klonla

```bash
mkdir -p ~/Desktop/Bestwork/{src,db,config,logs}
git clone https://github.com/gazihandeveloper/bestwork.git ~/Desktop/Bestwork/src
cd ~/Desktop/Bestwork/src
```

## 4) PostgreSQL (yerel)

Servisi başlat:

```bash
brew services start postgresql@18
```

Rol ve veritabanı oluştur (parolayı ortam değişkeninden alın; gerçek değer yazmayın):

```bash
psql -d postgres -c "CREATE ROLE bestwork LOGIN PASSWORD '$POSTGRES_PASSWORD';"
psql -d postgres -c "CREATE DATABASE bestwork OWNER bestwork;"
```

Canlı dump'ı restore et (dosya adını güncel tarihle değiştirin):

```bash
pg_restore -h 127.0.0.1 -U bestwork -d bestwork \
  --no-owner --role=bestwork \
  ~/Desktop/Bestwork/db/bestwork_YYYYMMDD_HHMMSS.dump
```

Doğrulama:

```bash
psql -h 127.0.0.1 -U bestwork -d bestwork -c "\dt"   # 28 tablo görünmeli
```

> Dump, `/var/www/mahmutgazihanarslan/backups/pgdump/` içindeki en güncel
> `bestwork_*.dump` dosyasıdır. Yeni dump almak için sunucuda
> `/usr/local/bin/bestwork-pgdump.sh` çalışır (izinsiz tetiklemeyin).

## 5) Redis

```bash
brew services start redis
redis-cli ping   # PONG
```

## 6) Env dosyaları

Gerçek sırlar **yalnızca** yerel `.env` / `.env.local` dosyalarında tutulur ve
**asla commit edilmez** (bkz. `.gitignore`). Şablonlar:

```bash
cp mlm-backend/.env.example mlm-backend/.env
cp eshop/.env.example eshop/.env.local
cp mlm-yonetim-new/.env.example mlm-yonetim-new/.env.local
```

Gerekli değişken **isimleri**:

- `mlm-backend/.env`: `APP_PORT`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`,
  `POSTGRES_PASSWORD`, `POSTGRES_DB`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`,
  `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECURE`, `GIN_MODE`, `CORS_ORIGINS`, `TRUSTED_PROXIES`
- `eshop/.env.local`: `NEXT_PUBLIC_API_URL`
- `mlm-yonetim-new/.env.local`: `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_API_URL`

## 7) Uygulamaları ayağa kaldırma

### mlm-backend (Go) — port 8090

```bash
cd ~/Desktop/Bestwork/src/mlm-backend
go mod download
go build -o bin/bestwork-api     ./cmd/api
go build -o bin/bestwork-cron    ./cmd/cron
go build -o bin/bestwork-migrate ./cmd/migrate
# migration (idempotent):
./bin/bestwork-migrate
# API:
./bin/bestwork-api
```

### eshop (Next.js) — port 3000 (kök site)

```bash
cd ~/Desktop/Bestwork/src/eshop
npm install
npm run dev                       # http://localhost:3000
# üretim benzeri:
npm run build && npm run start -- -p 3000
```

### mlm-yonetim-new (Next.js) — port 3007, basePath `/bestmanager`

```bash
cd ~/Desktop/Bestwork/src/mlm-yonetim-new
npm install
NEXT_PUBLIC_BASE_PATH=/bestmanager npm run build
npm run start -- -p 3007          # http://localhost:3007/bestmanager
```

## 8) Log yolları ve durdurma

- Yerel log dizini: `~/Desktop/Bestwork/logs/`
- Örnek loglama:
  ```bash
  ./bin/bestwork-api > ~/Desktop/Bestwork/logs/api.log 2>&1 &
  npm run start -- -p 3000 > ~/Desktop/Bestwork/logs/eshop.log 2>&1 &
  ```
- Durdurma:
  ```bash
  lsof -tiTCP:8090 -sTCP:LISTEN | xargs kill   # backend
  lsof -tiTCP:3000 -sTCP:LISTEN | xargs kill   # eshop
  lsof -tiTCP:3007 -sTCP:LISTEN | xargs kill   # yonetim2
  ```
- PostgreSQL / Redis durdurma: `brew services stop postgresql@18` / `brew services stop redis`

## 9) Sağlık kontrolü

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8090/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3007/bestmanager
```
