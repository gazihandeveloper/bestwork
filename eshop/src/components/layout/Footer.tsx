// ============================================
// BestWork - Footer Bileşeni
// ============================================

import Link from 'next/link'
import Image from 'next/image'
import { BenefitStrip } from './BenefitStrip'

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100">
      {/* Newsletter */}
      <section className="bg-gradient-to-r from-brand-50 to-green-50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
                Haftalık fırsatları kaçırma!
              </h2>
              <p className="text-gray-500 mt-2">
                En yeni ürünler ve kampanyalar için{' '}
                <span className="text-brand-500 font-semibold">BestWork</span> bültenine abone ol.
              </p>
            </div>
            <div className="flex w-full max-w-md">
              <input
                type="email"
                placeholder="E-posta adresiniz"
                className="flex-1 h-12 px-5 rounded-l-full border border-gray-200 focus:outline-none focus:border-brand-500 text-sm"
              />
              <button className="h-12 px-6 bg-brand-500 text-white font-bold rounded-r-full hover:bg-brand-600 transition-colors text-sm">
                Abone Ol
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Barları */}
      <section className="py-10 border-b border-gray-100">
        <div className="container mx-auto px-4">
          <BenefitStrip />
        </div>
      </section>

      {/* Ana Footer */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {/* About */}
            <div className="col-span-2 lg:col-span-1">
                <span className="text-2xl font-extrabold tracking-tight" style={{ color: '#29A56C' }}>
                  BEST<span className="ml-0.5">WORK</span><span className="text-[0.6em] text-[#1f8a4c] font-bold ml-0.5 align-super relative top-[-0.5em]" style={{ fontFamily: "Georgia, serif" }}>®</span>
                </span>
              <p className="text-sm text-gray-500 mb-4">
                Harika bir market alışveriş deneyimi için BestWork.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start gap-2">
                  <Image
                    src="/images/theme/icons/icon-location.svg"
                    alt="Adres"
                    width={16}
                    height={16}
                    className="w-4 h-4 mt-0.5"
                  />
                  <span>İstanbul, Türkiye</span>
                </li>
                <li className="flex items-start gap-2">
                  <Image
                    src="/images/theme/icons/icon-contact.svg"
                    alt="Telefon"
                    width={16}
                    height={16}
                    className="w-4 h-4 mt-0.5"
                  />
                  <span>+90 850 555 0 888</span>
                </li>
                <li className="flex items-start gap-2">
                  <Image
                    src="/images/theme/icons/icon-email-2.svg"
                    alt="Email"
                    width={16}
                    height={16}
                    className="w-4 h-4 mt-0.5"
                  />
                  <span>info@mahmutgazihanarslan.com.tr</span>
                </li>
                <li className="flex items-start gap-2">
                  <Image
                    src="/images/theme/icons/icon-clock.svg"
                    alt="Saat"
                    width={16}
                    height={16}
                    className="w-4 h-4 mt-0.5"
                  />
                  <span>10:00 - 18:00, Hafta içi</span>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-4">Şirket</h4>
              <ul className="space-y-2">
                {['Hakkımızda', 'Teslimat Bilgileri', 'Gizlilik Politikası', 'Kullanım Şartları', 'İletişim', 'Destek'].map(
                  (item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="text-sm text-gray-500 hover:text-brand-500 transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-4">Hesap</h4>
              <ul className="space-y-2">
                {['Giriş Yap', 'Sepetim', 'Sipariş Takibi', 'Yardım'].map(
                  (item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="text-sm text-gray-500 hover:text-brand-500 transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Corporate */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-4">Kurumsal</h4>
              <ul className="space-y-2">
                {['Satıcı Ol', 'İş Fırsatları', 'Tedarikçiler'].map(
                  (item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="text-sm text-gray-500 hover:text-brand-500 transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Popular */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-4">Popüler</h4>
              <ul className="space-y-2">
                {['Süt & Süt Ürünleri', 'İçecekler', 'Atıştırmalık', 'Kahvaltılık', 'Dondurma'].map(
                  (item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="text-sm text-gray-500 hover:text-brand-500 transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Install App */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-4">Uygulamayı İndir</h4>
              <p className="text-xs text-gray-500 mb-3">App Store veya Google Play&apos;den</p>
              <div className="flex flex-col gap-2">
                <Image
                  src="/images/theme/app-store.jpg"
                  alt="App Store"
                  width={120}
                  height={36}
                  className="h-9 w-auto"
                />
                <Image
                  src="/images/theme/google-play.jpg"
                  alt="Google Play"
                  width={120}
                  height={36}
                  className="h-9 w-auto"
                />
              </div>
              <p className="text-xs text-gray-500 mt-4 mb-2">Güvenli Ödeme</p>
              <Image
                src="/images/theme/payment-method.png"
                alt="Ödeme Yöntemleri"
                width={200}
                height={24}
                className="h-6 w-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Alt Footer */}
      <div className="border-t border-gray-100 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} <strong className="text-brand-500">BestWork</strong> - Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Bizi Takip Edin:</span>
              <Link href="#" className="hover:opacity-80">
                <Image
                  src="/images/theme/icons/icon-facebook-white.svg"
                  alt="Facebook"
                  width={16}
                  height={16}
                  className="w-4 h-4 opacity-50 hover:opacity-100"
                />
              </Link>
              <Link href="#" className="hover:opacity-80">
                <Image
                  src="/images/theme/icons/icon-twitter-white.svg"
                  alt="Twitter"
                  width={16}
                  height={16}
                  className="w-4 h-4 opacity-50 hover:opacity-100"
                />
              </Link>
              <Link href="#" className="hover:opacity-80">
                <Image
                  src="/images/theme/icons/icon-instagram-white.svg"
                  alt="Instagram"
                  width={16}
                  height={16}
                  className="w-4 h-4 opacity-50 hover:opacity-100"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
