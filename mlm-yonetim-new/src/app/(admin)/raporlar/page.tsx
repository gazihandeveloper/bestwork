import { redirect } from "next/navigation";

// "Genel Raporlar" sayfası, detaylı istatistik sayfalarıyla değiştirildi.
// Eski bağlantılar Üye İstatistikleri sayfasına yönlendirilir.
export default function RaporlarPage() {
  redirect("/raporlar/uye-istatistikleri");
}
