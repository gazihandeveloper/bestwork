// ============================================
// BestWork - Root Layout
// ============================================
import type { Metadata } from 'next'
import { Quicksand } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { Providers } from './providers'

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
})

export const metadata: Metadata = {
  title: 'BestWork - Online Market Alışverişi',
  description:
    'En taze meyve, sebze, süt ürünleri ve daha fazlası. BestWork ile kapınıza kadar gelsin!',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className={`${quicksand.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-sans">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />

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
