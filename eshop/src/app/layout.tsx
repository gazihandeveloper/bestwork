// ============================================
// BestWork - Root Layout
// ============================================
import type { Metadata } from 'next'
import { Poppins, Montserrat, Quicksand } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import '@xyflow/react/dist/style.css'
import { Providers } from './providers'

/* Ana yazı tipi — kurumsal tipografi: Poppins (ana), Montserrat (yedek).
   Gövde 400/500, başlıklar 600/700. */
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
})

/* Logo fontu — marka kimliği (Quicksand) korunur; site geneli poppins olur. */
const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://mahmutgazihanarslan.com.tr'),
  title: { default: 'BestWork - Online Market Alışverişi', template: '%s | BestWork' },
  description:
    'En taze meyve, sebze, süt ürünleri ve daha fazlası. BestWork ile kapınıza kadar gelsin!',
  keywords: ['BestWork', 'online market', 'alışveriş', 'taze ürün', 'organik'],
  openGraph: {
    title: 'BestWork - Online Market Alışverişi',
    description: 'Taze ve temiz ürünler kapınıza kadar. BestWork ile alışverişin keyfini çıkarın.',
    url: 'https://mahmutgazihanarslan.com.tr',
    siteName: 'BestWork',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'BestWork - Online Market Alışverişi', description: 'Taze ve temiz ürünler kapınıza kadar.' },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
}

// Eski tarayıcı tespiti (ES5, sözdizimi desteklenmeyen cihazlarda bile çalışır).
// React 19 / Next.js 16 çıktısı `?.` / `??` gibi modern sözdizimi kullanır;
// bu sözdizimini desteklemeyen tarayıcılarda uygulama HİÇ çalışmaz. Bu yüzden
// böyle cihazlara basit ama okunabilir bir statik sayfa gösterilir.
const LEGACY_SCRIPT = `(function(){try{var w=window,d=document;var modern=false;try{new Function('return 1 ?? 2')();modern=true;}catch(e){}var ok=modern&&!!(w.Promise&&w.fetch&&w.Symbol&&w.Map&&w.Set&&w.requestAnimationFrame&&Object.assign&&Array.prototype.includes&&w.CSS&&w.CSS.supports);if(ok)return;var h=d.documentElement;h.className=(h.className||'')+' bw-legacy';var css='.bw-legacy body>*{display:none!important}.bw-legacy body>#bw-legacy-page{display:block!important}.bw-legacy body{margin:0;background:#0f172a}';var s=d.createElement('style');s.type='text/css';if(s.styleSheet){s.styleSheet.cssText=css;}else{s.appendChild(d.createTextNode(css));}var head=d.head||d.getElementsByTagName('head')[0];if(head)head.appendChild(s);}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className={`${poppins.variable} ${montserrat.variable} ${quicksand.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-sans">
        <script dangerouslySetInnerHTML={{ __html: LEGACY_SCRIPT }} />
        <div
          id="bw-legacy-page"
          style={{
            display: "none",
            padding: "48px 16px",
            background: "#0f172a",
            color: "#ffffff",
            fontFamily: "Arial, Helvetica, sans-serif",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            <div style={{ fontSize: "30px", fontWeight: "bold", letterSpacing: "3px" }}>BESTWORK</div>
            <div style={{ marginTop: "20px", fontSize: "16px", lineHeight: 1.6 }}>
              Tarayıcınız bu siteyi görüntülemek için çok eski.
            </div>
            <div style={{ marginTop: "12px", fontSize: "14px", lineHeight: 1.6, color: "#cbd5e1" }}>
              Lütfen güncel bir tarayıcı (Chrome, Safari, Firefox) veya daha yeni bir cihaz kullanın.
            </div>
            <div style={{ marginTop: "24px", fontSize: "14px", lineHeight: 1.6 }}>
              Destek: <b>best@bestwork.com</b>
            </div>
          </div>
        </div>

        <Providers>
          <Toaster
            position="top-left"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '12px',
                background: '#333',
                color: '#fff',
                fontSize: '14px',
              },
            }}
          />
          {children}
        </Providers>
      </body>
    </html>
  )
}
