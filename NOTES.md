# BestWork MLM — Proje Notları / Karar Logu

Bu dosya, projedeki durum akışı ve mimari kararları kalıcı olarak kaydeder. Sunucu/dağıtım
değişiklikleri ve tasarım kararları için buraya bakın.

---

## MİMARİ KARAR — MUI'den tamamen vazgeçme → shadcn/ui + Tailwind

**Tarih:** 26 Ağu 2025 · **Durum:** UYGULANIYOR (parça parça)

- **Material Design (MUI v9) tamamen terk ediliyor.** Projede kalan tüm MUI bileşenleri
  (`@mui/*` importları, MUI tema dosyaları) kaldırılacak.
- **Yerine:** [shadcn/ui](https://ui.shadcn.com) + **Tailwind CSS** kullanılacak.
- **Tamamlanan parçalar (canlıda):**
  - Anasayfa (landing): SiteNav, Hero, Benefits, FeaturedProducts, Corporate, Footer, Reveal
  - `/shop` (kategori + arama + ürün kartları)
  - `/product/[id]` (detay + adet + sepete ekle)
  - `/login`, `/register` (tüm alanlar, doğrulama, sponsor akışı korundu)
- **Kalan:** dashboard ve tüm backoffice sayfaları, CartDrawer, LoginDialog, AppShell,
  FloatingNavbar, BackofficeMenu, tree vb. (MUI'de çalışıyor, parça parça taşınacak).
- **Not:** Geçiş, mevcut özellikleri (menü, karanlık mod, sepet, ağaç vb.) kırmadan yapılmalı.

---

## YEREL (MAC) KURULUM — 26 Ağu 2025

- `/Users/mahmutgazihanarslan/Desktop/Bestwork` artık **git repo** (origin = GitHub
  `gazihandeveloper/bestwork`). Lokalden `git push` çalışır.
- Kimlik: `~/.git-credentials` yazılamadığı için repo-local helper:
  `git config credential.helper "store --file=/Users/mahmutgazihanarslan/Desktop/Bestwork/.git-credentials"`
  (dosya `.gitignore`'da, **asla commit edilmez** — sunucu şifresi/pat içerir).
- Yerel dev: `cd mlm-frontend && NEXT_PUBLIC_API_URL=https://mahmutgazihanarslan.com.tr/api npm run dev`
  → `http://localhost:3000` (canlı API'ye bağlı; backend lokalde yok, Go/Postgres kurulmadı).
- CORS: backend `CORS_ORIGINS` artık `https://mahmutgazihanarslan.com.tr,http://localhost:3000`
  (yerel dev için localhost izni eklendi).
- Lokalde Go ve psql **yok**; backend'i yerelde çalıştırmak istersen sunucudaki
  `/opt/bestwork-src` üzerinden veya Docker ile kurulmalı.

---

## SON DAĞITIM DURUMU (canlı)

- **Genişlik:** Ana içerik + üst menü **%75**, ortalanmış (`margin-inline: auto`).
  - `src/app/globals.css` → `main { width: 75% }`
  - `src/components/landing/SiteNav.tsx` → `width: "75%"`
- **Karanlık mod:** `bg #09090b`, metin `#f9f9f9`, bölücü `#26262a` (yeşil yok).
  Marka yeşili `#476F16` accent/primary olarak kalır.
- **Mod kaydı:** `localStorage` anahtarı `bestwork_mode` + çerezi `bw_mode` (SSR).
  Sayfa yenilenince beyaz flash olmaması için çerez okunur. Tailwind `.dark` sınıfı
  `<html>` üzerinde SSR cookie ile senkron.
- **Yazı tipi:** Plus Jakarta Sans (`--font-plus-jakarta`).
- **Kullanıcı adı:** BÜYÜK harfle (`MAHMUT GAZİHAN ARSLAN`).
- **shadcn bileşenleri:** `src/components/ui/` — button, card, input, dialog, sheet,
  badge, skeleton, separator, select, textarea (Radix + cva + cn).

## Dağıtım akışı (özet)
1. Mac'te düzenle → 2. `git add/commit/push` (GitHub yedeği) →
3. Sunucuda: `git -C /opt/bestwork-src fetch origin && git reset --hard origin/main` →
4. `DEPLOY_SSH_PASS='<sunucu şifresi>' nohup /opt/bestwork-src/deploy.sh`.
   (Sunucu `/opt/bestwork-src` git repo'dur; deploy öncesi GitHub ile eşitlenir.)
