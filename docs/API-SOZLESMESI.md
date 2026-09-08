# BestWork API Para Birimi Sözleşmesi (2026-09-08)

## Standart (tek gerçek): DB **numeric** (tam ondalık TL) — para hatası yok.

| Katman | Birim | Açıklama |
|---|---|---|
| PostgreSQL | `numeric` (TL) | Depolama doğru; float yok |
| `internal/money` | `CentsFromTL`/`TLFromCents` | Tek dönüşüm noktası (kuruş ⇄ TL) + regresyon testleri |
| eshop API (`/api/eshop/*`) | **int64 kuruş** | Örn. `price: 85500` = ₺855,00 (eshop frontend tüketicisi) |
| Ham/raw API (`/api/products`, cüzdan vb.) | **TL float** | Yönetim paneli & legacy MLM istemcileri insan-okur TL bekler |

## Kurallar
1. Yeni para alanı = DB `numeric`; Go tarafında okuma/yazma **kuruş int64** aracılığıyla yapılmalı (servis katmanı float ara hesaplarını yalnız yuvarlama amacıyla kullanır).
2. `eshop` katmanı kuruş döndürür — ASLA değiştirilmez.
3. Ham/raw uçlar (admin/legacy) TL float döndürür — yalnızca **yonetim2 UI ile birlikte koordineli** fazda kuruşa geçilebilir (o zaman UI `/100` ile gösterir, kayıtta `*100` gönderir; test penceresi şart).
4. Yeni dönüşümlerde `internal/money` kullanılır; satır içi `math.Round(x*100)` tekrarı YASAK.

## Durum (2026-09-08)
- `internal/money` + testler: `37231ee` ✅
- eshop handler helper'a bağlandı (davranış korundu) ✅
- Ham uçlar→kuruş + yonetim2 UI `/100`: **bekleyen koordineli faz** (kullanıcı onayı + test penceresi gerekir; admin ekranı bozma riski yüzünden onaysız yapılmaz)
