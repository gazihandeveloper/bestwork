import { NextResponse, type NextRequest } from "next/server";

/**
 * Yerel geliştirme kolaylığı.
 *
 * Site 3000, yönetim paneli 3007 portunda çalışır. Tarayıcıda
 * `localhost:3000/bestmanager` yazıldığında 404 alınmaması için istek
 * panelin portuna yönlendirilir.
 *
 * ⚠️ YALNIZCA development'ta etkindir. Üretimde `/bestmanager` yolu ana alan
 * adı üzerinden panel sunucusuna yönlendirildiği için burada işlem yapılmaz.
 */
export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname !== "/bestmanager" && !pathname.startsWith("/bestmanager/")) {
    return NextResponse.next();
  }

  /* Hedef host'u isteğin kendi host'undan alır: localhost'ta localhost:3007,
     LAN IP'sinde (ör. 192.168.1.105) o adresin 3007 portu kullanılır —
     böylece telefondan da çalışır. Next'in url.clone()'u dev'de host'u
     localhost'a normalize ettiği için header'dan okuyoruz. */
  const host = (req.headers.get("host") || "localhost:3000").split(":")[0];
  return NextResponse.redirect(new URL(`http://${host}:3007${pathname}${search}`));
}

export const config = {
  matcher: ["/bestmanager", "/bestmanager/:path*"],
};
