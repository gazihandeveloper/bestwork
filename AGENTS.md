# Bestwork — Proje Bağlamı ve Çalışma Kuralları

Bu dosya, projede çalışan tüm opencode oturumları (özellikle WhatsApp worker'ı) tarafından
otomatik okunur. İstekleri buradaki bağlama ve akışa göre uygula.

## Proje yapısı
- `eshop/` — Next.js (App Router) e-ticaret + üye paneli. Dev: `npm run dev` (http://localhost:3000).
- `mlm-backend/` — Go API (sunucuda `bestwork-api:8090`).
- `mlm-yonetim-new/` — yönetim paneli (Next.js).
- `whatsapp-bridge/` — WhatsApp köprüsü + worker (Baileys). Panel: http://localhost:4599.

## Tasarım / kod kuralları
- Marka renkleri: **CV #29a56c** (yeşil), **PV mor**. Tipografi: Poppins/Montserrat; logo Quicksand.
- Ağaç görünümü **React Flow** (`@xyflow/react`); eski d3.zoom kaldırıldı.
- `/account`, `/cart`, `/checkout` sayfaları HTML `no-store`.
- Türkçe karakterleri koru; isimlerde İngilizce büyük `I` kullan (ör. `DIAMOND`).
- **Global CSS tuzağı:** `body *:not(h1..h6){ font-weight:400 !important }`. Kalın yazı gerekiyorsa
  h-tag, `.fw-*` yardımcı sınıfı veya `bw-dash` / `bw-cart` / `bw-tree-ui` kapsamını kullan.
- Yeni dosya/bağımlılık ekleme; istenen değişikliği **minimal** uygula.

## Sınırlar (ÖNEMLİ)
- Yalnızca **kod** değişikliği + deploy yap. **Veritabanına ve canlı veriye dokunma.**
- Kullanıcı/profil/veri güncelleme istekleri (ör. "profil ismimi ... yap", "bakiyeyi ... yap")
  kod işi değildir: **yapma**, kısaca "veri değişikliği, kod işi değil" diye raporla.
- Şifre/anahtar/secret okuma-yazma yok; `api.env` gibi dosyalara erişme.

## Görev akışı (her istek için sırayla)
0. **Link:** istekte http/https link varsa `webfetch` ile oku (gerekirse `websearch`); içeriği isteğe göre uygula.
1. **Bul:** ilgili dosyayı grep/glob ile çabuk bul. Repoyu baştan tarama.
2. **Yerel uygula:** istenen değişikliği minimal yap.
3. **Yerelde doğrula:**
   - `eshop/` ise: `cd eshop && npm run build`
   - `mlm-backend/` ise: `cd mlm-backend && go build ./...`
   - Yerel dev sunucusu açıksa `curl -s localhost:3000/` ile değişikliği gözle.
4. **Git + sunucu (tek komut):**
   `bash whatsapp-bridge/deploy-now.sh "kisa commit mesaji"`
   → commit + GitHub push + hızlı sunucu deploy (yalnız eshop, `npm install` yok).
5. Çıktıda `DONE` ve `BUILD=OK` görürsen başarılı say; `BUILD=FAIL` ise düzeltip tekrar dene.
6. **Tek satır Türkçe özet:** `Yapıldı: ...` veya `Yapılamadı: ...`.
   WhatsApp mesajını SEN GÖNDERME (worker gönderir).

## Deploy / sunucu
- Kaynak sunucuda `/opt/bestwork-src`; eshop yayını `/var/www/.../happyboon/frontend`.
- Yerelden GitHub'a push edilemez (kimlik yok); `deploy-now.sh` bunu sunucu üzerinden yapar.
- Tam deploy (yönetim paneli dahil) gerekirse sunucuda `deploy-live.sh` kullanılır; normalde gerekmez.

## WhatsApp worker
- Yalnızca **"panda"** ile başlayan mesajlar istek sayılır; "panda" öneki atılır.
- İş bitince gönderene **"İş emriniz tamamlandı 😊"** gider.
- Loglar: `~/Library/Logs/bestwork/wa-worker.log` (worker), `wa-bridge.log` (köprü).
