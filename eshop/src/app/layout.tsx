// ============================================
// BestWork - Root Layout
// ============================================
import type { Metadata } from 'next'
import { Open_Sans, Quicksand } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import '@xyflow/react/dist/style.css'
import { Providers } from './providers'

/* Site geneli yazı tipi — flptr.com ile aynı: Open Sans (400/600/700)
   Logo "extrabold" (800) kullandığı için 800 de yüklenir. */
const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-opensans',
})

/* Logo fontu — marka kimliği olarak Quicksand'ın yuvarlak hatları korunur;
   site geneli metinler Open Sans kullanır. */
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className={`${openSans.variable} ${quicksand.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-sans">
      
        <Providers>
          <Toaster
            position="top-right"
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
