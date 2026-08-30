# BestWork — Kariyer & Liderlik Sistemi (FİNAL ŞARTNAME — v3)

> Networkçıya sunulacak, kodlanabilir net şartname. Onay verilince kodlanıp canlıya alınır.

---

## 1. Kariyer Merdiveni (12 basamak)

**First Line bir kariyer değildir.** "First Line" = sizin birebir kaydettiğiniz kişiler
(1. nesil / ilk kayıtlar). Kariyer merdiveni **Jade** ile başlar.

Her basamakta **sol bacak** ve **sağ bacak** şartı ayrı ayrı sağlanmalıdır.

| # | Kariyer | Sol bacak | Sağ bacak | Alt üye kaynağı |
|---|---------|-----------|-----------|-----------------|
| 1 | **Jade** (Yeşim) | 5.000 PV | 5.000 PV | spillover dahil |
| 2 | **Pearl** (İnci) | 15.000 PV | 15.000 PV | spillover dahil |
| 3 | **Safir** | 1 Jade | 1 Jade | kendi neslinden |
| 4 | **Yakut** (Ruby) | 1 Pearl | 1 Pearl | kendi neslinden |
| 5 | **Zümrüt** | 2 Pearl | 2 Pearl | kendi neslinden |
| 6 | **Elmas** (Diamond) | 2 Safir + **500.000 PV** | 2 Safir + **500.000 PV** | Safir: kendi neslinden · PV: spillover dahil |
| 7 | **Blue Diamond** | 2 Yakut | 2 Yakut | kendi neslinden |
| 8 | **Green Diamond** | 2 Zümrüt | 2 Zümrüt | kendi neslinden |
| 9 | **Red Diamond** | 2 Elmas | 2 Elmas | kendi neslinden |
| 10 | **Black Diamond** | 2 Blue Diamond | 2 Blue Diamond | kendi neslinden |
| 11 | **President** | 2 Green Diamond | 2 Green Diamond | kendi neslinden |
| 12 | **Ambassador** | 2 Red Diamond | 2 Red Diamond | kendi neslinden |

> **Bütün kariyerlerde** (Jade dahil) **kariyer şartı** aranır ve **aktiflik şartı** aranır.

---

## 2. Kaynak Kuralı — "Kendi Neslinden" vs Spillover

İki ayrı şart vardır; kaynak kuralı bunlara göre değişir:

**A) Kişi şartı (= kariyer şartı) — "kendi neslinden":**
- Safir ve üstünde, bacakta sayılan **alt kariyer üyesi** senin/ekibinin bizzat getirdiği kişi olmalıdır
  (sponsorluk soyu / davet zinciri). Spillover kişi **sayılmaz**.

**B) PV / ciro şartı — "herkesten (spillover dahil)":**
- Jade, Pearl ve Elmas'ın **PV eşiğinde** bacaktaki **toplam PV** sayılır; kaynak fark etmez
  (bütün kariyerlerden / herkesten). Üst sponsor bacağınıza 15.000 PV indirirse, kayıt sizden
  olmasa bile Pearl PV şartı dolar.

- **Kendi neslinden** = sizin/ekibinizin bizzat getirdiği üyeler.
- **Spillover (taşma)** = üst sponsorunuzun, kolu dolduğu için sizin bacağınıza yerleştirdiği kişi;
  binary ağacınızda görünür ama **neslinizden sayılmaz**.

---

## 3. Liderlik (Matching) Primi — Detaylı Kural

Bir üye binary geliri elde ettiğinde, **şirket** bu üyenin **üst hattındaki 5 lidere**
(5 sponsor nesli) toplam **%55'e kadar** liderlik primi öder.

**Dilimler (sırayla, 5 sponsor nesli):**
1. nesil → **%20**
2. nesil → **%10**
3. nesil → **%10**
4. nesil → **%10**
5. nesil → **%5**

**Kural:** Her nesil yalnızca **kariyer sahibi** (Jade ve üstü) ise dilimini alır.
Kariyeri olmayan nesil **pay almaz ve payı DEVREDİLMEZ** — o pay **şirkete kalır**
(compression/roll-up YOK).

> Not: %55 üyenin binary gelirinden KESİLMEZ; üye gelirinin %100'ünü alır, %55'i şirket
> ayrıca öder. Kariyersiz neslin payı şirkete kalarak şirketin maliyetini düşürür.

### Örnek 1 — Herkes kariyerli
Derya 100 TL binary geliri elde etti:

| Nesil | Üye | Kariyer | Tutar |
|---|---|---|---|
| 1 | Ayşe | Jade | 20 TL (%20) |
| 2 | Burak | Safir | 10 TL (%10) |
| 3 | Ceren | Yakut | 10 TL (%10) |
| 4 | Deniz | Jade | 10 TL (%10) |
| 5 | Emre | Zümrüt | 5 TL (%5) |

Toplam ödenen: **55 TL**. (Şirket maliyeti: 100 + 55 = 155 TL.)

### Örnek 2 — Arada kariyersiz var (pay şirkete kalır)
Derya 100 TL kazandı:

| Nesil | Üye | Kariyer | Sonuç |
|---|---|---|---|
| 1 | Ayşe | Jade | 20 TL (%20) |
| 2 | Fatma | YOK | alamaz → %10 şirkete kalır |
| 3 | Burak | Safir | 10 TL (%10) |
| 4 | Ceren | YOK | alamaz → %10 şirkete kalır |
| 5 | Deniz | Yakut | 5 TL (%5) |

Toplam ödenen: **35 TL**. Şirkete kalan: **20 TL** (2. ve 4. neslin payı).
(Şirket maliyeti: 100 + 35 = 135 TL.)

### Örnek 3 — Yeterli kariyerli yoksa
Derya 100 TL kazandı; üstünde sadece 2 kariyerli var:

| Nesil | Üye | Kariyer | Sonuç |
|---|---|---|---|
| 1 | Ayşe | Jade | 20 TL (%20) |
| 2 | Fatma | YOK | %10 şirkete kalır |
| 3 | Burak | Safir | 10 TL (%10) |
| 4 | Ceren | YOK | %10 şirkete kalır |
| 5 | Deniz | YOK | %5 şirkete kalır |

Toplam ödenen: **30 TL**. Şirkete kalan: **25 TL**.

---

## 4. Kişisel Aktiflik ve Aylık Değerlendirme

- **Kişisel aktiflik = 250 PV/ay** (para ile değil, **PV puanı** ile; kendi alımlarından gelen hacim).
- **Bütün kariyerler** (Jade'den Ambassador'a kadar) **her ay**:
  1. 250 PV kişisel aktiflik yapmalı,
  2. o kariyerin şartını (PV / alt kariyer / hacim) **yeniden** sağlamalı.
- Şartlar o ay sağlanmazsa unvan (ve o unvana bağlı liderlik primi) o ay düşer.

---

## 5. Derinlik Kuralı (Şart Kontrolü)

- **Jade, Pearl:** PV bazlı, derinlik yok (bacak PV toplamına bakar).
- **Safir ve üstü:** şartı sağlayan alt kariyer üyesi, kendi soyunuzda **ne kadar derinde**
  olursa olsun sayılır (**sonsuz derinlik**, kendi soyu).

---

## 6. Teknik Not (kodlanacak şekli)

- Mevcut **`ranks` tablosu genişletilecek**; her satıra:
  - `required_downline_rank_id` (hangi alt kariyer aranacak; PV bazlı Jade/Pearl'de NULL),
  - `required_downline_count` (bacak başına kaç adet; PV bazlı satırlarda 0),
  - `required_left_pv` / `required_right_pv` (Jade 5.000, Pearl 15.000, Elmas 500.000),
  - `requires_personal_activity` (tümü true),
  - `personal_activity_pv` (250),
  - `downline_own_lineage` (Safir+ true; Jade/Pearl false).
- Kariyer hesaplama: binary bacaklarda alt kariyer sayılır; Safir+ için kendi sponsorluk soyu
  sınırsız derinlikte taranır, spillover sayılmaz; PV eşiklerinde toplam bacak PV (spillover dahil) kullanılır.
- Matching: `DistributeMatchingBonus` 5 sponsor nesil, %20/10/10/10/5; yalnızca kariyerli
  (Jade+) nesil pay alır, kariyersiz neslin payı **şirkete kalır** (devir/compression YOK).
- Aylık kapanış: tüm kariyerler için 250 PV aktiflik + kariyer şartı yeniden doğrulanır.
