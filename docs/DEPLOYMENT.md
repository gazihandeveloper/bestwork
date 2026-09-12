# BestWork — Sunucu Dağıtım (Deploy) Akışı

Bu doküman üretim sunucusuna dağıtımın nasıl çalıştığını özetler. **Sır içermez.**

## Topoloji (özet)

| Bileşen | Yol / Servis | Port |
|---|---|---|
| Kök site (eshop, Next.js) | `/var/www/mahmutgazihanarslan/happyboon/frontend` · `happyboon-frontend` | 3000 |
| Yönetim paneli (TailAdmin) | `/var/www/mahmutgazihanarslan/bestwork/yonetim2` · `bestwork-yonetim2` | 3007 (`/bestmanager`) |
| Go API | `/var/www/mahmutgazihanarslan/bestwork/backend` · `bestwork-api` | 8090 |
| Zamanlanmış görev | `bestwork-cron` | — |
| Reverse proxy | OpenLiteSpeed (`lshttpd`) | 80/4430 |

- Kaynak repo: `/opt/bestwork-src` (origin: `github.com/gazihandeveloper/bestwork`, `main`).
- DB: PostgreSQL `bestwork` (rol `bestwork`). Sırlar: `/etc/bestwork/api.env` (izin 600).
- Otomatik yedek: `/usr/local/bin/bestwork-pgdump.sh` → `/var/www/mahmutgazihanarslan/backups/pgdump/` (günde 2x, 14 gün rotasyon).

## `deploy-live.sh` ne yapar?

`/root/deploy-live.sh` sırasıyla:

1. **pg_dump güvenlik yedeği** (`bestwork-pgdump.sh`, başarısız olsa da devam).
2. **git senkron:** `git fetch origin main` + `git reset --hard origin/main`.
3. **rsync + build + restart** (`build_one` fonksiyonu):
   - `eshop/` → `happyboon/frontend/` → `npm install` + `npm run build` → `systemctl restart happyboon-frontend`
   - `mlm-yonetim-new/` → `bestwork/yonetim2/` → `npm install` + `npm run build` → `systemctl restart bestwork-yonetim2`
     (`NEXT_PUBLIC_BASE_PATH=/bestmanager`, `NEXT_PUBLIC_API_URL=...`)
4. **Doğrulama:** `curl` ile 3000 / 3007 / 8090 `/health` HTTP kodları.

rsync hariç tutmaları: `node_modules`, `.next`, `.env*`, `*.log`, `*.bak*`, `.DS_Store`.

> Not: Go backend (`eshop`/`yonetim2` dışında) ayrı derleme + `migrate` + binary swap + restart akışıyla güncellenir.

## Dağıtım komutu

```bash
/root/deploy-live.sh        # script yoksa: /opt/bestwork-src/deploy-live.sh
```

## Dağıtım sonrası doğrulama

```bash
systemctl is-active bestwork-api bestwork-cron bestwork-yonetim2 happyboon-frontend
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8090/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3007/bestmanager
cd /opt/bestwork-src && git log --oneline -1
```

## Geri alma (rollback)

Dağıtım bozulursa bilinen iyi commit'e dönüp yeniden yayınla:

```bash
cd /opt/bestwork-src
git reset --hard <IYI_COMMIT>
/root/deploy-live.sh
```

## İş akışı kuralı

1. Kodu değiştir → 2. `git commit` + `git push origin main` → 3. sunucuda `deploy-live.sh`.
Adım 2 atlanırsa değişiklik GitHub'da kaybolur; adım 3 atlanırsa canlı eski kalır.
