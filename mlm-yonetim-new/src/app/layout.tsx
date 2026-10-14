import { Outfit, Quicksand } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import "@xyflow/react/dist/style.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

const outfit = Outfit({
  subsets: ["latin"],
});

/* Marka logosu ("BESTWORK®") sitedeki logoyla aynı fontu kullanır.
   Site geneli metinler Open Sans; logo marka kimliği olarak Quicksand. */
const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-quicksand",
});

// Eski tarayıcı tespiti (ES5) — modern sözdizimini desteklemeyen cihazlara
// basit statik sayfa gösterilir (React 19 bu tarayıcılarda çalışmaz).
const LEGACY_SCRIPT = `(function(){try{var w=window,d=document;var modern=false;try{new Function('return 1 ?? 2')();modern=true;}catch(e){}var ok=modern&&!!(w.Promise&&w.fetch&&w.Symbol&&w.Map&&w.Set&&w.requestAnimationFrame&&Object.assign&&Array.prototype.includes&&w.CSS&&w.CSS.supports);if(ok)return;var h=d.documentElement;h.className=(h.className||'')+' bw-legacy';var css='.bw-legacy body>*{display:none!important}.bw-legacy body>#bw-legacy-page{display:block!important}.bw-legacy body{margin:0;background:#0f172a}';var s=d.createElement('style');s.type='text/css';if(s.styleSheet){s.styleSheet.cssText=css;}else{s.appendChild(d.createTextNode(css));}var head=d.head||d.getElementsByTagName('head')[0];if(head)head.appendChild(s);}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} ${quicksand.variable} dark:bg-[#1E293B]`}>
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
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
