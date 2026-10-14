// Yönetim paneli menü ağacı — hem sidebar hem "Çalışan Rolleri" izin
// seçimi bu tek kaynağı kullanır. İzin anahtarı (menu_key) = sayfa yolu.

export type NavLeaf = { name: string; path: string };
export type NavEntry = { name: string; path?: string; subItems?: NavLeaf[] };

export const NAV_ITEMS: NavEntry[] = [
  { name: "Anasayfa", path: "/" },
  {
    name: "E-Ticaret İşlemleri",
    subItems: [
      { name: "Kategoriler", path: "/kategoriler" },
      { name: "Slider Yönetimi", path: "/slider" },
      { name: "Ürünler", path: "/urunler" },
      { name: "Siparişler", path: "/siparisler" },
      { name: "Kargo Limiti", path: "/kargo" },
      { name: "Güvenlik Şeridi", path: "/guvenlik-seridi" },
      { name: "Vergiler", path: "/vergiler" },
      { name: "Yorumlar", path: "/yorumlar" },
    ],
  },
  {
    name: "Müşteri Hizmetleri",
    subItems: [
      { name: "Destek Talepleri", path: "/destek" },
      { name: "Üyeler", path: "/uyeler" },
      { name: "Bekleyen Havuz", path: "/bekleyen-havuz" },
      { name: "Kariyerler", path: "/kariyerler" },
    ],
  },
  {
    name: "Muhasebe",
    subItems: [
      { name: "Çekim Talepleri", path: "/cekimler" },
      { name: "Ay Sonu İşlemleri", path: "/ay-sonu-islemleri" },
      { name: "Prim", path: "/prim" },
      { name: "Kariyer Bonusu", path: "/kariyer-bonusu" },
      { name: "Flash-Out", path: "/flashout" },
    ],
  },
  {
    name: "Raporlar",
    subItems: [
      { name: "Üye İstatistikleri", path: "/raporlar/uye-istatistikleri" },
      { name: "Ciro İstatistikleri", path: "/raporlar/ciro-istatistikleri" },
      { name: "Şirket Kârlılığı", path: "/raporlar/karlilik" },
      { name: "Üye Prim İstatistiği", path: "/raporlar/prim-istatistikleri" },
      { name: "Puan İstatistikleri", path: "/raporlar/puan-istatistikleri" },
      { name: "Performans Sıralamaları", path: "/raporlar/aylik-kariyer" },
      { name: "Karşılaştırma", path: "/karsilastirma" },
    ],
  },
  { name: "Ağaç Yönetimi", path: "/agac" },
  { name: "Kampanya ve Promosyonlar", path: "/promosyonlar" },
  {
    name: "Ayarlar",
    subItems: [
      { name: "Kullanıcılar", path: "/ayarlar/kullanicilar" },
      { name: "Kazanç Planı", path: "/kazanc-plani" },
      { name: "Duyurular", path: "/duyurular" },
      { name: "Denetim Kayıtları", path: "/denetim-kayitlari" },
      { name: "Güvenlik", path: "/guvenlik" },
    ],
  },
  {
    name: "Depo",
    subItems: [
      { name: "Stok", path: "/stok" },
      { name: "Görseller", path: "/gorseller" },
    ],
  },
];

// Tüm yaprak sayfa yolları.
export const NAV_PATHS: string[] = NAV_ITEMS.flatMap((n) =>
  n.subItems ? n.subItems.map((s) => s.path) : n.path ? [n.path] : []
);

// Çalışanlara atanabilecek menüler: "Anasayfa" (dashboard) yalnızca
// yöneticilere (admin/super_admin) açıktır, çalışanlara atanamaz.
export const STAFF_NAV_ITEMS: NavEntry[] = NAV_ITEMS.filter((n) => n.path !== "/");
export const STAFF_NAV_PATHS: string[] = NAV_PATHS.filter((p) => p !== "/");
