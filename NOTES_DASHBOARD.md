# BestWork MLM Dashboard — Eksiksiz İnceleme Notları

Kaynak: https://mahmutgazihanarslan.com.tr/bestwork/dashboard
Panel: `/bestwork` (mlm-frontend, Next.js, port 3005) → BestWork API (8090)
Hedef: bestwork2 `/account` sayfasını bu dashboard ile birebir eşleştirmek.

---

## 1) Sayfa Dosyası

`/var/www/mahmutgazihanarslan/bestwork/frontend/src/app/dashboard/page.tsx` (811 satır)

### Yapı
- `DashboardPage` → `<RequireAuth><DashboardContent /></RequireAuth>` (giriş zorunlu)
- `isAdmin` ise `<AdminHome/>` (farklı admin görünümü) — üye dashboard'u admin'e gösterilmez
- Admin değilse üye dashboard:
  - **Sol profil kartı** (3 kolon): foto (yükleme hover kamera), ad, Aktif rozeti, Üye No (kopyala), Rütbe (kariyer sayfasına), Başarı Raporu linki, altta **Üye Kayıt Linkiniz**
  - **Sağ istatistik kartları** (9 kolon): 8 StatBlock kart
  - **Modallar**: Yerleşim Bekleyen Üyeler listesi, Paket Seviyenizi Yükseltin (sepet + seviye çizgileri)

---

## 2) Sayfanın Çağırdığı TÜM API'ler

| Fonksiyon | HTTP | Endpoint | Auth | Dönüş |
|---|---|---|---|---|
| `getDashboard()` | GET | `/dashboard` | JWT | `{ dashboard: UserDashboard }` |
| `getMe()` | GET | `/user/me` | JWT | `{ user: User }` |
| `getRanks()` | GET | `/ranks` | public | `{ ranks: Rank[] }` |
| `getPackages()` | GET | `/packages` | public | `{ packages: Package[] }` |
| `listSponsored()` | GET | `/user/sponsored` | JWT | `{ users: User[] }` |
| `listPendingUsers()` | GET | `/pending-pool` | JWT | `{ pending_users: User[] }` |
| `getProfile()` | GET | `/user/profile` | JWT | `{ profile: {...} }` |
| `updateProfileImage()` | PUT | `/user/profile-image` | JWT | — |
| `uploadFile()` | POST | `/upload` | JWT | `{ file_path }` |
| `listProducts()` | GET | `/products` | public | `{ products: Product[] }` |

Yükleme akışı:
```ts
const [d, r, pk, sp, pend, pr] = await Promise.all([
  getDashboard(), getRanks(), getPackages(),
  listSponsored(), listPendingUsers(), listProducts(),
])
setData(d); setRanks(r); setPackages(pk); setSponsoredCount(sp.length); setPendingCount(pend.length)
getProfile().then(p => setProfileImage(p.profile_image))
```

Yenileme: 5 saniyede bir + pencere odağında `refresh()` → `getDashboard()+getMe()+listPendingUsers()`.

---

## 3) UserDashboard Veri Modeli (backend UserDashboard JSON)

```jsonc
{
  "user": { "id", "name", "email", "member_code", "package": null|"string", "rank": null|"string" },
  "wallet": { "id","user_id","balance","total_earned","total_withdrawn","chip_balance","blocked_balance","updated_at" },
  "total_referral_earnings": number,   // Referans (sponsorluk) primleri toplamı
  "total_binary_earnings": number,     // Binary primleri toplamı
  "total_matching_earnings": number,   // Liderlik/matching primleri toplamı
  "total_retail_earnings": number,     // Perakende kazançları toplamı
  "monthly_earned": number,            // Bu cari dönem kazanç (Anlık Kazanç)
  "monthly_matched_cv": number,        // Bu ay eşleşen CV (Anlık Eşleşme CV)
  "leg_cv_left_total": number,         // Sol bacak toplam CV
  "leg_cv_right_total": number,        // Sağ bacak toplam CV
  "monthly_match_count": number,       // Bu ay eşleşme sayısı
  "left_team_count": number,           // Sol takım üye
  "right_team_count": number,          // Sağ takım üye
  "left_pv": number, "right_pv": number, "left_cv": number, "right_cv": number,
  "recent_commissions": [ ... ],
  "recent_orders": [ ... ],
  "current_rank": { "id","name","monthly_binary_limit" } | null,
  "current_package": { "id","name" } | null,
  "activity": { "month_packages", "goal" } | null
}
```

`me` (User) ek alanlar: `total_pv_accumulated`, `current_rank_id`, `package_id`, `is_active`, `sponsor_id`, `created_at` vb.

---

## 4) Ek API Modelleri

**Rank** (GET /ranks): `{ id, name, required_left_pv, required_right_pv, monthly_binary_limit, required_downline_rank_id?, required_downline_count?, personal_activity_pv? }`
→ 12 kariyer (Jade→Ambassador); "Ünvan" kartında `steps.total = 12`, dolu = rankIndex+1.

**Package / Seviye** (GET /packages): `{ id, name, required_pv, discount_rate }` — ek alanlar backend'de `price, referral_bonus_rate, binary_bonus_rate, matching_bonus_rate`.
→ 5 seviye: Girişimci(0 PV), Starter250, Bronze500, Gümüş1300, Altın2500, Platin5000.
→ "Seviyeniz" kartında `steps.total = 5`.

**Product**: `{ id, name, price, pv, cv, stock, image_path, category_id?, category_name?, sku }`
→ Sepet güncel PV = `cart.items.reduce(pv*qty)`; perakende = `retail ürünlerin price*qty`.

---

## 5) Kart Detayları (StatBlock kullanımı)

| Kart | value | steps/kalan | info (arka yüz) | tıklayınca |
|---|---|---|---|---|
| Ünvan | `(d.user.rank || "GİRİŞİMCİ").toUpperCase("en-US")` | steps filled=rankIndex+1 / 12 | "Sistemdeki en yüksek kariyer unvanınız" | `/career` |
| Güncel Kariyeriniz | aynı ünvan | — | "Bu ayki güncel kariyeriniz" | `/career` |
| Seviyeniz | `actualPkgName` (PV bazlı gerçek paket) | steps filled=actualLevelIndex / 5 | "Alışveriş PV arttıkça otomatik yükselir" | — (modal açılmaz) |
| Sponsor Olduklarım | `sponsoredCount` | — | "Doğrudan kaydettiğiniz 1. hat üyeler" | `/sponsor-tree` |
| Ekibim | `sol / sağ` | kalanBoxes Sol/Sağ = team_count | "Binary ağacındaki toplam üye" | `/tree` |
| Anlık Eşleşme | `monthly_matched_cv CV` | kalanBoxes = leg_cv_left/right | "Kısa kol ile eşleşen puan" | `/binary-transactions` |
| Kişisel Toplam Kazanç | `wallet.total_earned ₺` (2 hane) | — | "Katılımınızdan beri toplam kazanç" | `/commissions` |
| Yerleşim Bekleyen | `pendingCount` | — | "Ağaca yerleştirilmeyi bekleyenler" | modal |
| Anlık Kazanç | `monthly_earned ₺` | — | "Bu cari dönem hakedişiniz" | `/commissions?type=binary` |

Not: "GİRİŞİMCİ" ünvansız/paketsiz kullanıcı için varsayılan etikettir (Ender sıfırlandığında olduğu gibi).

---

## 6) Seviye / Paket Yükselt Mantığı (modal)

- Kırmızı buton yalnızca `actualLevelIndex < 5` iken: "Üyelik seviyenizi yükseltmek için tıklayınız" (animate-pulse)
- `pv = me.total_pv_accumulated`; `sortedPkgs` required_pv sıralı
- `actualPkgByPV = son p.required_pv>0 && pv>=p.required_pv`
- `actualPkg = max(actualPkgByPV, pkgByName)` → **gerçek seviye** (yalnız onaylı PV)
- `projectedPV = pv + cartPV` → modal önizleme seviyesi
- 5 çizgi: `i<levelIndex → %100`; `i===levelIndex → currentSegPct`
- Ürünler perakende fiyatından sepete eklenir (`addRetailToCart`); toplam PV/Tutar gösterilir; Sepete Git → `/cart`

---

## 7) BestWork2 (eshop /bestwork2) Durumu — Ne Eksik

bestwork2 hesap kullanıcısı BestWork DB kullanıcısıdır (eshop login = BestWork JWT; `/users/me`, `/dashboard` eshop wrapper'ları hazır).

Eshop'ta KARŞILIĞI OLAN:
- `GET /eshop/dashboard` → UserDashboard (aynı veri) ✅ hazır
- `GET /eshop/users/me` → me (eshop şekli; member_code yok!) ⚠️
- `GET /api/products`, `/api/categories` ✅
- `GET /api/orders`, `/api/wallet` ✅

Eshop'ta KARŞILIĞI OLMAYAN (dashboard için gerekli):
- `GET /ranks` (kariyer listesi — "Ünvan" çizgisi 12) ❌
- `GET /packages` (seviye listesi — "Seviyeniz" çizgisi 5 + paket adları) ❌
- `GET /user/sponsored` (Sponsor Olduklarım sayısı) ❌
- `GET /pending-pool` (Yerleşim Bekleyen sayısı + liste) ❌
- `GET /user/profile` + PUT `/user/profile-image` + POST `/upload` (profil fotoğrafı) ❌
- `/user/me` alanları: `total_pv_accumulated`, `current_rank_id`, `package_id`, `is_active` ❌ (eshop me yalnız id/email/isim)

### Önerilen eshop uyumlu endpoint'ler
BestWork'e şu eshop-uyumlu sarmalayıcılar eklenebilir (`/api/eshop/*`, `{success,data}`):
- `GET /eshop/me` → BestWork `/user/me` içeriği (member_code + pv + rank_id + package_id dahil)
- `GET /eshop/ranks` → `/ranks`
- `GET /eshop/packages` → `/packages`
- `GET /eshop/sponsored` → `/user/sponsored` (count için)
- `GET /eshop/pending-pool` → `/pending-pool` (count + liste)
- `GET /eshop/profile` → `/user/profile`; `PUT /eshop/profile-image`; `POST /eshop/upload`
- Rewrite'lar: `/api/ranks`, `/api/packages`, `/api/sponsored`, `/api/pending-pool`, `/api/profile`, `/api/profile-image`, `/api/upload`

### Alternatif (daha basit) — doğrudan BestWork `/api/*` proxy
Eshop next.config'te her route'u BestWork'e eklemek yerine tek **catch-all**: `/api/:path* → http://localhost:8090/api/:path*` (auth + katalog dışı her şey). Ancak dikkat: mevcut eshop-uyumlu endpoint isimleri (eshop/products vb.) ile çakışma yoktur; `/api/products` BestWork raw şekli döndürür — eshop katalog sayfaları zaten eshop şekline çevrilmiştir. Bu yüzden **catch-all kullanılmamalı**, whitelist yaklaşımı sürdürülmeli.

---

## 8) Eshop'taki CSS/renk notları
- Eshop storefront Tailwind default renkler kullanır (bestwork panelin bg-card/border-border/primary gibi @theme değişkenleri eshop'ta yok)
- Eshop marka rengi `brand-500` (#2563eb benzeri); bestwork panel yeşil/mavi `--primary` değişkenleri ayrı
- Birebir aynı görünüm isteniyorsa bestwork panelin Tailwind theme değişkenleri eshop globals'ine taşınmalı VEYA eshop kendi tasarımında karşılık üretilmeli
