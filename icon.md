# BestWork — İkon Sistemi (Lucide)

> **Durum:** ✅ Geçiş tamamlandı · doğrulandı
> **Güncelleme:** 2026-09-13
> **Set:** Lucide (lucide.dev) · **Yöntem:** derin ESM import (tree-shaking)
> **Kapsam:** `eshop` + `mlm-yonetim-new`

---

## 1. Özet

| | eshop | Yönetim Paneli |
|---|---|---|
| Modül | `eshop/src/components/icons/index.tsx` | `mlm-yonetim-new/src/components/icons/index.tsx` |
| İkon | **115** | **31** + 4 marka işareti |
| Marka modülü | `brand-icons.tsx` (3) | `brand-icons.tsx` (4) |
| İkon kaynağı | `lucide-react` (tek paket) | `lucide-react` (tek paket) |
| Tip bildirimi | `src/types/lucide-deep.d.ts` | `src/types/lucide-deep.d.ts` |
| Bağımlılık (araç) | — | — |

**Uygulamalarda tek ikon kaynağı Lucide'dır.** Font Awesome'a ait tüm kalıntılar silindi.

---

## 2. Neden Lucide?

Font Awesome Free denemesinde ikonların **%77'sinin ince (regular) sürümü yoktu**;
sepet, çıkış ve arama gibi ikonlar yalnızca dolgu (solid) olarak sunuluyordu ve
arayüz olduğundan çok daha kalın/ağır görünüyordu. Lucide çizgi (outline) tabanlıdır
ve 2.098 ikonun tamamı tutarlı bir çizgi diline sahiptir.

---

## 3. Mimari — Tree-shaking garantisi

Üretilen modül **barrel import kullanmaz**. Her ikon kendi modülünden yeniden ihraç edilir:

```tsx
// ✅ DOĞRU — yalnızca bu ikon paketlenir
export { default as House } from "lucide-react/dist/esm/icons/house.mjs";

// ❌ YANLIŞ — tüm ikon setini paketleyebilir
import { House } from "lucide-react";
```

`lucide-react` paketinde `exports` haritası yoktur (derin import serbest) ve
`sideEffects: false` tanımlıdır → kullanılmayan ihraçlar pakete girmez.

### Ölçüm sonucu (production build)

| Kontrol | Sonuç |
|---|---|
| `banana` (kullanılmıyor) | ✅ pakette **yok** |
| `cat` (kullanılmıyor) | ✅ pakette **yok** |
| `axe` (kullanılmıyor) | ✅ pakette **yok** |
| `rocket` (kullanılmıyor) | ✅ pakette **yok** |
| `umbrella` (kullanılmıyor, panel) | ✅ pakette **yok** |
| `house` (kullanılıyor) | ✅ pakette **var** |

| | Boyut |
|---|---|
| Kullandığımız 115 ikon modülü (ham) | **76,9 KB** |
| 2.098 ikonun tamamı (barrel import olsaydı) | 1.574 KB |

---

## 4. eshop — İkon Eşlemesi (115)

| # | Yerel ad | Lucide |
|---|---|---|
| 1 | `AlertCircle` | `alert-circle` |
| 2 | `Apple` | `apple` |
| 3 | `ArrowDownLeft` | `arrow-down-left` |
| 4 | `ArrowLeft` | `arrow-left` |
| 5 | `ArrowRight` | `arrow-right` |
| 6 | `ArrowUpRight` | `arrow-up-right` |
| 7 | `Award` | `award` |
| 8 | `BadgeCheck` | `badge-check` |
| 9 | `BarChart3` | `chart-column-big` |
| 10 | `Bell` | `bell` |
| 11 | `Box` | `box` |
| 12 | `Boxes` | `boxes` |
| 13 | `Building2` | `building-2` |
| 14 | `Calendar` | `calendar` |
| 15 | `CalendarDays` | `calendar-days` |
| 16 | `Camera` | `camera` |
| 17 | `Check` | `check` |
| 18 | `CheckCircle` | `circle-check` |
| 19 | `CheckSquare` | `square-check` |
| 20 | `ChevronDown` | `chevron-down` |
| 21 | `ChevronLeft` | `chevron-left` |
| 22 | `ChevronRight` | `chevron-right` |
| 23 | `ChevronsLeft` | `chevrons-left` |
| 24 | `ChevronsRight` | `chevrons-right` |
| 25 | `CircleAlert` | `circle-alert` |
| 26 | `CircleCheck` | `circle-check` |
| 27 | `CircleNotch` | `loader-circle` |
| 28 | `Clock` | `clock` |
| 29 | `Code` | `code` |
| 30 | `Coffee` | `coffee` |
| 31 | `Coins` | `coins` |
| 32 | `Copy` | `copy` |
| 33 | `CreditCard` | `credit-card` |
| 34 | `Crown` | `crown` |
| 35 | `CupSoda` | `cup-soda` |
| 36 | `DollarSign` | `dollar-sign` |
| 37 | `Droplets` | `droplets` |
| 38 | `Edit2` | `square-pen` |
| 39 | `Eye` | `eye` |
| 40 | `EyeOff` | `eye-off` |
| 41 | `FileText` | `file-text` |
| 42 | `Filter` | `filter` |
| 43 | `FlaskConical` | `flask-conical` |
| 44 | `FolderTree` | `folder-tree` |
| 45 | `Gift` | `gift` |
| 46 | `GitBranch` | `git-branch` |
| 47 | `GitFork` | `git-fork` |
| 48 | `Headset` | `headset` |
| 49 | `Heart` | `heart` |
| 50 | `HeartPulse` | `heart-pulse` |
| 51 | `House` | `house` |
| 52 | `ImageIcon` | `image` |
| 53 | `Info` | `info` |
| 54 | `Landmark` | `landmark` |
| 55 | `Layers` | `layers` |
| 56 | `LayoutDashboard` | `layout-dashboard` |
| 57 | `Leaf` | `leaf` |
| 58 | `Link` | `link` |
| 59 | `ListChecks` | `list-checks` |
| 60 | `Lock` | `lock` |
| 61 | `LogIn` | `log-in` |
| 62 | `LogOut` | `power` |
| 63 | `Mail` | `mail` |
| 64 | `MapPin` | `map-pin` |
| 65 | `Megaphone` | `megaphone` |
| 66 | `Menu` | `menu` |
| 67 | `MessageSquare` | `message-square` |
| 68 | `Minus` | `minus` |
| 69 | `MoreHorizontal` | `more-horizontal` |
| 70 | `Network` | `network` |
| 71 | `Package` | `package` |
| 72 | `PackagePlus` | `package-plus` |
| 73 | `Paintbrush` | `paintbrush` |
| 74 | `Palette` | `palette` |
| 75 | `PanelBottom` | `panel-bottom` |
| 76 | `PenLine` | `pen-line` |
| 77 | `Pencil` | `pencil` |
| 78 | `Percent` | `percent` |
| 79 | `Phone` | `phone` |
| 80 | `Pill` | `pill` |
| 81 | `Plus` | `plus` |
| 82 | `Receipt` | `receipt` |
| 83 | `RefreshCw` | `refresh-cw` |
| 84 | `RotateCcw` | `rotate-ccw` |
| 85 | `Scale` | `scale` |
| 86 | `Search` | `search` |
| 87 | `Send` | `send` |
| 88 | `Share2` | `share-2` |
| 89 | `Shield` | `shield` |
| 90 | `ShieldCheck` | `shield-check` |
| 91 | `ShoppingBag` | `shopping-bag` |
| 92 | `ShoppingCart` | `shopping-cart` |
| 93 | `Sliders` | `sliders` |
| 94 | `Sparkles` | `sparkles` |
| 95 | `Square` | `square` |
| 96 | `Star` | `star` |
| 97 | `SwatchBook` | `swatch-book` |
| 98 | `Tag` | `tag` |
| 99 | `Ticket` | `ticket` |
| 100 | `Trash2` | `trash-2` |
| 101 | `TrendingDown` | `trending-down` |
| 102 | `TrendingUp` | `trending-up` |
| 103 | `TriangleAlert` | `triangle-alert` |
| 104 | `Trophy` | `trophy` |
| 105 | `Truck` | `truck` |
| 106 | `Upload` | `upload` |
| 107 | `User` | `user` |
| 108 | `UserCheck` | `user-check` |
| 109 | `UserPlus` | `user-plus` |
| 110 | `Users` | `users` |
| 111 | `Wallet` | `wallet` |
| 112 | `Wifi` | `wifi` |
| 113 | `X` | `x` |
| 114 | `XCircle` | `circle-x` |
| 115 | `Zap` | `zap` |

---

## 5. Yönetim Paneli — İkon Eşlemesi (31 + 4)

| # | Yerel ad | Lucide |
|---|---|---|
| 1 | `BarsIcon` | `menu` |
| 2 | `BellIcon` | `bell` |
| 3 | `BoxIcon` | `box` |
| 4 | `CalendarDaysIcon` | `calendar-days` |
| 5 | `CheckIcon` | `check` |
| 6 | `ChevronDownIcon` | `chevron-down` |
| 7 | `ChevronLeftIcon` | `chevron-left` |
| 8 | `ChevronRightIcon` | `chevron-right` |
| 9 | `CircleCheckIcon` | `circle-check` |
| 10 | `CircleExclamationIcon` | `circle-alert` |
| 11 | `CircleInfoIcon` | `info` |
| 12 | `CircleUserIcon` | `circle-user` |
| 13 | `CircleXmarkIcon` | `circle-x` |
| 14 | `ClockIcon` | `clock` |
| 15 | `CubeIcon` | `package` |
| 16 | `DollarSignIcon` | `dollar-sign` |
| 17 | `EllipsisIcon` | `more-horizontal` |
| 18 | `EnvelopeIcon` | `mail` |
| 19 | `EyeIcon` | `eye` |
| 20 | `EyeSlashIcon` | `eye-off` |
| 21 | `GearIcon` | `settings` |
| 22 | `HouseIcon` | `house` |
| 23 | `MagnifyingGlassIcon` | `search` |
| 24 | `MoonIcon` | `moon` |
| 25 | `PenIcon` | `pen` |
| 26 | `PlusIcon` | `plus` |
| 27 | `RightFromBracketIcon` | `power` |
| 28 | `SunIcon` | `sun` |
| 29 | `TriangleExclamationIcon` | `triangle-alert` |
| 30 | `UploadIcon` | `upload` |
| 31 | `XmarkIcon` | `x` |

### Marka işaretleri (Lucide marka ikonu barındırmaz)

| Yerel ad | Marka | eshop | panel |
|---|---|---|---|
| `FacebookFIcon` | facebook | — | ✅ |
| `GoogleIcon` | google | — | ✅ |
| `InstagramIcon` | instagram | ✅ | ✅ |
| `LinkedinInIcon` | linkedin | — | ✅ |
| `FacebookIcon` | facebook | ✅ | — |
| `TwitterIcon` | twitter | ✅ | — |

> Kaynak: Font Awesome Free — Brands (CC BY 4.0). Marka işaretleri sahiplerinin tescilli markalarıdır.

---

## 6. SVG Durumu

### Uygulama kodunda ham ikon SVG'si: **YOK** ✅

Kalan 3 `<svg>` ikon değildir:

| Konum | Ne |
|---|---|
| `eshop/app/account/success-report/page.tsx` ×2 | Alan grafiği (veri görselleştirme) |
| `eshop/components/BinaryTreeView.tsx` ×1 | Ağaç tuvali (etkileşimli SVG yüzeyi) |

Bu turda SVG'den bileşene çevrilenler:

| Nereden | Ne | Nasıl |
|---|---|---|
| `eshop/components/layout/Footer.tsx` | 7 theme ikonu (`<img src="*.svg">`) | Lucide bileşeni |
| `mlm-yonetim-new/.../ModalBasedAlerts.tsx` | 4 dekoratif 90px rozet | SVG'siz `<div>` dairesi |
| `eshop/public` | 5 Next.js şablon SVG'si (kullanımsız) | silindi |

Kalan SVG **dosyaları** (ikon değil): logo/favicon (4), ülke bayrakları (8),
404 illüstrasyonları (2), grafik/şekil dosyaları (2).

---

## 7. Üretici

```bash
node tools/build-icons.mjs          # ikon modüllerini üret
node tools/build-icons.mjs --check  # güncel mi?
```
Üretici **hiçbir bağımlılığa ihtiyaç duymaz** (`tools/` içinde package bağımlılığı yoktur).
Yeni ikon eklemek: `tools/lucide-esleme.json` içine `"YerelAd": "lucide-adi"` ekle →
`node tools/build-icons.mjs` çalıştır. Var olmayan bir Lucide adı yazılırsa üretici hata verir.

| Dosya | Görev |
|---|---|
| `tools/lucide-esleme.json` | Eşleme tablosu (tek doğruluk kaynağı) |
| `tools/brand-icons.json` | Marka işaretlerinin yol verisi |
| `tools/build-icons.mjs` | Üretici |

---

## 8. Doğrulama

| Kontrol | eshop | Panel |
|---|---|---|
| `tsc --noEmit` | ✅ temiz | ✅ temiz |
| `eslint` | ✅ temiz | ⚠️ 12 hata (hepsi önceden mevcut, ikonla ilgisiz) |
| `npm run build` | ✅ başarılı | ✅ başarılı |
| Tarayıcı (7 + 8 sayfa) | ✅ konsol hatası yok | ✅ konsol hatası yok |
| Tree-shaking | ✅ doğrulandı | ✅ doğrulandı |

---

## 9. Bu Turda Silinen Kalıntılar

| Ne | Adet |
|---|---|
| Font Awesome araç paketleri (`tools/node_modules`) | 4 paket |
| `tools/icon-manifest.json` (FA eşlemesi) | 1 |
| `tools/migrate-panel-icons.py` (tek seferlik FA betiği) | 1 |
| Font Awesome ile üretilmiş 2300+1240 satırlık ikon modülleri | 2 |
| `eshop/public` Next.js şablon SVG'leri | 5 |
| `eshop/public/images/theme/icons` (bileşene çevrildi) | 7 |

**Sonuç:** ikon başına ~20 satır SVG gömme yerine tek satır derin import.
Modül boyutu 3.540 satır → **296 satır**.

---

## 10. İlerleme

- [x] Lucide'a geçiş (eshop 115 · panel 31 + 4 marka)
- [x] Derin ESM import ile tree-shaking kuruldu ve ölçüldü
- [x] Font Awesome ve tüm kalıntıları silindi
- [x] Tüm inline ikon SVG'leri bileşene çevrildi
- [x] Footer theme ikonları + modal rozetleri SVG'siz hale getirildi
- [x] Tip bildirimleri eklendi (`lucide-deep.d.ts`)
- [x] Build + tarayıcı doğrulaması (her iki uygulama)