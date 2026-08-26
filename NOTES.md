# BestWork MLM — Proje Notları / Karar Logu

Bu dosya, projedeki durum akışı ve mimari kararları kalıcı olarak kaydeder. Sunucu/dağıtım
değişiklikleri ve tasarım kararları için buraya bakın.

---

## MİMARİ KARAR — MUI'den tamamen vazgeçme → shadcn/ui + Tailwind

**Tarih:** 26 Ağu 2025 · **Durum:** KARAR VERİLDİ (henüz uygulanmadı)

- **Material Design (MUI v9) tamamen terk ediliyor.** Projede kalan tüm MUI bileşenleri
  (ThemeProvider, Box/Stack/Button/IconButton/Dialog/Grid/Drawer/CircularProgress vb.,
  `@mui/*` importları, MUI tema dosyaları) kaldırılacak.
- **Yerine:** [shadcn/ui](https://ui.shadcn.com) + **Tailwind CSS** kullanılacak.
- **Neden:** Kullanıcı Material tasarımından vazgeçti; daha hafif, özelleştirilebilir,
  modern bir bileşen seti istiyor.
- **Etkisi:** Büyük bir refactor. `mlm-frontend`'in tüm sayfa/bileşenlerini MUI'den
  Tailwind + shadcn bileşenlerine taşımak gerekecek. Görsel bütünlük korunmalı
  ("yazıyı bozma").
- **Not:** MUI tamamen kalkana kadar mevcut arayüz çalışır durumda. Geçiş, mevcut
  özellikleri (menü, karanlık mod, kartlar, çizelgeler, sepet, ağaç vb.) kırmadan
  parça parça yapılmalı.

---

## SON DAĞITIM DURUMU (canlı)

- **Genişlik:** Ana içerik + üst menü **%75**, ortalanmış (`margin-inline: auto`).
  - `src/app/globals.css` → `main { width: 75% }`
  - `src/components/landing/SiteNav.tsx` → `width: "75%"`
- **Karanlık mod:** `bg #09090b`, metin `#f9f9f9`, bölücü `#26262a` (yeşil yok).
  Marka yeşili `#476F16` accent/primary olarak kalır.
- **Mod kaydı:** `localStorage` anahtarı `bestwork_mode` + çerezi `bw_mode` (SSR).
  Sayfa yenilenince beyaz flash olmaması için çerez okunur.
- **Yazı tipi:** Plus Jakarta Sans (`--font-plus-jakarta`).
- **Kullanıcı adı:** BÜYÜK harfle (`MAHMUT GAZİHAN ARSLAN`).

## Dağıtım akışı (özet)
1. Mac'te düzenle → 2. `rsync` ile `/opt/bestwork-src` → 3. `git add/commit/push` →
4. `DEPLOY_SSH_PASS='<sunucu şifresi>' nohup /opt/bestwork-src/deploy.sh`. `deploy.sh`
   `origin/main`'i sıfırlar, o yüzden değişiklikler her zaman push edilmeli.
